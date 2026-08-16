import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { EditProject, RenderOptions } from '@shared/edit'
import { clipEnd, clipLength, projectDuration } from '@shared/edit'
import type {
  Container,
  FfmpegStatus,
  JobProgress,
  JobResult,
  MediaProbe,
  VideoCodec
} from '@shared/types'
import { formatDuration, formatTimecode } from './defaults'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  closeGaps,
  duplicateClip,
  insertSource,
  linkedGroup,
  projectFromProbe,
  removeClips,
  setGain,
  sourceFromProbe,
  sourceTime,
  splitAt,
  suggestCanvas,
  unlink,
  videoClipAt
} from './edit'
import { explain, type FriendlyError } from './errors'
import { Segmented } from './Crease'
import { ErrorNotice, Notice } from './Notice'
import { Timeline } from './Timeline'
import { Working } from './Working'
import {
  IconArrow,
  IconCheck,
  IconCut,
  IconLink,
  IconMute,
  IconPause,
  IconPlay,
  IconPlus,
  IconTrash,
  IconUndo
} from './Icons'

/*
 * Editar: el banco de trabajo.
 *
 * Los otros dos módulos tratan un archivo: uno lo mira, el otro lo aligera. Este
 * trata *varios*, y esa es toda la diferencia. Aquí el archivo cargado en la
 * ventana deja de ser el tema y pasa a ser la semilla: entra en la línea de
 * tiempo como el primer bloque y a partir de ahí conviven con él todos los que
 * se añadan.
 *
 * Tres decisiones sostienen el módulo:
 *
 * **Nada se escribe hasta exportar.** Cortar, mover y estirar son cambios en una
 * lista de citas — «de este archivo, de tal segundo a tal otro» — y no tocan un
 * byte del disco. Por eso deshacer puede ser una pila y no una operación
 * inversa por cada gesto, y por eso el original nunca corre peligro.
 *
 * **La imagen manda sobre la sincronía.** Un archivo con sonido entra como dos
 * bloques hermanados que se mueven juntos. Separarlos es una orden explícita, y
 * mientras no se dé, es imposible desincronizarlos sin querer.
 *
 * **Lo que se ve es una aproximación; lo que se exporta es la verdad.** La
 * previsualización la hace el motor del navegador con los archivos originales,
 * saltando de bloque en bloque, y en los cortes se le nota el salto. El montaje
 * de verdad lo arma FFmpeg en una sola pasada. Prometer que la vista previa es
 * idéntica al resultado sería mentir en el único sitio donde se puede comprobar.
 */

/** Cada escalón de calidad, en el CRF que le corresponde a cada códec. Un 22 no
    significa lo mismo en H.264 que en VP9, así que no se comparte el número. */
const TIERS = {
  alta: { h264: 18, vp9: 28, audio: 192 },
  media: { h264: 22, vp9: 33, audio: 128 },
  ligera: { h264: 28, vp9: 40, audio: 96 }
} as const

type Tier = keyof typeof TIERS

const SCALES = [
  { value: 'original', label: 'Original' },
  { value: '1080', label: '1080p' },
  { value: '720', label: '720p' }
]

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/*
 * El zoom de la línea de tiempo se mueve multiplicando, no sumando.
 *
 * La barra recorre de cuatro a cuatrocientos píxeles por segundo — cien veces —
 * y repartido a partes iguales todo el trabajo cabía en el primer dedo de
 * recorrido: el paso por defecto caía al 6 % de la barra y de ahí en adelante
 * cualquier empujón multiplicaba la escala por tres. Repartido en proporción,
 * cada tramo vale el mismo *factor*, que es exactamente como ya se movían las
 * teclas − y + con su 1,3, y el paso por defecto cae hacia la mitad.
 */
const ZOOM_STOPS = 100

function zoomSlide(z: number): number {
  return Math.round((Math.log(z / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM)) * ZOOM_STOPS)
}

function slideZoom(s: number): number {
  return MIN_ZOOM * (MAX_ZOOM / MIN_ZOOM) ** (s / ZOOM_STOPS)
}

