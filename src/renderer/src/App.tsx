import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { FfmpegStatus, MediaProbe, UpdateState } from '@shared/types'
import { explain, type FriendlyError } from './errors'
import { Editor } from './Editor'
import { Packet } from './Packet'
import { Player } from './Player'
import { Scaler } from './Scaler'
import { Update } from './Update'
import { IconFolder } from './Icons'
import logo from './assets/logo.png'
import './styles/app.css'

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg', 'ts', 'm2ts', '3gp', 'ogv'
])

type Module = 'scaler' | 'player' | 'editor'

/*
 * Reproducir primero, y no por orden alfabético.
 *
 * Un archivo recién soltado todavía no es una decisión: antes de elegir cuánto
 * peso quitarle hay que ver qué es y cómo se ve. Abrir en las palancas obligaba
 * a fijar un objetivo a ciegas y sólo después ir a mirar. Abriendo en la mesa,
 * el recorrido es el que ya se hacía a mano — mirar, montar, comprimir — y las
 * pestañas van en ese mismo orden.
 */
const MODULES: ReadonlyArray<{ id: Module; label: string }> = [
  { id: 'player', label: 'Reproducir' },
  { id: 'editor', label: 'Editar' },
  { id: 'scaler', label: 'Reducir' }
]

/**
 * El cascarón: la cabecera, el archivo, y cuál de los dos módulos lo tiene.
 *
 * Un archivo, dos módulos. No son dos aplicaciones dentro de una ventana: se
 * suelta el video una vez y se decide qué hacer con él — bajarle el peso, o
 * mirarlo de cerca para saber cuánto peso se le puede bajar. Por eso el archivo
 * vive aquí arriba y no dentro de ninguno de los dos.
 *
 * Los dos módulos quedan montados y sólo se oculta el que no está en uso: al
 * volver de mirar el video, las palancas siguen donde se dejaron, y al volver
 * de las palancas, el video sigue en el fotograma que se estaba mirando.
 */
