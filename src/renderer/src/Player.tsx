import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import type { MediaProbe } from '@shared/types'
import { formatTimecode } from './defaults'
import { explain, type FriendlyError } from './errors'
import { Segmented } from './Crease'
import { ErrorNotice, Notice } from './Notice'
import {
  IconCamera,
  IconCheck,
  IconMinus,
  IconMute,
  IconPause,
  IconPlay,
  IconPlus,
  IconSound,
  IconStepBack,
  IconStepNext
} from './Icons'

/*
 * Reproducir: la mesa.
 *
 * El compresor promete «la menor pérdida posible», y esa promesa no se puede
 * juzgar en una barra de progreso — hay que mirar la imagen, detenerla, y
 * acercarse hasta donde el bloque se ve. Por eso este módulo no es un extra de
 * comodidad: es el único sitio donde el usuario puede comprobar lo que el otro
 * módulo afirma.
 *
 * De ahí las tres herramientas que no trae un reproductor cualquiera: la
 * velocidad (el movimiento delata lo que la pausa esconde), el zoom con tamaño
 * real (un píxel del video en un píxel de pantalla, sin reescalado que disimule
 * el defecto) y el paso cuadro a cuadro con J y K (el fotograma después de un
 * corte es siempre el peor del video).
 */

const SPEEDS = [
  { value: '0.25', label: '0,25×' },
  { value: '0.5', label: '0,5×' },
  { value: '1', label: '1×' },
  { value: '1.5', label: '1,5×' },
  { value: '2', label: '2×' },
  { value: '4', label: '4×' }
]

const MIN_ZOOM = 0.1
const MAX_ZOOM = 16
/** Aire alrededor de la imagen cuando está ajustada: la mesa no es un marco. */
const STAGE_PAD = 24

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

interface Point {
  x: number
  y: number
}

