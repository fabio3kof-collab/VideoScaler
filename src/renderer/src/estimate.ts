import type { EncodeOptions, MediaProbe, ScaleMode, VideoCodec } from '@shared/types'
import { audioKbpsFor, budgetForTargetSize, effectiveDuration } from '@shared/budget'

/**
 * Estimación de peso en vivo.
 *
 * Ningún modo se presenta como exacto. El de peso objetivo parece exacto pero
 * no lo es: el bitrate derivado tiene un piso, y cuando ese piso se activa el
 * archivo sale por encima de lo pedido. Presentar ese número como garantía
 * sería la mentira más cara de la pantalla, porque es justo el modo por
 * defecto y el que sostiene la promesa del producto.
 */

export type Confidence = 'calculated' | 'approximate'

/**
 * Qué tan holgado va el video con los bits que le tocan.
 *
 * En modo peso objetivo el peso final no se mueve — ese es el punto del modo —
 * así que esta es la lectura que sí cascadea: bajar la resolución, el fps o el
 * audio le deja más bits a cada píxel, y eso se ve aquí.
 */
export type Density = 'holgado' | 'justo' | 'apretado'

export interface WeightEstimate {
  bytes: number
  confidence: Confidence
  /** Fracción del peso original: 0.3 = quedará en el 30%. */
  ratio: number
  videoKbps: number
  audioKbps: number
  /** Sólo en modo peso objetivo: si los ajustes actuales alcanzan el objetivo. */
  reachable: boolean
  /** Sólo cuando no alcanza: cuánto pide el audio por sí solo, en bytes. */
  audioOnlyBytes: number
  density: Density
  /** Bits por píxel relativos a la referencia del códec. 1 = referencia. */
  headroom: number
}

/**
 * Cuántos bits recibe cada píxel, relativo a lo que ese códec necesita para su
 * calidad de referencia con este material. 1 = referencia; por debajo de 1 el
 * video va corto.
 *
 * Se devuelve el número y no sólo su cajón porque es la única lectura que
 * responde a cada paso de resolución, cuadros o audio cuando el peso está
 * fijado. En tres estados casi nunca cambia, y una palanca que no acusa el
 * golpe parece rota.
 */
function headroomOf(videoKbps: number, options: EncodeOptions, probe: MediaProbe): number {
  if (!probe.video) return 1
  const [w, h] = scaledPixels(options.video.scale, probe.video.width, probe.video.height)
  const fps = options.video.fps ?? probe.video.fps ?? 30
  const pixels = w * h * fps
  if (pixels <= 0) return 1
  const bpp = (videoKbps * 1000) / pixels
  return bpp / referenceBpp(options, probe)
}

function densityFrom(headroom: number): Density {
  if (headroom >= 1) return 'holgado'
  if (headroom >= 0.5) return 'justo'
  return 'apretado'
}

/** Eficiencia relativa a H.264 a igual calidad percibida. */
const CODEC_EFFICIENCY: Record<VideoCodec, number> = {
  h264: 1,
  h265: 0.62,
  av1: 0.5,
  vp9: 0.72
}

/** CRF de referencia por códec: el punto donde vale BPP_REFERENCE. */
const CRF_REFERENCE: Record<VideoCodec, number> = {
  h264: 23,
  h265: 28,
  av1: 35,
  vp9: 31
}

/**
 * Bits por píxel de H.264 medium en su CRF de referencia, sobre material de
 * complejidad media. Medido sobre codificaciones reales, no supuesto.
 */
const BPP_REFERENCE = 0.08

/** Cuántos puntos de CRF duplican el bitrate. Constante conocida de x264. */
const CRF_DOUBLING = 6

/**
 * Cuánto pesa el origen en la estimación por calidad.
 *
 * El modelo de bits por píxel solo — resolución, cuadros, códec, CRF — supone
 * material de complejidad media, y el contenido pesa más que todo lo demás
 * junto: a CRF 23, un plano fijo y un plano con grano se separan por un factor
 * de veinte. La única medida de complejidad que tenemos es el propio origen:
 * lo que le costó a *su* encoder decir lo mismo. Por eso el modelo se ancla en
 * él con un exponente en vez de ignorarlo.
 *
 * No va a 1 porque el bitrate del origen mezcla dos cosas que no podemos
 * separar: qué tan complejo es el material y qué tan generosa fue la
 * codificación con la que llegó. El recorte acota lo que puede pasar cuando esa
 * mezcla engaña: por debajo, un origen ya exprimido no implica que el
 * re-encode salga gratis; por encima, los bits de más del origen suelen ser
 * grano que un CRF normal tira a la basura.
 */
const COMPLEXITY_WEIGHT = 0.8
const COMPLEXITY_MIN = 0.15
const COMPLEXITY_MAX = 1.6

/**
 * Eficiencia del códec con el que llegó el archivo, para leer su bitrate en la
 * misma escala que el de salida. 2 Mbps de MPEG-4 y 2 Mbps de AV1 no describen
 * material igual de complejo.
 */
const SOURCE_EFFICIENCY: Record<string, number> = {
  h264: 1,
  avc1: 1,
  hevc: 0.62,
  h265: 0.62,
  av1: 0.5,
  vp9: 0.72,
  vp8: 1.1,
  theora: 1.2,
  wmv3: 1.3,
  mpeg4: 1.6,
  msmpeg4v3: 1.6,
  mpeg2video: 2.2
}