export default function App(): JSX.Element {
  const [env, setEnv] = useState<FfmpegStatus | null>(null)
  const [version, setVersion] = useState('')
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
  const [probe, setProbe] = useState<MediaProbe | null>(null)
  const [probing, setProbing] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [module, setModule] = useState<Module>('player')
  const [dragging, setDragging] = useState(false)
  /**
   * Un archivo soltado con el montaje delante no cambia el archivo de la
   * ventana: se le pasa al editor para que lo añada. Aquí sólo se apunta la
   * ruta; el módulo la recoge y avisa cuando ya la ha usado.
   */
  const [handoff, setHandoff] = useState<string | null>(null)
  const dragDepth = useRef(0)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void window.videoscaler.ffmpegStatus().then(setEnv)
    void window.videoscaler.appVersion().then(setVersion)
    const offUpdate = window.videoscaler.onUpdateState(setUpdate)
    return offUpdate
  }, [])

  /** Devuelve el archivo cargado, o null si no se pudo: quien lo llama a veces
      tiene algo que hacer después, y sólo si salió bien. */
  const loadFile = useCallback(async (path: string): Promise<MediaProbe | null> => {
    setError(null)

    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    if (!VIDEO_EXTENSIONS.has(ext)) {
      setError({
        message: `«.${ext}» no es un formato de video que VideoScaler pueda abrir. Elige un archivo .mp4, .mkv, .mov o .avi.`,
        detail: `Extensión rechazada antes de sondear: ${path}`
      })
      return null
    }

    setProbing(true)
    try {
      const next = await window.videoscaler.probe(path)
      if (!next.video) {
        setProbe(null)
        setError({
          message: `${next.filename} no tiene pista de video, así que no hay nada que comprimir aquí. Elige un archivo de video.`,
          detail: `ffprobe no encontró ningún stream con codec_type=video en ${path}`
        })
        return null
      }
      setProbe(next)
      // Cada archivo nuevo empieza en la mesa, venga de donde venga: del botón,
      // de un arrastre, o del resultado recién comprimido. Quedarse en las
      // palancas del archivo anterior sería seguir ajustando lo que ya no está.
      setModule('player')
      return next
    } catch (err) {
      setProbe(null)
      setError(explain(err instanceof Error ? err.message : String(err), path.split(/[\\/]/).pop()))
      return null
    } finally {
      setProbing(false)
    }
  }, [])

  const onPick = useCallback(async () => {
    const [first] = await window.videoscaler.pickFiles()
    if (first) await loadFile(first)
  }, [loadFile])

  /**
   * Ver el resultado: el archivo que acaba de salir pasa a ser *el* archivo.
   *
   * No se abre «aparte» a propósito. La ventana sostiene un archivo y dos
   * módulos, y sostener dos a la vez — uno para mirar y otro para las palancas —
   * dejaría al usuario sin saber cuál de los dos está a punto de comprimir. El
   * precio es que la ficha del resultado desaparece al mirarlo; a cambio, la
   * ficha de identidad de arriba pasa a decir el peso nuevo, que es la misma
   * comparación con menos memoria de por medio.
   */
  const onWatch = useCallback(
    async (path: string) => {
      await loadFile(path)
    },
    [loadFile]
  )

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const path = window.videoscaler.pathForFile(file)
      // El mismo gesto quiere decir dos cosas según dónde se esté: en la mesa y
      // en las palancas, «trabaja con este otro archivo»; en el montaje, «suma
      // este archivo al que ya estoy armando». Nadie arrastra un segundo video
      // a un editor para tirar el primero.
      if (probe && module === 'editor') setHandoff(path)
      else await loadFile(path)
    },
    [loadFile, module, probe]
  )

  // Flechas entre pestañas, con el foco siguiendo a la selección: es lo que
  // hace un juego de pestañas nativo, y lo mismo que ya hace `Segmented`.
  const moveTab = useCallback(
    (delta: number): void => {
      const i = MODULES.findIndex((m) => m.id === module)
      const next = MODULES[(i + delta + MODULES.length) % MODULES.length]
      if (!next) return
      setModule(next.id)
      requestAnimationFrame(() => {
        const buttons = tabsRef.current?.querySelectorAll('button')
        buttons?.[(i + delta + MODULES.length) % MODULES.length]?.focus()
      })
    },
    [module]
  )

  return (
    <div
      className={`app${dragging ? ' is-dragging' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragLeave={() => {
        dragDepth.current -= 1
        if (dragDepth.current <= 0) setDragging(false)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <header className="bar">
        <span className="wordmark">
          <img className="wordmark-mark" src={logo} alt="" width={22} height={22} />
          VideoScaler
        </span>

        {probe && (
          <div className="tabs" role="tablist" aria-label="Módulo" ref={tabsRef}>
            {MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                id={`tab-${m.id}`}
                aria-selected={module === m.id}
                aria-controls={`panel-${m.id}`}
                tabIndex={module === m.id ? 0 : -1}
                className="tab"
                onClick={() => setModule(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    moveTab(1)
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    moveTab(-1)
                  }
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <Update update={update} />
        <span className="bar-spacer" />
        {probe && (
          <button type="button" className="act act-quiet" onClick={() => void onPick()}>
            <IconFolder aria-hidden="true" />
            Otro archivo
          </button>
        )}
        <span className="bar-note">{version ? `v${version}` : ''}</span>
      </header>

      {!probe ? (
        <>
          <div className="scroll">
            <Packet
              onPick={() => void onPick()}
              dragging={dragging}
              probing={probing}
              error={error}
            />
          </div>
          <footer className="mass">
            <span className="bar-note">
              Ningún archivo cargado. Suelta un video en la ventana para empezar.
            </span>
          </footer>
        </>
      ) : (
        <>
          {/*
            `display: contents` en los envoltorios: cada módulo aporta dos filas
            a la retícula de la ventana — su cuerpo y su barra de abajo — y un
            envoltorio normal las metería a las dos dentro de una sola fila,
            rompiendo la promesa de que sólo el centro se desplaza.
          */}
          <div
            className={`module${module === 'scaler' ? '' : ' is-away'}`}
            role="tabpanel"
            id="panel-scaler"
            aria-labelledby="tab-scaler"
          >
            <Scaler
              probe={probe}
              env={env}
              version={version}
              update={update}
              error={error}
              onError={setError}
              onWatch={(path) => void onWatch(path)}
            />
          </div>
          <div
            className={`module${module === 'player' ? '' : ' is-away'}`}
            role="tabpanel"
            id="panel-player"
            aria-labelledby="tab-player"
          >
            <Player
              probe={probe}
              active={module === 'player'}
              error={error}
              onError={setError}
            />
          </div>
          <div
            className={`module${module === 'editor' ? '' : ' is-away'}`}
            role="tabpanel"
            id="panel-editor"
            aria-labelledby="tab-editor"
          >
            <Editor
              probe={probe}
              active={module === 'editor'}
              env={env}
              error={error}
              onError={setError}
              onWatch={(path) => void onWatch(path)}
              pendingImport={handoff}
              onImported={() => setHandoff(null)}
            />
          </div>
        </>
      )}
    </div>
  )
}
