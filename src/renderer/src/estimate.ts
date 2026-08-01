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
}

function densityOf(
  videoKbps: number,
  options: EncodeOptions,
  probe: MediaProbe
): Density {
  if (!probe.video) return 'justo'
  const [w, h] = scaledPixels(options.video.scale, probe.video.width, probe.video.height)
  const fps = options.video.fps ?? probe.video.fps ?? 30
  const pixels = w * h * fps
  if (pixels <= 0) return 'justo'
  const bpp = (videoKbps * 1000) / pixels
  const reference =
    BPP_REFERENCE *
    CODEC_EFFICIENCY[options.video.codec] *
    (PRESET_EFFICIENCY[options.video.preset] ?? 1)
  const ratio = bpp / reference
  if (ratio >= 1) return 'holgado'
  if (ratio >= 0.5) return 'justo'
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

/** Bits por píxel de H.264 en su CRF de referencia. Constante sin calibrar. */
const BPP_REFERENCE = 0.085

/** Cuántos puntos de CRF duplican el bitrate. Constante conocida de x264. */
const CRF_DOUBLING = 6

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

export function scaledPixels(scale: ScaleMode, width: number, height: number): [number, number] {
  switch (scale.kind) {
    case 'original':
      return [width, height]
    case 'percent': {
      const f = Math.max(1, Math.min(100, scale.percent)) / 100
      return [Math.round(width * f), Math.round(height * f)]
    }
    case 'height': {
      const ratio = width / height
      return [Math.round(scale.height * ratio), scale.height]
    }
    case 'width': {
      const ratio = height / width
      return [scale.width, Math.round(scale.width * ratio)]
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
      density: densityOf(budget.videoKbps, options, probe)
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
    const bpp =
      BPP_REFERENCE *
      Math.pow(2, steps) *
      CODEC_EFFICIENCY[video.codec] *
      (PRESET_EFFICIENCY[video.preset] ?? 1) *
      (video.hardwareAccel === 'none' ? 1 : ACCEL_PENALTY)
    vKbps = Math.max(50, (w * h * fps * bpp) / 1000)
    confidence = 'approximate'
  }

  const bytes = ((vKbps + aKbps) * 1000 * duration) / 8
  return {
    bytes,
    confidence,
    ratio: probe.sizeBytes > 0 ? bytes / probe.sizeBytes : 0,
    videoKbps: Math.round(vKbps),
    audioKbps: Math.round(aKbps),
    reachable: true,
    audioOnlyBytes,
    density: densityOf(vKbps, options, probe)
  }
}