export function Player({
  probe,
  active,
  error,
  onError
}: {
  probe: MediaProbe
  active: boolean
  error: FriendlyError | null
  onError: (e: FriendlyError | null) => void
}): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: number; from: Point; pan: Point } | null>(null)
  /** Arrastrar la imagen no es pulsarla: sin esto, cada paneo pausaría el video. */
  const draggedRef = useRef(false)
  /** Al cambiar de fuente (original → vista previa) el sitio no se pierde. */
  const resumeAt = useRef(0)

  const [src, setSrc] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [unplayable, setUnplayable] = useState(false)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(probe.durationSec)
  const [rate, setRate] = useState(1)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [media, setMedia] = useState<Point>({ x: 0, y: 0 })
  const [stage, setStage] = useState<Point>({ x: 0, y: 0 })

  const [saved, setSaved] = useState<string | null>(null)

  // Los cuadros por segundo salen del sondeo y no del elemento de video, porque
  // el elemento no los expone. Sin ellos no hay paso cuadro a cuadro.
  const fps = probe.video?.fps && probe.video.fps > 0 ? probe.video.fps : 30
  const totalFrames = Math.max(1, Math.round(duration * fps))
  const frame = Math.min(totalFrames - 1, Math.max(0, Math.floor(time * fps + 1e-6)))

  // --- La fuente ----------------------------------------------------------

  useEffect(() => {
    let alive = true
    setSrc(null)
    setPreview(false)
    setUnplayable(false)
    setSaved(null)
    setPlaying(false)
    setTime(0)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setDuration(probe.durationSec)
    setMedia({ x: probe.video?.width ?? 0, y: probe.video?.height ?? 0 })
    resumeAt.current = 0

    void window.videoscaler.mediaUrl(probe.path).then((url) => {
      if (alive) setSrc(url)
    })
    return () => {
      alive = false
    }
  }, [probe.path, probe.durationSec, probe.video?.width, probe.video?.height])

  const onPrepare = useCallback(async () => {
    setPreparing(true)
    resumeAt.current = videoRef.current?.currentTime ?? 0
    try {
      const url = await window.videoscaler.makePreview(probe.path)
      setSrc(url)
      setPreview(true)
      setUnplayable(false)
      onError(null)
    } catch (err) {
      onError(explain(err instanceof Error ? err.message : String(err), probe.filename))
    } finally {
      setPreparing(false)
    }
  }, [probe.path, probe.filename, onError])

  // Salir del módulo calla el video. Sigue montado para no perder el sitio ni
  // el zoom al volver, y un video que sigue sonando desde otra pantalla es de
  // las cosas más molestas que puede hacer una aplicación.
  useEffect(() => {
    if (!active) videoRef.current?.pause()
  }, [active])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = rate
  }, [rate, src])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
    v.muted = muted
  }, [volume, muted, src])

  // Mientras corre, el reloj se lee por cuadro dibujado y no por el evento
  // `timeupdate`, que llega cuatro veces por segundo: con él, el contador de
  // cuadros iría a saltos de siete.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = (): void => {
      const v = videoRef.current
      if (v) setTime(v.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // --- La mesa: ajuste, zoom y paneo --------------------------------------

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = (): void => setStage({ x: el.clientWidth, y: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /** Escala a la que la imagen entra entera en la mesa. Zoom 1 es esta. */
  const fit = useMemo(() => {
    if (!media.x || !media.y || !stage.x || !stage.y) return 1
    return Math.min(
      Math.max(1, stage.x - STAGE_PAD * 2) / media.x,
      Math.max(1, stage.y - STAGE_PAD * 2) / media.y
    )
  }, [media, stage])

  const shown = { x: media.x * fit, y: media.y * fit }
  const overflowX = Math.max(0, (shown.x * zoom - stage.x) / 2)
  const overflowY = Math.max(0, (shown.y * zoom - stage.y) / 2)
  const canPan = overflowX > 0 || overflowY > 0

  const clampPan = useCallback(
    (next: Point, z: number): Point => ({
      x: clamp(next.x, -Math.max(0, (shown.x * z - stage.x) / 2), Math.max(0, (shown.x * z - stage.x) / 2)),
      y: clamp(next.y, -Math.max(0, (shown.y * z - stage.y) / 2), Math.max(0, (shown.y * z - stage.y) / 2))
    }),
    [shown.x, shown.y, stage.x, stage.y]
  )

  /**
   * `anchor` es el punto de la mesa, medido desde su centro, que debe quedarse
   * quieto. Sin él, acercarse con la rueda arrastra fuera de la vista justo el
   * detalle que se estaba mirando.
   */
  const zoomTo = useCallback(
    (next: number, anchor?: Point): void => {
      const z = clamp(next, MIN_ZOOM, MAX_ZOOM)
      setZoom(z)
      setPan((p) => {
        if (!anchor) return clampPan(p, z)
        const held = { x: (anchor.x - p.x) / zoom, y: (anchor.y - p.y) / zoom }
        return clampPan({ x: anchor.x - held.x * z, y: anchor.y - held.y * z }, z)
      })
    },
    [zoom, clampPan]
  )

  // Rueda sobre la mesa: acercar y alejar. Va como escucha nativa y no como
  // `onWheel` de React porque hay que cancelar el gesto — con Ctrl pulsado,
  // Chromium ampliaría la interfaz entera en vez de la imagen.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const anchor = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      }
      zoomTo(zoom * (e.deltaY < 0 ? 1.18 : 1 / 1.18), anchor)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoom, zoomTo])

  // --- Transporte ---------------------------------------------------------

  const togglePlay = useCallback((): void => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play().catch(() => undefined)
    else v.pause()
  }, [])

  /**
   * Un cuadro exacto, no «un poco más adelante».
   *
   * El cuadro se calcula por división y el salto cae en su mitad: pedirle al
   * video el instante en que empieza el cuadro lo deja en la frontera, y ahí un
   * error de redondeo de microsegundos muestra el anterior. Con la mitad, el
   * mismo cálculo repetido avanza de uno en uno y no deriva.
   */
  const stepFrame = useCallback(
    (delta: number): void => {
      const v = videoRef.current
      if (!v) return
      v.pause()
      const current = Math.floor(v.currentTime * fps + 1e-6)
      const next = clamp(current + delta, 0, totalFrames - 1)
      v.currentTime = Math.min((next + 0.5) / fps, Math.max(0, duration - 0.001))
    },
    [fps, totalFrames, duration]
  )

  const seekBy = useCallback((seconds: number): void => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = clamp(v.currentTime + seconds, 0, v.duration || 0)
  }, [])

  const onCapture = useCallback(async () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    try {
      // Siempre el fotograma entero y a resolución original: el zoom es para
      // mirar, no para recortar. Quien acerca al 400 % quiere ver ese detalle,
      // no llevarse una imagen de un cuarto de pantalla.
      const canvas = document.createElement('canvas')
      canvas.width = v.videoWidth
      canvas.height = v.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo abrir un lienzo para la captura.')
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) throw new Error('El lienzo no devolvió ninguna imagen.')

      const path = await window.videoscaler.saveCapture({
        sourcePath: probe.path,
        frame,
        data: new Uint8Array(await blob.arrayBuffer())
      })
      onError(null)
      setSaved(path)
    } catch (err) {
      onError(explain(err instanceof Error ? err.message : String(err), probe.filename))
    }
  }, [probe.path, probe.filename, frame, onError])

  // El aviso de guardado se va solo: es una confirmación, no un estado.
  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(null), 8000)
    return () => clearTimeout(t)
  }, [saved])

  // --- Teclado ------------------------------------------------------------

  useEffect(() => {
    if (!active) return

    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      // Un control enfocado se queda con sus propias teclas: la barra de tiempo
      // necesita las flechas y un botón necesita el espacio.
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return
      if ((typing || tag === 'BUTTON') && e.key === ' ') return

      switch (e.key.toLowerCase()) {
        case ' ':
          togglePlay()
          break
        case 'j':
          stepFrame(-1)
          break
        case 'k':
          stepFrame(1)
          break
        case 'arrowleft':
          seekBy(-5)
          break
        case 'arrowright':
          seekBy(5)
          break
        case 'home':
          seekBy(-Infinity)
          break
        case 'end':
          seekBy(Infinity)
          break
        case '+':
        case '=':
          zoomTo(zoom * 1.25)
          break
        case '-':
          zoomTo(zoom / 1.25)
          break
        case '0':
          setZoom(1)
          setPan({ x: 0, y: 0 })
          break
        case 'm':
          setMuted((m) => !m)
          break
        default:
          return
      }
      e.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, togglePlay, stepFrame, seekBy, zoomTo, zoom])

  // --- Vista --------------------------------------------------------------

  const zoomPercent = Math.round(fit * zoom * 100)
  const savedName = saved?.split(/[\\/]/).pop() ?? ''

  return (
    <>
      <div
        className={`stage${canPan ? ' can-pan' : ''}`}
        ref={stageRef}
        onPointerDown={(e) => {
          draggedRef.current = false
          if (!canPan) return
          e.currentTarget.setPointerCapture(e.pointerId)
          dragRef.current = { id: e.pointerId, from: { x: e.clientX, y: e.clientY }, pan }
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current
          if (!drag || drag.id !== e.pointerId) return
          const dx = e.clientX - drag.from.x
          const dy = e.clientY - drag.from.y
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) draggedRef.current = true
          setPan(clampPan({ x: drag.pan.x + dx, y: drag.pan.y + dy }, zoom))
        }}
        onPointerUp={(e) => {
          if (dragRef.current?.id === e.pointerId) dragRef.current = null
        }}
        onPointerCancel={() => {
          dragRef.current = null
        }}
      >
        {src && (
          <video
            ref={videoRef}
            src={src}
            // Sin esto el lienzo de captura queda «sucio» y el navegador prohíbe
            // exportarlo: el fotograma se vería y no se podría guardar.
            crossOrigin="anonymous"
            preload="auto"
            className={`stage-video${unplayable ? ' is-blank' : ''}`}
            style={{
              width: shown.x ? `${shown.x}px` : undefined,
              height: shown.y ? `${shown.y}px` : undefined,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget
              setDuration(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : probe.durationSec)
              setMedia({ x: v.videoWidth, y: v.videoHeight })
              v.playbackRate = rate
              if (resumeAt.current > 0) {
                v.currentTime = resumeAt.current
                resumeAt.current = 0
              }
            }}
            onClick={() => {
              if (draggedRef.current) return
              togglePlay()
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onSeeked={(e) => setTime(e.currentTarget.currentTime)}
            onError={() => setUnplayable(true)}
          />
        )}

        {error && (
          <div className="stage-alert">
            <ErrorNotice error={error} />
          </div>
        )}

        {(unplayable || preparing) && (
          <div className="stage-say">
            {preparing ? (
              <>
                <h2>Preparando la vista previa</h2>
                <p>
                  Se está copiando el video a un MP4 temporal, sin recomprimir nada. Tarda lo que
                  tarde el disco en copiar {probe.filename}.
                </p>
                <span className="stage-work" aria-hidden="true" />
              </>
            ) : preview ? (
              /* La copia tampoco abrió: entonces no era la caja sino el códec,
                 y cambiarlo ya no sería copiar el video sino recomprimirlo —
                 que es justamente lo que hace el otro módulo, con sus palancas
                 a la vista y no a escondidas detrás de un botón de vista previa. */
              <>
                <h2>Este video no se puede reproducir aquí</h2>
                <p>
                  Ni siquiera en un MP4: lo que la ventana no sabe decodificar es el códec{' '}
                  <strong>{probe.video?.codec}</strong>, no el contenedor. Puedes comprimirlo a
                  H.264 en el módulo Reducir y reproducir el resultado.
                </p>
              </>
            ) : (
              <>
                <h2>Este contenedor no se abre aquí</h2>
                <p>
                  El motor de video de la ventana entiende menos formatos que el compresor:{' '}
                  <strong>{probe.container}</strong> con <strong>{probe.video?.codec}</strong> es uno
                  de los que no abre. Se puede copiar a un MP4 temporal sin tocar la imagen — mismos
                  fotogramas, misma calidad — y reproducir esa copia.
                </p>
                <p className="stage-cost">
                  Ocupa en disco lo mismo que el original y se borra al cerrar la aplicación.
                </p>
                <button type="button" className="act act-quiet" onClick={() => void onPrepare()}>
                  Preparar vista previa
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <footer className="transport">
        {saved && (
          <Notice tone="quiet" icon={<IconCheck aria-hidden="true" />}>
            Fotograma guardado como <code>{savedName}</code>{' '}
            <button
              type="button"
              className="link"
              onClick={() => void window.videoscaler.revealInFolder(saved)}
            >
              Ver en la carpeta
            </button>
          </Notice>
        )}

        <div className="transport-line">
          {/*
            Qué se está viendo, antes que los mandos para verlo.
            Hace falta desde que «Ver el resultado» trae aquí un archivo que el
            usuario no abrió: sin el nombre, el original y su versión ligera son
            dos videos idénticos en una mesa sin etiqueta.
          */}
          <span className="tname" title={probe.path}>
            {probe.filename}
          </span>
          {preview && (
            <span className="bar-note" title="Se está viendo una copia temporal, no el original">
              vista previa
            </span>
          )}

          <button
            type="button"
            className="tkey"
            onClick={togglePlay}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
            aria-keyshortcuts="Space"
            title={playing ? 'Pausar (espacio)' : 'Reproducir (espacio)'}
          >
            {playing ? <IconPause aria-hidden="true" /> : <IconPlay aria-hidden="true" />}
          </button>

          {/* El atajo va escrito en la tecla, no en una ayuda aparte: es la
              única forma de que alguien lo descubra sin buscarlo. */}
          <button
            type="button"
            className="tkey"
            onClick={() => stepFrame(-1)}
            aria-label="Un cuadro atrás"
            aria-keyshortcuts="j"
            title="Un cuadro atrás (J)"
          >
            <IconStepBack aria-hidden="true" />
            <kbd>J</kbd>
          </button>
          <button
            type="button"
            className="tkey"
            onClick={() => stepFrame(1)}
            aria-label="Un cuadro adelante"
            aria-keyshortcuts="k"
            title="Un cuadro adelante (K)"
          >
            <kbd>K</kbd>
            <IconStepNext aria-hidden="true" />
          </button>

          <input
            className="scrub"
            type="range"
            min={0}
            max={Math.max(0.001, duration)}
            step={1 / fps}
            value={Math.min(time, duration)}
            aria-label="Posición en el video"
            aria-valuetext={`${formatTimecode(time)} de ${formatTimecode(duration)}`}
            style={
              { '--played': `${duration > 0 ? (time / duration) * 100 : 0}%` } as CSSProperties
            }
            onChange={(e) => {
              const v = videoRef.current
              const next = Number(e.target.value)
              setTime(next)
              if (v) v.currentTime = next
            }}
          />

          <span className="tcode">
            <strong>{formatTimecode(time)}</strong>
            <span className="tcode-total">/ {formatTimecode(duration)}</span>
          </span>

          <span className="tframe">
            <span className="mass-k">Cuadro</span>
            <span className="mass-v">{frame}</span>
          </span>
        </div>

        <div className="transport-line transport-tools">
          <div className="tool">
            <span className="mass-k">Velocidad</span>
            <Segmented
              label="Velocidad de reproducción"
              options={SPEEDS}
              value={String(rate)}
              onChange={(v) => setRate(Number(v))}
            />
          </div>

          <div className="tool">
            <span className="mass-k">Zoom</span>
            <div className="zoom">
              <button
                type="button"
                className="tkey"
                onClick={() => zoomTo(zoom / 1.25)}
                aria-label="Alejar"
                title="Alejar (−)"
              >
                <IconMinus aria-hidden="true" />
              </button>
              <span className="zoom-v" aria-live="polite" aria-atomic="true">
                {zoomPercent} %
              </span>
              <button
                type="button"
                className="tkey"
                onClick={() => zoomTo(zoom * 1.25)}
                aria-label="Acercar"
                title="Acercar (+)"
              >
                <IconPlus aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              title="Que la imagen entre entera (0)"
            >
              Ajustar
            </button>
            {/* Sin reescalado no hay defecto disimulado: es la única vista en la
                que un bloque de compresión se ve del tamaño que tiene. */}
            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={() => zoomTo(1 / fit)}
              aria-label="Tamaño real: un píxel del video en un píxel de pantalla"
              title="Tamaño real: un píxel del video en un píxel de pantalla"
            >
              1:1
            </button>
          </div>

          <div className="tool">
            <button
              type="button"
              className="tkey"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Activar el sonido' : 'Silenciar'}
              aria-keyshortcuts="m"
              title={muted ? 'Activar el sonido (M)' : 'Silenciar (M)'}
            >
              {muted ? <IconMute aria-hidden="true" /> : <IconSound aria-hidden="true" />}
            </button>
            <input
              className="vol"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              aria-label="Volumen"
              aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} %`}
              onChange={(e) => {
                setVolume(Number(e.target.value))
                setMuted(false)
              }}
            />
          </div>

          {/* El foil va aquí porque aquí está lo único que este módulo escribe
              en el disco. En la otra pantalla lo lleva Comprimir; nunca hay dos
              a la vez, porque nunca hay dos módulos a la vez. */}
          <button
            type="button"
            className="act act-commit"
            disabled={!src || unplayable}
            onClick={() => void onCapture()}
          >
            Capturar fotograma
            <IconCamera aria-hidden="true" />
          </button>
        </div>
      </footer>
    </>
  )
}
