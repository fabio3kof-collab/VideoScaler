import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, JSX, PointerEvent as ReactPointerEvent } from 'react'
import type { MediaProbe } from '@shared/types'
import { formatTimecode } from './defaults'
import { explain, type FriendlyError } from './errors'
import { Segmented } from './Crease'
import { ErrorNotice, Notice } from './Notice'
import {
  IconCamera,
  IconCheck,
  IconFocus,
  IconMute,
  IconPause,
  IconPlay,
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
 * De ahí las herramientas que no trae un reproductor cualquiera: la velocidad
 * (el movimiento delata lo que la pausa esconde), el zoom con tamaño real (un
 * píxel del video en un píxel de pantalla, sin reescalado que disimule el
 * defecto), el paso cuadro a cuadro con J y K — que sostenidas se vuelven una
 * marcha al 15 % — y el recuadro de enfoque sobre la imagen detenida.
 */

const SPEEDS = [
  { value: '0.25', label: '0,25×' },
  { value: '0.5', label: '0,5×' },
  { value: '1', label: '1×' },
  { value: '1.5', label: '1,5×' },
  { value: '2', label: '2×' },
  { value: '4', label: '4×' }
]

/** La marcha de J y K sostenidas: lo bastante lenta para leer cada cuadro. */
const CRAWL_RATE = 0.15
/** Cuánto hay que sostener antes de que el paso suelto se vuelva marcha. */
const CRAWL_AFTER_MS = 280

/** El salto de las flechas, y el fino con Mayúsculas. */
const SEEK_STEP = 5
const SEEK_FINE = 1
/**
 * La cadencia del salto sostenido. No es la repetición del sistema — que va a
 * treinta por segundo y en cada máquina a la suya — porque a ese ritmo un
 * segundo de tecla hundida serían dos minutos y medio de video. Con estos
 * números, un segundo sostenido son veinticinco: una distancia que se puede
 * apuntar.
 */
const SEEK_AFTER_MS = 320
const SEEK_EVERY_MS = 160

/** El volumen por pulsación suelta y por repetición sostenida. */
const VOLUME_STEP = 0.05
const VOLUME_HELD = 0.02

/**
 * El techo del zoom, en escala efectiva. El suelo no es una constante: es lo
 * que mida el propio archivo — no tiene sentido alejarse más allá del fotograma
 * entero, porque debajo no hay nada que ver.
 */
const ZOOM_CEILING = 3

/** Aire alrededor de la imagen cuando está ajustada: la mesa no es un marco. */
const STAGE_PAD = 24

/**
 * Los topes del lienzo del enfoque, que trabaja a la resolución a la que se
 * está *viendo* la imagen y no a la del archivo. Cuatro veces el original es más
 * de lo que cualquier zoom pide, y tres millones de píxeles es un realce que aún
 * se calcula en un cuadro de pantalla — por encima, el paneo daría tirones.
 */
const FOCUS_MAX_SCALE = 4
const FOCUS_MAX_PIXELS = 3_000_000

/**
 * El mínimo del lado mayor de la imagen guardada.
 *
 * Sin esto la captura salía a la resolución del recorte, y al 300 % el recorte
 * son cuatrocientos píxeles de ancho: una imagen que no sirve para enseñar
 * nada. Es un suelo y no un tamaño fijo — un fotograma entero de un 4K sale a
 * sus 3840, porque reducirlo para cumplir una cifra sería tirar píxeles reales
 * que ya estaban ahí.
 */
const CAPTURE_MIN_LONG_SIDE = 1920

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

interface Point {
  x: number
  y: number
}

/** Recuadro en proporción del fotograma (0..1), no en píxeles de pantalla: así
    sobrevive al zoom, al paneo y al cambio de tamaño de la ventana. */
interface Box {
  x: number
  y: number
  w: number
  h: number
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
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ id: number; from: Point; pan: Point } | null>(null)
  /** Qué región del fotograma tiene dibujada el realce ahora mismo. La captura
      la necesita para pegarlo donde va, y no siempre es la que se ve: durante
      un arrastre el realce se queda quieto sobre la imagen en vez de rehacerse. */
  const shownFocus = useRef<Box | null>(null)
  /** El realce vigente, para poder pedirlo al soltar el arrastre sin que el
      manejador del puntero dependa de una función que cambia cada render. */
  const focusRef = useRef<() => void>(() => undefined)
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
  /** Segundos apuntados por las flechas y todavía no cobrados. */
  const [skip, setSkip] = useState(0)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [media, setMedia] = useState<Point>({ x: 0, y: 0 })
  const [stage, setStage] = useState<Point>({ x: 0, y: 0 })

  const [focus, setFocus] = useState(false)
  const [amount, setAmount] = useState(0.9)
  const [radius, setRadius] = useState(1.2)

  const [saved, setSaved] = useState<{ path: string; crop: boolean } | null>(null)

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
    // El interruptor del realce no se toca: es una preferencia de cómo mirar, no
    // un sitio dentro de un archivo. Y cuando «Ver el resultado» trae la versión
    // ligera, apagarlo justo ahí sería apagarlo en la mitad de la comparación.
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

  /**
   * Los topes, dichos en escala efectiva y no en pasos de zoom.
   *
   * Abajo, el menor entre el fotograma entero y el tamaño real: alejarse más
   * que el cuadro completo no muestra nada nuevo, y alejarse por debajo del
   * 100 % tampoco — pero un video más chico que la ventana se ajusta *hacia
   * arriba*, y ahí el suelo tiene que ser el tamaño real o el botón 1:1 pediría
   * algo prohibido. Arriba, 300 %, salvo que el propio ajuste ya lo supere.
   */
  const floorPct = Math.max(1, Math.round(Math.min(fit, 1) * 100))
  const ceilPct = Math.max(floorPct + 1, Math.round(Math.max(fit, ZOOM_CEILING) * 100))
  const zoomMin = floorPct / 100 / fit
  const zoomMax = ceilPct / 100 / fit

  const shown = { x: media.x * fit, y: media.y * fit }
  const overflowX = Math.max(0, (shown.x * zoom - stage.x) / 2)
  const overflowY = Math.max(0, (shown.y * zoom - stage.y) / 2)
  const canPan = overflowX > 0 || overflowY > 0

  /**
   * Lo que la mesa deja ver del fotograma, en proporción del cuadro entero.
   *
   * Con la imagen ajustada es el cuadro completo; acercada, el trozo que cabe.
   * Sale del mismo paneo y el mismo zoom que la transformación de la imagen, así
   * que no es una estimación de lo que se ve: es exactamente lo que se ve.
   */
  const visible = useMemo<Box>(() => {
    const w = shown.x * zoom
    const h = shown.y * zoom
    if (!w || !h || !stage.x || !stage.y) return { x: 0, y: 0, w: 1, h: 1 }
    const left = clamp(0.5 + (-stage.x / 2 - pan.x) / w, 0, 1)
    const right = clamp(0.5 + (stage.x / 2 - pan.x) / w, 0, 1)
    const top = clamp(0.5 + (-stage.y / 2 - pan.y) / h, 0, 1)
    const bottom = clamp(0.5 + (stage.y / 2 - pan.y) / h, 0, 1)
    return { x: left, y: top, w: right - left, h: bottom - top }
  }, [shown.x, shown.y, stage.x, stage.y, pan.x, pan.y, zoom])

  /** Queda cuadro fuera de la mesa: lo que se ve ya no es el fotograma entero. */
  const cropped = visible.w < 0.999 || visible.h < 0.999

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
      const z = clamp(next, zoomMin, zoomMax)
      setZoom(z)
      setPan((p) => {
        if (!anchor) return clampPan(p, z)
        const held = { x: (anchor.x - p.x) / zoom, y: (anchor.y - p.y) / zoom }
        return clampPan({ x: anchor.x - held.x * z, y: anchor.y - held.y * z }, z)
      })
    },
    [zoom, zoomMin, zoomMax, clampPan]
  )

  // Al cambiar de archivo o de tamaño de ventana cambian los topes, y lo que
  // estaba dentro puede quedar fuera.
  useEffect(() => {
    setZoom((z) => clamp(z, zoomMin, zoomMax))
  }, [zoomMin, zoomMax])

  useEffect(() => {
    setPan((p) => clampPan(p, zoom))
  }, [clampPan, zoom])

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

  /*
   * Tocar J o K da un cuadro; sostenerlas da una marcha al 15 %.
   *
   * Son dos gestos sobre la misma tecla porque son la misma pregunta a dos
   * distancias: «¿qué pasa exactamente aquí?» y «¿qué pasa por esta zona?».
   * Obligar a soltar y volver a pulsar cincuenta veces para recorrer dos
   * segundos convierte la segunda en un trabajo manual.
   *
   * Hacia adelante la marcha es la del propio elemento de video, que decodifica
   * seguido y no da tirones. Hacia atrás no existe — ningún navegador reproduce
   * al revés — así que se van pidiendo cuadros hacia atrás al mismo ritmo al
   * que la marcha de ida los muestra.
   */
  const holdRef = useRef<{ dir: number; arm: number; run: number } | null>(null)

  /* La velocidad elegida, en una referencia y no en la dependencia de `release`:
     si soltar la marcha cambiara de identidad con cada cambio de velocidad, el
     efecto que lo llama al desmontar se dispararía al mover el segmentado y
     pausaría un video que nadie pidió pausar. */
  const rateRef = useRef(rate)
  useEffect(() => {
    rateRef.current = rate
  }, [rate])

  const release = useCallback((): void => {
    const held = holdRef.current
    if (!held) return
    window.clearTimeout(held.arm)
    window.clearInterval(held.run)
    holdRef.current = null
    const v = videoRef.current
    if (v) {
      v.pause()
      v.playbackRate = rateRef.current
    }
  }, [])

  const press = useCallback(
    (dir: number): void => {
      if (holdRef.current || unplayable) return
      // El toque se cobra al instante: esperar a saber si es toque o sostenido
      // haría que un solo cuadro llegara siempre tarde.
      stepFrame(dir)
      const held = { dir, arm: 0, run: 0 }
      holdRef.current = held
      held.arm = window.setTimeout(() => {
        const v = videoRef.current
        if (!v || holdRef.current !== held) return
        if (dir > 0) {
          v.playbackRate = CRAWL_RATE
          void v.play().catch(() => undefined)
        } else {
          held.run = window.setInterval(() => stepFrame(-1), 1000 / (fps * CRAWL_RATE))
        }
      }, CRAWL_AFTER_MS)
    },
    [stepFrame, fps, unplayable]
  )

  // Una marcha que sobreviviera a salir del módulo, a cambiar de archivo o a
  // desmontar seguiría pidiendo cuadros de un video que ya no se ve.
  useEffect(() => {
    if (!active) release()
  }, [active, release])

  useEffect(() => release, [release, src])

  const seekBy = useCallback((seconds: number): void => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = clamp(v.currentTime + seconds, 0, v.duration || 0)
  }, [])

  /*
   * Las flechas apuntan la distancia; el salto se cobra al soltar.
   *
   * Un salto por pulsación obliga al decodificador a rearmar la imagen desde el
   * cuadro clave anterior cada vez, y sostener la tecla convierte el recorrido
   * en una sucesión de congelaciones. Aquí la tecla sólo suma: la imagen sigue
   * corriendo como si nadie la tocara, el número crece a la vista, y al soltar
   * se hace un único salto de los veintiocho segundos que se hayan apuntado. Un
   * toque suelto es un salto de cinco y se cobra igual, al soltar — ochenta
   * milisegundos después, que no se notan.
   *
   * Con Mayúsculas el paso es de un segundo: la misma tecla para «por aquí» y
   * para «justo aquí», que es la pareja que ya forman J y K un cuadro más abajo.
   */
  const skipRef = useRef(0)
  const jumpRef = useRef<{ arm: number; run: number } | null>(null)

  const addSkip = useCallback((seconds: number): void => {
    const v = videoRef.current
    const now = v?.currentTime ?? 0
    const total = v?.duration || duration
    // Apuntar cien segundos cuando quedan diez es apuntar un número que el video
    // no puede cumplir: el tope se aplica aquí, para que lo que se lee sea lo
    // que va a pasar.
    const next = clamp(skipRef.current + seconds, -now, Math.max(0, total - now))
    skipRef.current = next
    setSkip(next)
  }, [duration])

  const pressJump = useCallback(
    (dir: number, fine: boolean): void => {
      if (jumpRef.current) return
      const step = (fine ? SEEK_FINE : SEEK_STEP) * dir
      addSkip(step)
      const held = { arm: 0, run: 0 }
      jumpRef.current = held
      held.arm = window.setTimeout(() => {
        if (jumpRef.current !== held) return
        held.run = window.setInterval(() => addSkip(step), SEEK_EVERY_MS)
      }, SEEK_AFTER_MS)
    },
    [addSkip]
  )

  const releaseJump = useCallback((): void => {
    const held = jumpRef.current
    if (held) {
      window.clearTimeout(held.arm)
      window.clearInterval(held.run)
      jumpRef.current = null
    }
    const pending = skipRef.current
    skipRef.current = 0
    setSkip(0)
    if (pending) seekBy(pending)
  }, [seekBy])

  const onCapture = useCallback(async () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    try {
      // Se guarda lo que está en la mesa, no lo que hay detrás de ella. Quien
      // acercó al 300 % para mirar un detalle y pulsa guardar quiere ese detalle;
      // devolverle el fotograma entero le deja el trabajo de recortar en otro
      // programa. El cuadro completo sigue a un botón de distancia: Ajustar.
      //
      // El recorte se estira hasta llegar a 1920 en su lado mayor, guardando la
      // proporción que tenga; si ya los pasa, se queda como está. A resolución
      // del archivo, un recorte al 300 % son cuatrocientos píxeles de ancho — el
      // detalle que se estaba mirando, en un sello. Y el realce, si está
      // encendido, ya está calculado a la resolución de pantalla: hay más que
      // copiar aquí que píxeles tiene el recorte en el archivo.
      const cx = Math.round(visible.x * v.videoWidth)
      const cy = Math.round(visible.y * v.videoHeight)
      const cw = Math.max(1, Math.round(visible.w * v.videoWidth))
      const ch = Math.max(1, Math.round(visible.h * v.videoHeight))
      const k = Math.max(1, CAPTURE_MIN_LONG_SIDE / Math.max(cw, ch))
      const tw = Math.max(1, Math.round(cw * k))
      const th = Math.max(1, Math.round(ch * k))

      const canvas = document.createElement('canvas')
      canvas.width = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo abrir un lienzo para la captura.')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(v, cx, cy, cw, ch, 0, 0, tw, th)

      // El realce está a la vista, así que entra en el archivo: apagarlo al
      // escribir daría una imagen distinta de la que llevó a pulsar el botón.
      // El interruptor lo apaga en la mesa, y entonces tampoco entra aquí. Se
      // pega sobre la región que el lienzo tiene dibujada — no sobre la que se
      // ve — porque son la misma salvo mientras se arrastra, y ahí manda la que
      // está pintada.
      const layer = canvasRef.current
      const at = shownFocus.current
      if (layer && at && layer.width > 0 && focus && !playing) {
        ctx.drawImage(
          layer,
          (Math.round(at.x * v.videoWidth) - cx) * k,
          (Math.round(at.y * v.videoHeight) - cy) * k,
          Math.max(1, Math.round(at.w * v.videoWidth)) * k,
          Math.max(1, Math.round(at.h * v.videoHeight)) * k
        )
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) throw new Error('El lienzo no devolvió ninguna imagen.')

      const path = await window.videoscaler.saveCapture({
        sourcePath: probe.path,
        frame,
        crop: cropped,
        data: new Uint8Array(await blob.arrayBuffer())
      })
      onError(null)
      setSaved({ path, crop: cropped })
    } catch (err) {
      onError(explain(err instanceof Error ? err.message : String(err), probe.filename))
    }
  }, [probe.path, probe.filename, frame, onError, visible, cropped, focus, playing])

  // El aviso de guardado se va solo: es una confirmación, no un estado.
  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(null), 8000)
    return () => clearTimeout(t)
  }, [saved])

  // --- El enfoque ---------------------------------------------------------

  /**
   * Máscara de desenfoque sobre lo que se ve: `original + fuerza × (original − desenfocada)`.
   *
   * No inventa un solo píxel — realza el contraste que ya está en el borde, que
   * es lo que el ojo lee como nitidez. Por eso puede acompañar a un juicio sobre
   * la compresión sin falsearlo, siempre que se recuerde lo que hace: un realce
   * fuerte también le da filo al canto del bloque, y un bloque con filo parece
   * detalle. Por eso el interruptor está donde se ve y apagarlo es un gesto: la
   * comparación honesta es la imagen con y sin, y se hace con la misma tecla.
   *
   * Va sobre **todo el campo visible**, no sobre un recuadro elegido a mano.
   * Quien acerca al 300 % no quiere subrayar una parte de lo que mira: quiere
   * que lo que mira se vea. Recortar a mano una región dentro de la región que
   * el zoom ya recortó era pedir dos veces la misma cosa.
   *
   * El realce se hace a la resolución a la que la imagen se está *viendo*, no a
   * la del archivo. Es lo único que sirve para lo que se pide aquí: al acercarse
   * al 300 % la imagen se ve blanda porque la ventana está estirando cada píxel
   * sobre nueve, y un realce hecho antes de ese estiramiento se disuelve en él.
   * Hecho después — sobre los píxeles ya estirados y con el radio estirado igual
   * — devuelve el filo justo donde el zoom lo deshizo.
   *
   * Sólo con la imagen detenida: en marcha habría que rehacerlo veinticinco
   * veces por segundo para mirar algo que se mueve demasiado rápido para
   * juzgarlo.
   */
  const renderFocus = useCallback((): void => {
    const v = videoRef.current
    const canvas = canvasRef.current
    if (!v || !canvas || !v.videoWidth) return
    // Mientras se arrastra la imagen, el realce se queda como está: sigue pegado
    // a los mismos píxeles del fotograma, así que acompaña al paneo sin resbalar
    // — sólo deja de cubrir la franja que va apareciendo, hasta que se suelta.
    // Rehacerlo sesenta veces por segundo daría un paneo a tirones para adelantar
    // un realce que se ve un cuadro antes.
    if (dragRef.current) return

    const sx = Math.round(visible.x * v.videoWidth)
    const sy = Math.round(visible.y * v.videoHeight)
    const sw = Math.max(1, Math.round(visible.w * v.videoWidth))
    const sh = Math.max(1, Math.round(visible.h * v.videoHeight))

    // Cuántos píxeles de pantalla ocupa hoy cada píxel del video: el ajuste, el
    // zoom y la densidad del monitor, que son las tres formas de estirar lo
    // mismo. Se trabaja siempre a esa escala, también cuando es menor que 1 — un
    // 4K alejado se ve reducido, y realzar el original para enseñarlo reducido
    // sería moler ocho millones de píxeles que nadie va a ver. El tope de tamaño
    // va en el mismo mínimo y no en un `clamp` con suelo, porque un suelo de 1
    // devolvería justo el caso que el tope estaba evitando.
    const scale = Math.min(
      fit * zoom * (window.devicePixelRatio || 1),
      FOCUS_MAX_SCALE,
      Math.sqrt(FOCUS_MAX_PIXELS / (sw * sh))
    )
    const dw = Math.max(1, Math.round(sw * scale))
    const dh = Math.max(1, Math.round(sh * scale))

    canvas.width = dw
    canvas.height = dh
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    /*
     * El sitio del lienzo se pone aquí y no en el JSX, en la misma pasada que su
     * contenido. Son dos caras de un mismo dato — qué región del fotograma es
     * esta — y separarlas deja un cuadro en el que el lienzo ya se movió pero
     * todavía muestra lo anterior: el realce resbalando sobre la imagen. Va en
     * porcentaje del marco, así que el zoom y el paneo lo llevan sin cuentas.
     */
    canvas.style.left = `${visible.x * 100}%`
    canvas.style.top = `${visible.y * 100}%`
    canvas.style.width = `${visible.w * 100}%`
    canvas.style.height = `${visible.h * 100}%`
    shownFocus.current = visible

    // El estirado lo hace el motor gráfico y con su mejor filtro: se le pide la
    // misma imagen blanda que se está viendo, para realzar esa y no otra.
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, dw, dh)
    if (amount <= 0) return

    // El desenfoque se pide con margen y luego se recorta: desenfocar justo el
    // recuadro haría que sus bordes se mezclaran con el vacío de fuera del
    // lienzo, y la región saldría con un halo oscuro alrededor.
    const pad = Math.ceil(radius * 3)
    const bx = Math.max(0, sx - pad)
    const by = Math.max(0, sy - pad)
    const bw = Math.min(v.videoWidth, sx + sw + pad) - bx
    const bh = Math.min(v.videoHeight, sy + sh + pad) - by

    const soft = document.createElement('canvas')
    soft.width = Math.max(dw, Math.round(bw * scale))
    soft.height = Math.max(dh, Math.round(bh * scale))
    const sctx = soft.getContext('2d', { willReadFrequently: true })
    if (!sctx) return
    // El desenfoque lo hace el motor gráfico; a mano serían dos pasadas de
    // convolución por cada movimiento de la barra. El radio va en píxeles del
    // archivo — es lo que dice el mando — así que aquí se estira con todo lo
    // demás: si no, al acercarse el realce mordería un detalle cada vez más fino
    // hasta no tocar el borde que el zoom desdibujó.
    sctx.filter = `blur(${radius * scale}px)`
    sctx.imageSmoothingEnabled = true
    sctx.imageSmoothingQuality = 'high'
    sctx.drawImage(v, bx, by, bw, bh, 0, 0, Math.round(bw * scale), Math.round(bh * scale))

    const sharp = ctx.getImageData(0, 0, dw, dh)
    const blurred = sctx.getImageData(
      clamp(Math.round((sx - bx) * scale), 0, soft.width - dw),
      clamp(Math.round((sy - by) * scale), 0, soft.height - dh),
      dw,
      dh
    )
    // Los tres canales de color; el cuarto es la opacidad y no se toca. El
    // recorte a 0..255 lo haría igual el propio Uint8ClampedArray, pero escrito
    // se lee lo que pasa en un realce fuerte: el blanco se queda en blanco.
    const a = sharp.data
    const b = blurred.data
    for (let i = 0; i < a.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const flat = b[i + c] ?? 0
        const orig = a[i + c] ?? 0
        a[i + c] = clamp(orig + amount * (orig - flat), 0, 255)
      }
    }
    ctx.putImageData(sharp, 0, 0)
  }, [visible, amount, radius, fit, zoom])

  // Se rehace en cada cuadro nuevo, así que avanzar con J y K deja el realce
  // vivo sobre el fotograma que se acaba de pedir. Y en cada paso de zoom o de
  // paneo, porque de eso depende qué región es y a qué escala se está viendo.
  //
  // Va en un cuadro de animación para que una rueda girada rápido no encadene
  // veinte pasadas de realce que ya nadie va a ver: sólo sobrevive la última.
  useEffect(() => {
    if (playing || !focus) return
    const raf = requestAnimationFrame(renderFocus)
    return () => cancelAnimationFrame(raf)
  }, [renderFocus, playing, focus, time, src])

  // Al soltar el arrastre hay que pedirlo a mano: el paneo terminó sin cambiar
  // nada de lo que el efecto vigila, y la franja que quedó fuera sigue cruda.
  useEffect(() => {
    focusRef.current = renderFocus
  }, [renderFocus])

  // --- Teclado ------------------------------------------------------------

  useEffect(() => {
    if (!active) return

    /* El zoom fino se pide en puntos porcentuales de la escala efectiva, que es
       la unidad en la que están escritos los topes y la barra: pedirlo en pasos
       de zoom haría que un punto valiera distinto en cada archivo. */
    const stepZoom = (points: number): void =>
      zoomTo((Math.round(fit * zoom * 100) + points) / 100 / fit)

    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      // Un control enfocado se queda con sus propias teclas: la barra de tiempo
      // necesita las flechas y un botón necesita el espacio.
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (typing && e.key.startsWith('Arrow')) return
      if ((typing || tag === 'BUTTON') && e.key === ' ') return

      switch (e.key.toLowerCase()) {
        case ' ':
        // La misma orden en la tecla que la tiene por convención y en la inicial
        // de lo que hace. El espacio se lo disputan los botones enfocados; la P
        // no se la disputa nadie.
        case 'p':
          togglePlay()
          break
        // El sistema repite la tecla mientras está hundida; esas repeticiones se
        // ignoran porque la marcha ya la lleva el temporizador de `press`.
        case 'j':
          if (!e.repeat) press(-1)
          break
        case 'k':
          if (!e.repeat) press(1)
          break
        // Las flechas no saltan aquí: apuntan. El salto se cobra en el keyup.
        case 'arrowleft':
          if (!e.repeat) pressJump(-1, e.shiftKey)
          break
        case 'arrowright':
          if (!e.repeat) pressJump(1, e.shiftKey)
          break
        // El volumen sí obedece a la repetición del sistema, con un paso más
        // corto: es una rampa que se oye mientras sube, no una distancia que
        // haya que apuntar antes de recorrerla.
        //
        // Con Mayúsculas, zoom de a un punto — la misma regla que en las flechas
        // de al lado: la tecla sola da el paso ancho y Mayúsculas da el fino.
        // Un punto porcentual es el mismo escalón que da la barra de zoom, así
        // que el número de la barra y el del teclado no pueden desalinearse.
        case 'arrowup':
          if (e.shiftKey) {
            stepZoom(1)
            break
          }
          setVolume((v) => clamp(v + (e.repeat ? VOLUME_HELD : VOLUME_STEP), 0, 1))
          // Subir el volumen de algo callado es querer oírlo.
          setMuted(false)
          break
        case 'arrowdown':
          if (e.shiftKey) {
            stepZoom(-1)
            break
          }
          setVolume((v) => clamp(v - (e.repeat ? VOLUME_HELD : VOLUME_STEP), 0, 1))
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

    const onKeyUp = (e: KeyboardEvent): void => {
      const key = e.key.toLowerCase()
      if (key === 'j' || key === 'k') release()
      if (key === 'arrowleft' || key === 'arrowright') releaseJump()
    }

    // Al perder la ventana no llega el keyup: la marcha se quedaría corriendo y
    // el salto apuntado se quedaría colgado en la pantalla sin cobrarse nunca.
    // Se cobra, no se descarta — la distancia ya se pidió.
    const onBlur = (): void => {
      release()
      releaseJump()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [active, togglePlay, press, release, pressJump, releaseJump, seekBy, zoomTo, zoom, fit])

  // Salir del módulo con un salto a medio apuntar lo cobra: es la misma regla
  // que al perder la ventana, y deja el contador en cero para la próxima vez.
  useEffect(() => {
    if (!active) releaseJump()
  }, [active, releaseJump])

  // --- Vista --------------------------------------------------------------

  const zoomPercent = Math.round(fit * zoom * 100)
  const savedName = saved?.path.split(/[\\/]/).pop() ?? ''
  /* El tamaño de lo que se va a guardar, dicho antes de guardarlo: es la
     diferencia entre un recorte elegido y un recorte descubierto después. */
  const shot = ((): Point => {
    const w = Math.max(1, Math.round(visible.w * media.x))
    const h = Math.max(1, Math.round(visible.h * media.y))
    const k = Math.max(1, CAPTURE_MIN_LONG_SIDE / Math.max(w, h))
    return { x: Math.max(1, Math.round(w * k)), y: Math.max(1, Math.round(h * k)) }
  })()

  /**
   * El botón de paso, con sus dos formas de accionarse.
   *
   * Por puntero lo lleva `press`, que ya distingue el toque del sostenido, y el
   * clic que viene detrás no debe cobrar un segundo cuadro. Por teclado no hay
   * puntero que valga y el clic es lo único que llega, así que tiene que contar.
   *
   * Los separa `detail`, que es cuántas veces se pulsó: un clic real trae 1 o
   * más y uno sintetizado por Intro o espacio sobre un botón enfocado trae 0.
   * Sin estado propio, que es lo que importa — una bandera se quedaría trabada
   * el día que se suelte el puntero fuera del botón y el clic no llegue.
   */
  const stepButton = (
    dir: number
  ): {
    onPointerDown: (e: ReactPointerEvent) => void
    onPointerUp: () => void
    onPointerCancel: () => void
    onClick: (e: { detail: number }) => void
  } => ({
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      press(dir)
    },
    onPointerUp: () => release(),
    onPointerCancel: () => release(),
    onClick: (e) => {
      if (e.detail !== 0) return
      stepFrame(dir)
    }
  })

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
          if (dragRef.current?.id !== e.pointerId) return
          dragRef.current = null
          // El paneo terminó: aquí se cobra el realce que el arrastre aplazó.
          focusRef.current()
        }}
        onPointerCancel={() => {
          dragRef.current = null
          focusRef.current()
        }}
      >
        {src && (
          <div
            ref={frameRef}
            className={`stage-frame${unplayable ? ' is-blank' : ''}`}
            style={{
              width: shown.x ? `${shown.x}px` : undefined,
              height: shown.y ? `${shown.y}px` : undefined,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
          >
            <video
              ref={videoRef}
              src={src}
              // Sin esto el lienzo de captura queda «sucio» y el navegador prohíbe
              // exportarlo: el fotograma se vería y no se podría guardar. El
              // recuadro de enfoque lee del mismo lienzo y depende de lo mismo.
              crossOrigin="anonymous"
              preload="auto"
              className="stage-video"
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

            {/* Sin `style`: el sitio lo escribe `renderFocus` sobre el elemento,
                junto con el contenido. Un `style` aquí lo pisaría en cada render
                de React y devolvería el lienzo a la esquina. */}
            {focus && !playing && !unplayable && <canvas ref={canvasRef} className="focus-layer" />}
          </div>
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
            {saved.crop ? 'Recorte guardado como' : 'Fotograma guardado como'}{' '}
            <code>{savedName}</code>{' '}
            <button
              type="button"
              className="link"
              onClick={() => void window.videoscaler.revealInFolder(saved.path)}
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
            aria-keyshortcuts="Space P"
            title={playing ? 'Pausar (espacio o P)' : 'Reproducir (espacio o P)'}
          >
            {playing ? <IconPause aria-hidden="true" /> : <IconPlay aria-hidden="true" />}
          </button>

          {/* El atajo va escrito en la tecla, no en una ayuda aparte: es la
              única forma de que alguien lo descubra sin buscarlo. */}
          <button
            type="button"
            className="tkey"
            aria-label="Un cuadro atrás; sostener para retroceder al 15 %"
            aria-keyshortcuts="j"
            title="Un cuadro atrás (J) — sostener para retroceder al 15 %"
            {...stepButton(-1)}
          >
            <IconStepBack aria-hidden="true" />
            <kbd>J</kbd>
          </button>
          <button
            type="button"
            className="tkey"
            aria-label="Un cuadro adelante; sostener para avanzar al 15 %"
            aria-keyshortcuts="k"
            title="Un cuadro adelante (K) — sostener para avanzar al 15 %"
            {...stepButton(1)}
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
            /* El único sitio donde el salto de las flechas está escrito: no hay
               un botón de «adelantar» en cuya cara ponerlo, y la barra de tiempo
               es el mando que hace lo mismo con la mano. Sin `aria-keyshortcuts`
               — enfocada, sus flechas son las suyas y valen un cuadro. */
            title="Flechas: 5 s — sostenerlas acumula y salta al soltar; con Mayúsculas, 1 s. Con la barra enfocada, un cuadro."
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

          {/* La segunda mitad del reloj dice cuánto dura el video — salvo
              mientras las flechas apuntan una distancia, y entonces dice esa
              distancia. Ocupa el mismo sitio a propósito: un contador que
              apareciera al lado empujaría la barra de tiempo justo mientras se
              la está usando, y el número saltaría por la pantalla. */}
          <span className="tcode">
            <strong>{formatTimecode(time)}</strong>
            {skip !== 0 ? (
              <span className="tcode-skip">
                {skip > 0 ? '+' : '−'}
                {Math.round(Math.abs(skip))} s
              </span>
            ) : (
              <span className="tcode-total">/ {formatTimecode(duration)}</span>
            )}
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
              <input
                className="zoom-range"
                type="range"
                min={floorPct}
                max={ceilPct}
                step={1}
                value={clamp(zoomPercent, floorPct, ceilPct)}
                aria-label="Zoom"
                aria-valuetext={`${zoomPercent} %`}
                /* Como en la barra de tiempo: el único sitio donde están
                   escritas las teclas del zoom es el mando que hace lo mismo. */
                title="Rueda sobre la imagen; − y + de a 25 %; Mayúsculas con flecha arriba o abajo, de a 1 %"
                onChange={(e) => zoomTo(Number(e.target.value) / 100 / fit)}
              />
              <span className="zoom-v" aria-live="polite" aria-atomic="true">
                {zoomPercent} %
              </span>
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
              aria-keyshortcuts="ArrowUp ArrowDown"
              title="Volumen (flechas arriba y abajo)"
              aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} %`}
              onChange={(e) => {
                setVolume(Number(e.target.value))
                setMuted(false)
              }}
            />
          </div>

          {/*
            Un interruptor, no una herramienta que armar. Encendido, todo lo que
            se ve sale realzado; apagado, no. Esa es también la comparación —
            encender y apagar es ver cuánto añadió — y por eso no hay un botón
            «Comparar» aparte diciendo lo mismo con otras palabras.

            Encenderlo con el video en marcha lo pausa: el realce necesita un
            fotograma quieto, y un interruptor encendido que no hace nada visible
            es exactamente lo que hace pensar que está roto.
          */}
          <button
            type="button"
            className={`tkey${focus ? ' is-on' : ''}`}
            disabled={unplayable || !src}
            aria-pressed={focus}
            onClick={() => {
              const next = !focus
              setFocus(next)
              if (next) videoRef.current?.pause()
            }}
            title="Devolver nitidez a lo que se ve: realza el borde que el zoom desdibuja, sobre la imagen detenida"
          >
            <IconFocus aria-hidden="true" />
            Enfocar
          </button>

          {/* Los dos mandos viven aquí, en la barra, y no en una hoja apoyada
              sobre la imagen: allí tapaban justo lo que se estaba mirando y,
              peor, el arrastre de la mesa les robaba el puntero — mover una
              barra paneaba el video y pulsar un botón no hacía nada. */}
          {focus && (
            <div className="tool">
              <label className="tool-set">
                <span className="mass-k">Fuerza</span>
                <input
                  className="tool-range"
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={amount}
                  aria-label="Fuerza del enfoque"
                  aria-valuetext={`${Math.round(amount * 100)} %`}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <label className="tool-set">
                <span className="mass-k">Radio</span>
                <input
                  className="tool-range"
                  type="range"
                  min={0.4}
                  max={4}
                  step={0.1}
                  value={radius}
                  aria-label="Radio del enfoque"
                  aria-valuetext={`${radius.toFixed(1)} píxeles`}
                  onChange={(e) => setRadius(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          {/* El foil va aquí porque aquí está lo único que este módulo escribe
              en el disco. En la otra pantalla lo lleva Comprimir; nunca hay dos
              a la vez, porque nunca hay dos módulos a la vez.

              El rótulo cambia con el zoom porque cambia lo que hace: prometer
              «fotograma» y escribir un recorte sería mentir en el único botón
              del módulo que toca el disco. */}
          <button
            type="button"
            className="act act-commit"
            disabled={!src || unplayable}
            onClick={() => void onCapture()}
            title={
              !media.x
                ? undefined
                : cropped
                  ? `Guarda sólo lo que se ve del cuadro ${frame}, a ${shot.x} × ${shot.y} px`
                  : `Guarda el cuadro ${frame} entero, a ${shot.x} × ${shot.y} px`
            }
          >
            {cropped ? 'Capturar lo visible' : 'Capturar fotograma'}
            <IconCamera aria-hidden="true" />
          </button>
        </div>
      </footer>
    </>
  )
}