export function Editor({
  probe,
  active,
  env,
  error,
  onError,
  onWatch,
  pendingImport,
  onImported
}: {
  probe: MediaProbe
  active: boolean
  env: FfmpegStatus | null
  error: FriendlyError | null
  onError: (e: FriendlyError | null) => void
  onWatch: (path: string) => void
  /** Un archivo soltado en la ventana mientras el montaje estaba delante. */
  pendingImport: string | null
  onImported: () => void
}): JSX.Element {
  const [project, setProject] = useState<EditProject>(() => projectFromProbe(probe))
  const [past, setPast] = useState<EditProject[]>([])
  const [future, setFuture] = useState<EditProject[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [zoom, setZoom] = useState(28)
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [adrift, setAdrift] = useState<string | null>(null)

  const [container, setContainer] = useState<Container>('mp4')
  const [tier, setTier] = useState<Tier>('media')
  const [scale, setScale] = useState('original')

  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [result, setResult] = useState<JobResult | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const mixRef = useRef(new Map<string, HTMLAudioElement>())
  const clockRef = useRef(0)
  const jobRef = useRef<string | null>(null)
  /** El proyecto con el que arrancó la ventana. Si nadie lo tocó, cambiar de
      archivo lo reemplaza; si lo tocaron, no se toca ni se pregunta. */
  const seedRef = useRef(probe.path)
  const dirty = past.length > 0

  const duration = projectDuration(project)

  // Sólo el progreso del trabajo propio: el canal es uno para toda la ventana y
  // comprimir escribe por el mismo. Ver el porcentaje de un trabajo ajeno con un
  // Detener que no lo detiene es peor que no verlo.
  useEffect(() => {
    const off = window.videoscaler.onProgress((p) => {
      if (jobRef.current === p.jobId) setProgress(p)
    })
    return off
  }, [])

  // --- Historia -----------------------------------------------------------

  /*
   * El proyecto vive también en una referencia, y no por comodidad.
   *
   * Guardar el antes desde dentro de un actualizador de `setState` sería
   * escribir en un estado mientras se calcula otro — y en modo estricto React
   * llama a los actualizadores dos veces, así que la pila se llenaría de
   * duplicados y un solo Ctrl+Z no desharía nada. Con la referencia, el antes se
   * lee fuera de todo actualizador y cada gesto deja exactamente un paso.
   */
  const projectRef = useRef(project)
  const write = useCallback((next: EditProject): void => {
    projectRef.current = next
    setProject(next)
  }, [])

  /** Guarda el antes y aplica el después. Todo cambio del usuario pasa por
      aquí; los arrastres avisan una sola vez, al empezar. */
  const commit = useCallback(
    (next: EditProject | ((p: EditProject) => EditProject)): void => {
      const current = projectRef.current
      const value = typeof next === 'function' ? next(current) : next
      if (value === current) return
      setPast((p) => [...p.slice(-59), current])
      setFuture([])
      write(value)
    },
    [write]
  )

  /** El arrastre guarda el antes al primer movimiento y luego escribe sin
      historia: una pila con sesenta pasos intermedios de un mismo gesto no es
      deshacer, es rebobinar. */
  const begin = useCallback((): void => {
    setPast((p) => [...p.slice(-59), projectRef.current])
    setFuture([])
  }, [])

  const undo = useCallback((): void => {
    const previous = past[past.length - 1]
    if (!previous) return
    setFuture((f) => [projectRef.current, ...f.slice(0, 59)])
    setPast((p) => p.slice(0, -1))
    write(previous)
  }, [past, write])

  const redo = useCallback((): void => {
    const next = future[0]
    if (!next) return
    setPast((p) => [...p.slice(-59), projectRef.current])
    setFuture((f) => f.slice(1))
    write(next)
  }, [future, write])

  // --- Orígenes -----------------------------------------------------------

  // Cada origen necesita su URL antes de poder verse u oírse. Se piden una vez
  // por archivo y se guardan: pedirlas en cada render volvería a autorizar la
  // misma ruta sesenta veces por segundo.
  useEffect(() => {
    let alive = true
    for (const source of project.sources) {
      if (urls[source.id]) continue
      void window.videoscaler.mediaUrl(source.path).then((url) => {
        if (alive) setUrls((u) => (u[source.id] ? u : { ...u, [source.id]: url }))
      })
    }
    return () => {
      alive = false
    }
  }, [project.sources, urls])

  const addFile = useCallback(
    async (path: string): Promise<void> => {
      setBusy(true)
      try {
        const next = await window.videoscaler.probe(path)
        if (!next.video && !next.audio) {
          onError({
            message: `${next.filename} no trae ni imagen ni sonido, así que no hay nada que montar con él.`,
            detail: `ffprobe no encontró streams utilizables en ${path}`
          })
          return
        }
        onError(null)
        commit((p) => insertSource(p, sourceFromProbe(next), playhead))
      } catch (err) {
        onError(explain(err instanceof Error ? err.message : String(err), path.split(/[\\/]/).pop()))
      } finally {
        setBusy(false)
      }
    },
    [commit, playhead, onError]
  )

  const onAdd = useCallback(async () => {
    const paths = await window.videoscaler.pickMedia()
    for (const path of paths) await addFile(path)
  }, [addFile])

  // Un archivo soltado sobre la ventana con el montaje delante se añade, no
  // reemplaza. Es la única lectura posible del gesto aquí: nadie arrastra un
  // segundo video a un editor para tirar el primero.
  useEffect(() => {
    if (!pendingImport) return
    void addFile(pendingImport).finally(onImported)
  }, [pendingImport, addFile, onImported])

  /*
   * La ventana cambió de archivo.
   *
   * Si el montaje sigue siendo la semilla intacta, se resiembra: nadie ha
   * perdido nada y lo que el usuario espera ver es el archivo que acaba de
   * abrir. Si ya trabajó, el montaje se queda como está — tirarlo porque miró
   * otro video sería el peor error que este módulo puede cometer — y se le dice
   * dónde está el archivo nuevo, con un botón para traerlo.
   */
  useEffect(() => {
    if (probe.path === seedRef.current) return
    if (!dirty) {
      seedRef.current = probe.path
      write(projectFromProbe(probe))
      setPlayhead(0)
      clockRef.current = 0
      setSelected([])
      setAdrift(null)
      return
    }
    setAdrift(probe.path)
  }, [probe, dirty, write])

  // --- Reproducción -------------------------------------------------------

  const seek = useCallback(
    (t: number): void => {
      const value = clamp(t, 0, Math.max(0, duration))
      clockRef.current = value
      setPlayhead(value)
    },
    [duration]
  )

  const videoClip = useMemo(() => videoClipAt(project, playhead), [project, playhead])
  const videoSource = useMemo(
    () => (videoClip ? project.sources.find((s) => s.id === videoClip.sourceId) : undefined),
    [videoClip, project.sources]
  )
  const videoUrl = videoSource ? urls[videoSource.id] : undefined

  /*
   * El reloj maestro es el de la pared, no el del video.
   *
   * Podría llevarlo el elemento de video, y sería más exacto mientras hay
   * imagen; pero en un hueco negro, o sobre un tramo de sólo música, no hay
   * ningún elemento del que leer la hora y el montaje se quedaría congelado
   * justo donde el usuario está esperando ver pasar el tiempo. Con un reloj
   * propio, cada elemento es un seguidor al que se corrige si se aleja.
   */
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    let published = 0
    const tick = (now: number): void => {
      clockRef.current += (now - last) / 1000
      last = now
      if (clockRef.current >= duration) {
        clockRef.current = duration
        setPlayhead(duration)
        setPlaying(false)
        return
      }
      // Publicar cada cuadro obligaría a React a redibujar la línea de tiempo
      // sesenta veces por segundo para mover una raya. A treinta no se nota la
      // diferencia y se nota la mitad de trabajo.
      if (now - published > 32) {
        published = now
        setPlayhead(clockRef.current)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration])

  // La imagen sigue al reloj. Corriendo se le perdona un tercio de segundo —
  // corregir cada cuadro daría un tartamudeo permanente — y parado se le exige
  // el fotograma exacto, porque ahí el usuario está mirando un cuadro concreto.
  useEffect(() => {
    const v = videoRef.current
    if (!v || !videoClip) return
    const want = sourceTime(videoClip, playhead)
    if (Math.abs(v.currentTime - want) > (playing ? 0.34 : 0.02)) v.currentTime = want
  }, [playhead, playing, videoClip])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (playing && videoClip) void v.play().catch(() => undefined)
    else v.pause()
  }, [playing, videoClip, videoUrl])

  // El sonido, igual: cada bloque vivo suena y los demás callan. La ganancia
  // por encima de 1 no se puede previsualizar — el elemento de audio no pasa del
  // volumen del archivo — pero sí se exporta; lo dice el mando.
  useEffect(() => {
    for (const clip of project.clips) {
      if (clip.kind !== 'audio') continue
      const el = mixRef.current.get(clip.id)
      if (!el) continue
      el.volume = clamp(clip.gain, 0, 1)
      const live = playhead >= clip.startSec - 0.001 && playhead < clipEnd(clip) - 0.001
      if (!live || !playing || clip.gain === 0) {
        if (!el.paused) el.pause()
        continue
      }
      const want = sourceTime(clip, playhead)
      if (Math.abs(el.currentTime - want) > 0.34) el.currentTime = want
      if (el.paused) void el.play().catch(() => undefined)
    }
  }, [playhead, playing, project])

  // Salir del módulo calla el montaje. Un editor que sigue sonando desde otra
  // pestaña es la misma falta que un reproductor que sigue sonando.
  useEffect(() => {
    if (active) return
    setPlaying(false)
    videoRef.current?.pause()
    for (const el of mixRef.current.values()) el.pause()
  }, [active])

  // --- Operaciones --------------------------------------------------------

  const fps = useMemo(() => suggestCanvas(project).fps, [project])

  const cut = useCallback(() => commit((p) => splitAt(p, playhead, selected)), [commit, playhead, selected])

  const drop = useCallback(
    (ripple: boolean) => {
      if (selected.length === 0) return
      commit((p) => removeClips(p, selected, ripple))
      setSelected([])
    },
    [commit, selected]
  )

  const detach = useCallback(() => {
    if (selected.length === 0) return
    commit((p) => selected.reduce((acc, id) => unlink(acc, id), p))
  }, [commit, selected])

  const hush = useCallback(() => {
    if (selected.length === 0) return
    commit((p) =>
      selected.reduce((acc, id) => {
        const clip = acc.clips.find((c) => c.id === id)
        if (!clip) return acc
        // Silenciar un bloque de imagen es silenciar su sonido hermanado: lo que
        // el usuario señaló es la escena, no la corriente.
        const target = clip.kind === 'audio' ? clip : linkedGroup(acc, id).find((c) => c.kind === 'audio')
        if (!target) return acc
        return setGain(acc, target.id, target.gain === 0 ? 1 : 0)
      }, p)
    )
  }, [commit, selected])

  const twin = useCallback(() => {
    if (selected.length === 0) return
    commit((p) => selected.reduce((acc, id) => duplicateClip(acc, id), p))
  }, [commit, selected])

  // --- Teclado ------------------------------------------------------------

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (typing && (e.key.startsWith('Arrow') || e.key === ' ')) return
      if (tag === 'BUTTON' && e.key === ' ') return

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase()
        if (key === 'z') {
          e.preventDefault()
          if (e.shiftKey) redo()
          else undo()
        } else if (key === 'y') {
          e.preventDefault()
          redo()
        }
        return
      }
      if (e.altKey) return

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'p':
          setPlaying((v) => !v)
          break
        case 's':
          cut()
          break
        case 'd':
          twin()
          break
        case 'u':
          detach()
          break
        case 'm':
          hush()
          break
        case 'delete':
        case 'backspace':
          // Con Mayúsculas se cierra el hueco. Son dos borrados distintos y no
          // un ajuste: uno deja el silencio donde estaba la escena, el otro
          // acerca todo lo que venía detrás.
          drop(e.shiftKey)
          break
        case 'home':
          seek(0)
          break
        case 'end':
          seek(duration)
          break
        case 'arrowleft':
          seek(playhead - (e.shiftKey ? 1 : 5))
          break
        case 'arrowright':
          seek(playhead + (e.shiftKey ? 1 : 5))
          break
        case ',':
          seek(playhead - 1 / Math.max(1, fps))
          break
        case '.':
          seek(playhead + 1 / Math.max(1, fps))
          break
        case '+':
        case '=':
          setZoom((z) => clamp(z * 1.3, MIN_ZOOM, MAX_ZOOM))
          break
        case '-':
          setZoom((z) => clamp(z / 1.3, MIN_ZOOM, MAX_ZOOM))
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, cut, twin, detach, hush, drop, seek, undo, redo, playhead, duration, fps])

  // --- Exportar -----------------------------------------------------------

  const canvas = useMemo(() => suggestCanvas(project), [project])
  const out = useMemo(() => {
    if (scale === 'original') return canvas
    const height = Number(scale)
    const width = Math.round((canvas.width * height) / Math.max(1, canvas.height))
    return { width: width - (width % 2), height, fps: canvas.fps }
  }, [canvas, scale])

  const hasPicture = project.clips.some((c) => c.kind === 'video' && clipLength(c) > 0.02)
  const running = progress !== null && result === null
  const closeSheet = useCallback(() => setProgress(null), [])

  const onExport = useCallback(async () => {
    onError(null)
    setResult(null)
    setPlaying(false)
    const jobId = `edit-${Date.now()}`
    jobRef.current = jobId
    const codec: VideoCodec = container === 'webm' ? 'vp9' : 'h264'
    const options: RenderOptions = {
      container,
      width: out.width,
      height: out.height,
      fps: out.fps,
      videoCodec: codec,
      quality: codec === 'vp9' ? TIERS[tier].vp9 : TIERS[tier].h264,
      preset: 'medium',
      // Sin aceleración por hardware: el montaje ya pide bastante del
      // `filter_complex`, y los encoders del sistema se llevan mal con él en
      // algunas máquinas. Comprimir sí la ofrece, que es donde de verdad ahorra
      // horas.
      hardwareAccel: 'none',
      audioCodec: container === 'webm' ? 'opus' : 'aac',
      audioBitrateKbps: TIERS[tier].audio
    }
    const outputPath = await window.videoscaler.suggestProjectPath(seedRef.current, container)
    setProgress({ jobId, percent: 0, speed: null, fps: null, etaSec: null, outSizeBytes: null })
    const res = await window.videoscaler.startRender({ jobId, outputPath, project, options })
    setResult(res)
    if (res.error) onError(explain(res.error, outputPath.split(/[\\/]/).pop()))
  }, [container, out, tier, project, onError])

  const onCancel = useCallback(() => {
    if (jobRef.current) void window.videoscaler.cancelEncode(jobRef.current)
  }, [])

  // --- Vista --------------------------------------------------------------

  const one = selected.length === 1 ? project.clips.find((c) => c.id === selected[0]) : undefined
  const cuts = project.clips.length

  return (
    <>
      <div className="editor">
        <div className="edit-stage">
          {videoUrl && videoClip ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="edit-video"
              // Mudo a propósito: en este modelo la pista de video lleva imagen
              // y el sonido va en su propio bloque. Si sonara también el
              // elemento, todo lo que tenga audio hermanado se oiría dos veces.
              muted
              playsInline
              preload="auto"
              // Al cambiar de bloque cambia la fuente, y el sitio pedido antes
              // de que el archivo tenga metadatos se pierde. Se vuelve a pedir
              // aquí: sin esto, cada corte entre dos archivos distintos empieza
              // desde el segundo cero del nuevo en vez de por donde toca.
              onLoadedMetadata={(e) => {
                if (videoClip) e.currentTarget.currentTime = sourceTime(videoClip, playhead)
              }}
              onClick={() => setPlaying((v) => !v)}
            />
          ) : (
            <p className="edit-blank">
              {hasPicture ? 'Negro' : 'La línea de tiempo no tiene imagen todavía'}
            </p>
          )}

          <div className="edit-hud">
            <span className="tcode">
              <strong>{formatTimecode(playhead)}</strong>
              <span className="tcode-total">/ {formatTimecode(duration)}</span>
            </span>
          </div>

          {/* Los elementos del sonido viven aquí, sin tamaño y sin voz en la
              retícula: son mandos, no imagen. */}
          <div className="edit-mixer" aria-hidden="true">
            {project.clips
              .filter((c) => c.kind === 'audio')
              .map((clip) => (
                <audio
                  key={clip.id}
                  src={urls[clip.sourceId]}
                  preload="metadata"
                  ref={(el) => {
                    if (el) mixRef.current.set(clip.id, el)
                    else mixRef.current.delete(clip.id)
                  }}
                />
              ))}
          </div>
        </div>

        <div className="edit-deck">
          <div className="deck-head">
            <button
              type="button"
              className="tkey"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              aria-keyshortcuts="Space P"
              title={playing ? 'Pausar (espacio o P)' : 'Reproducir (espacio o P)'}
            >
              {playing ? <IconPause aria-hidden="true" /> : <IconPlay aria-hidden="true" />}
            </button>

            <span className="deck-sep" aria-hidden="true" />

            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={cut}
              aria-keyshortcuts="s"
              title="Parte por donde está el cursor (S). Sin selección, corta todo lo que cruce."
            >
              <IconCut aria-hidden="true" />
              Cortar
            </button>
            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={twin}
              disabled={selected.length === 0}
              aria-keyshortcuts="d"
              title="Una copia justo detrás (D)"
            >
              Duplicar
            </button>
            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={detach}
              disabled={!selected.some((id) => project.clips.find((c) => c.id === id)?.linkId)}
              aria-keyshortcuts="u"
              title="Rompe el vínculo entre la imagen y su sonido (U)"
            >
              <IconLink aria-hidden="true" />
              Separar audio
            </button>
            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={hush}
              disabled={selected.length === 0}
              aria-keyshortcuts="m"
              title="Silencia el sonido del bloque (M)"
            >
              <IconMute aria-hidden="true" />
              Silenciar
            </button>
            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={() => drop(false)}
              disabled={selected.length === 0}
              aria-keyshortcuts="Delete"
              title="Quita el bloque y deja el hueco (Supr). Con Mayúsculas, cierra el hueco."
            >
              <IconTrash aria-hidden="true" />
              Quitar
            </button>
            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={() => commit(closeGaps)}
              title="Empuja la imagen contra el principio, sin huecos"
            >
              Cerrar huecos
            </button>

            <span className="deck-sep" aria-hidden="true" />

            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={undo}
              disabled={past.length === 0}
              aria-keyshortcuts="Control+z"
              title="Deshacer (Ctrl+Z)"
            >
              <IconUndo aria-hidden="true" />
              Deshacer
            </button>
            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={redo}
              disabled={future.length === 0}
              aria-keyshortcuts="Control+Shift+z"
              title="Rehacer (Ctrl+Mayús+Z)"
            >
              Rehacer
            </button>

            <span className="bar-spacer" />

            <div className="tool">
              <span className="mass-k">Zoom</span>
              <input
                className="zoom-range"
                type="range"
                min={0}
                max={ZOOM_STOPS}
                step={1}
                value={zoomSlide(zoom)}
                aria-label="Zoom de la línea de tiempo"
                aria-valuetext={`${Math.round(zoom)} píxeles por segundo`}
                title="Cuánta línea de tiempo cabe en la ventana (− y +)"
                onChange={(e) => setZoom(slideZoom(Number(e.target.value)))}
              />
            </div>

            <button
              type="button"
              className="act act-quiet act-mini"
              onClick={() => void onAdd()}
              disabled={busy}
              title="Trae un video o un audio y lo pone donde está el cursor"
            >
              <IconPlus aria-hidden="true" />
              {busy ? 'Añadiendo' : 'Añadir medio'}
            </button>
          </div>

          {(error || adrift || one) && (
            <div className="deck-say">
              {error && <ErrorNotice error={error} />}

              {/* El archivo de la ventana cambió y el montaje no. Se dice, con
                  la única acción que tiene sentido al lado. */}
              {adrift && (
                <Notice tone="quiet" icon={<IconCheck aria-hidden="true" />}>
                  La ventana abrió <code>{adrift.split(/[\\/]/).pop()}</code>. Tu montaje sigue
                  intacto.{' '}
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      const path = adrift
                      setAdrift(null)
                      void addFile(path)
                    }}
                  >
                    Añadirlo al montaje
                  </button>
                </Notice>
              )}

              {/* Los mandos del bloque seleccionado. Aparecen sólo con uno
                  elegido: son sobre *ese* bloque, y enseñarlos vacíos sería
                  ofrecer palancas que no mueven nada. */}
              {one && (
                <div className="pick">
                  <span className="pick-name">
                    {project.sources.find((s) => s.id === one.sourceId)?.filename}
                  </span>
                  <span className="pick-spec">
                    {one.kind === 'video' ? 'imagen' : 'sonido'} · {formatTimecode(one.inSec)} →{' '}
                    {formatTimecode(one.outSec)} · dura {formatTimecode(clipLength(one))}
                  </span>
                  {one.kind === 'audio' && (
                    <label className="pick-gain">
                      <span className="mass-k">Volumen</span>
                      <input
                        type="range"
                        className="tool-range"
                        min={0}
                        max={2}
                        step={0.05}
                        value={one.gain}
                        aria-label="Volumen del bloque"
                        aria-valuetext={`${Math.round(one.gain * 100)} %`}
                        title="Por encima del 100 % se exporta más alto, aunque la vista previa no pueda subirlo"
                        onChange={(e) => commit((p) => setGain(p, one.id, Number(e.target.value)))}
                      />
                      <span className="mass-v">{Math.round(one.gain * 100)} %</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          <Timeline
            project={project}
            playhead={playhead}
            selected={selected}
            zoom={zoom}
            onSeek={seek}
            onSelect={setSelected}
            onBegin={begin}
            onDraft={write}
            onEnd={() => undefined}
          />
        </div>
      </div>

      <footer className="mass">
        <div className="mass-group">
          <span className="mass-k">Dura</span>
          <span className="mass-v mass-v-strong">{formatDuration(duration)}</span>
        </div>
        <div className="mass-group">
          <span className="mass-k">Bloques</span>
          <span className="mass-v">{cuts}</span>
        </div>
        <div className="mass-group">
          <span className="mass-k">Sale a</span>
          <span className="mass-v">
            {out.width}×{out.height} · {out.fps}/s
          </span>
        </div>

        <span className="bar-spacer" />

        <div className="mass-group">
          <span className="mass-k">Tamaño</span>
          <Segmented label="Resolución de salida" options={SCALES} value={scale} onChange={setScale} />
        </div>
        <div className="mass-group">
          <span className="mass-k">Calidad</span>
          <Segmented
            label="Calidad de la exportación"
            options={[
              { value: 'alta', label: 'Alta' },
              { value: 'media', label: 'Media' },
              { value: 'ligera', label: 'Ligera' }
            ]}
            value={tier}
            onChange={(v: Tier) => setTier(v)}
          />
        </div>
        <div className="mass-group">
          <span className="mass-k">Caja</span>
          <Segmented
            label="Contenedor de salida"
            options={[
              { value: 'mp4', label: 'MP4' },
              { value: 'mkv', label: 'MKV' },
              { value: 'webm', label: 'WebM' }
            ]}
            value={container}
            onChange={(v: Container) => setContainer(v)}
          />
        </div>

        <button
          type="button"
          className="act act-commit"
          disabled={running || !hasPicture || !env?.available}
          onClick={() => void onExport()}
          title={
            hasPicture
              ? 'Escribe el montaje entero en un archivo nuevo'
              : 'Hace falta al menos un bloque de imagen en la línea de tiempo'
          }
        >
          {running ? 'Exportando' : 'Exportar'}
          <IconArrow aria-hidden="true" />
        </button>
      </footer>

      <Working
        progress={progress}
        result={result}
        error={error}
        filename={`${project.sources.length} archivo${project.sources.length === 1 ? '' : 's'} · ${formatDuration(duration)}`}
        path={seedRef.current}
        labels={{
          running: 'Exportando el montaje',
          done: 'Montaje exportado',
          canceled: 'Se detuvo la exportación',
          failed: 'No se pudo exportar'
        }}
        runningNote="La ventana queda en pausa hasta que termine. Detener no toca ninguno de los originales."
        canceledNote="No se montó nada a medias: los archivos que trajiste están intactos y la línea de tiempo sigue como estaba."
        onCancel={onCancel}
        onClose={closeSheet}
        onWatch={onWatch}
      />
    </>
  )
}