/** Bitrate de video del origen, con el peso total como red de seguridad. */
function sourceVideoKbps(probe: MediaProbe): number | null {
  if (probe.video?.bitrateKbps) return probe.video.bitrateKbps
  if (probe.durationSec > 0 && probe.sizeBytes > 0) {
    const totalKbps = (probe.sizeBytes * 8) / probe.durationSec / 1000
    const rest = totalKbps - (probe.audio?.bitrateKbps ?? (probe.audio ? 128 : 0))
    if (rest > 20) return rest
  }
  return null
}

/**
 * Cuánto se aparta el origen del material de complejidad media, ya acotado.
 * 1 = medio; 1.6 = todo lo complejo que el modelo se atreve a creer.
 */
function complexityFactor(probe: MediaProbe): number {
  const kbps = sourceVideoKbps(probe)
  if (kbps === null || !probe.video) return 1
  const pixels = probe.video.width * probe.video.height * (probe.video.fps || 30)
  if (pixels <= 0) return 1
  const bpp = (kbps * 1000) / pixels
  const reference = BPP_REFERENCE * (SOURCE_EFFICIENCY[probe.video.codec] ?? 1)
  if (reference <= 0) return 1
  return Math.min(
    COMPLEXITY_MAX,
    Math.max(COMPLEXITY_MIN, Math.pow(bpp / reference, COMPLEXITY_WEIGHT))
  )
}

/** Un preset más lento aprovecha mejor cada bit a igual calidad. */
const PRESET_EFFICIENCY: Record<string, number> = {
  ultrafast: 1.6,
  superfast: 1.4,
  veryfast: 1.2,
  faster: 1.1,
  fast: 1.05,
  medium: 1,
  slow: 0.93,
  slower: 0.89,
  veryslow: 0.86
}

/** Los encoders por hardware son más rápidos y menos eficientes por bit. */
const ACCEL_PENALTY = 1.25

/**
 * Los bits por píxel que este material necesita en el CRF de referencia de su
 * códec, con estos ajustes. Es la vara con la que se mide todo lo demás: de
 * aquí sale tanto la estimación por calidad como la lectura de holgura, para
 * que no puedan contradecirse.
 */
function referenceBpp(options: EncodeOptions, probe: MediaProbe): number {
  const { video } = options
  return (
    BPP_REFERENCE *
    CODEC_EFFICIENCY[video.codec] *
    (PRESET_EFFICIENCY[video.preset] ?? 1) *
    (video.hardwareAccel === 'none' ? 1 : ACCEL_PENALTY) *
    complexityFactor(probe)
  )
}

/**
 * Mismo truncamiento a par que aplica el filtro de escalado (`trunc(iw*f/2)*2`
 * en args.ts), porque muchos códecs exigen dimensiones pares. Redondear aquí
 * haría que la ventana prometa un alto impar que el archivo nunca va a tener,
 * y con una barra de resolución continua esa diferencia se ve en cada paso.
 */
function even(n: number): number {
  return Math.max(2, Math.trunc(n / 2) * 2)
}

export function scaledPixels(scale: ScaleMode, width: number, height: number): [number, number] {
  switch (scale.kind) {
    case 'original':
      return [width, height]
    case 'percent': {
      const f = Math.max(1, Math.min(100, scale.percent)) / 100
      if (f === 1) return [width, height]
      return [even(width * f), even(height * f)]
    }
    case 'height': {
      const ratio = width / height
      return [even(scale.height * ratio), scale.height]
    }
    case 'width': {
      const ratio = height / width
      return [scale.width, even(scale.width * ratio)]
    }
    case 'exact':
      return [scale.width, scale.height]
  }
}

export function estimateWeight(options: EncodeOptions, probe: MediaProbe): WeightEstimate | null {
  if (!probe.video || probe.durationSec <= 0) return null

  const duration = effectiveDuration(options, probe)
  const aKbps = audioKbpsFor(options, probe)
  const { video } = options
  const audioOnlyBytes = (aKbps * 1000 * duration) / 8

  if (video.rateMode === 'targetSize') {
    const budget = budgetForTargetSize(options, probe)
    const headroom = headroomOf(budget.videoKbps, options, probe)
    return {
      bytes: budget.bytes,
      // Ni siquiera este modo es exacto: el control de tasa de FFmpeg se
      // desvía, y el piso de bitrate puede empujar el archivo por encima.
      confidence: 'calculated',
      ratio: probe.sizeBytes > 0 ? budget.bytes / probe.sizeBytes : 0,
      videoKbps: budget.videoKbps,
      audioKbps: Math.round(budget.audioKbps),
      reachable: budget.reachable,
      audioOnlyBytes,
      density: densityFrom(headroom),
      headroom
    }
  }

  let vKbps: number
  let confidence: Confidence

  if (video.rateMode === 'bitrate') {
    vKbps = video.bitrateKbps
    confidence = 'calculated'
  } else {
    const [w, h] = scaledPixels(video.scale, probe.video.width, probe.video.height)
    const fps = video.fps ?? probe.video.fps ?? 30
    const steps = (CRF_REFERENCE[video.codec] - video.quality) / CRF_DOUBLING
    const bpp = referenceBpp(options, probe) * Math.pow(2, steps)
    vKbps = Math.max(50, (w * h * fps * bpp) / 1000)
    confidence = 'approximate'
  }

  const bytes = ((vKbps + aKbps) * 1000 * duration) / 8
  const headroom = headroomOf(vKbps, options, probe)
  return {
    bytes,
    confidence,
    ratio: probe.sizeBytes > 0 ? bytes / probe.sizeBytes : 0,
    videoKbps: Math.round(vKbps),
    audioKbps: Math.round(aKbps),
    reachable: true,
    audioOnlyBytes,
    density: densityFrom(headroom),
    headroom
  }
}
