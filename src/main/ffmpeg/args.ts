import type {
  EncodeOptions,
  HardwareAccel,
  MediaProbe,
  ScaleMode,
  VideoCodec
} from '@shared/types'
import { budgetForTargetSize, effectiveDuration as sharedDuration } from '@shared/budget'

/**
 * Traduce las opciones del usuario a argumentos de FFmpeg.
 *
 * Está separado del runner a propósito: esta es la lógica de compresión real y
 * conviene poder razonarla (y testearla) sin lanzar un proceso.
 */

const SOFTWARE_ENCODER: Record<VideoCodec, string> = {
  h264: 'libx264',
  h265: 'libx265',
  av1: 'libsvtav1',
  vp9: 'libvpx-vp9'
}

const HW_ENCODER: Record<string, string | undefined> = {
  'h264:nvenc': 'h264_nvenc',
  'h265:nvenc': 'hevc_nvenc',
  'av1:nvenc': 'av1_nvenc',
  'h264:qsv': 'h264_qsv',
  'h265:qsv': 'hevc_qsv',
  'av1:qsv': 'av1_qsv',
  'h264:amf': 'h264_amf',
  'h265:amf': 'hevc_amf',
  'av1:amf': 'av1_amf'
}

/** El binario que codifica, dicho en las dos únicas cosas que lo deciden. Está
    separado de `resolveEncoder` porque el montaje elige códec sin tener unas
    `EncodeOptions` completas detrás. */
export function encoderFor(codec: VideoCodec, hardwareAccel: HardwareAccel): string {
  if (hardwareAccel !== 'none') {
    const hw = HW_ENCODER[`${codec}:${hardwareAccel}`]
    if (hw) return hw
  }
  return SOFTWARE_ENCODER[codec]
}

export function resolveEncoder(options: EncodeOptions): string {
  return encoderFor(options.video.codec, options.video.hardwareAccel)
}

/** Filtro de escalado. Fuerza dimensiones pares: muchos códecs las exigen. */
function scaleFilter(scale: ScaleMode): string | null {
  switch (scale.kind) {
    case 'original':
      return null
    case 'percent': {
      const f = Math.max(1, Math.min(100, scale.percent)) / 100
      if (f === 1) return null
      return `scale=trunc(iw*${f}/2)*2:trunc(ih*${f}/2)*2`
    }
    case 'height':
      return `scale=-2:${Math.round(scale.height)}`
    case 'width':
      return `scale=${Math.round(scale.width)}:-2`
    case 'exact':
      return `scale=${Math.round(scale.width)}:${Math.round(scale.height)}`
  }
}

/** Duración que realmente se codifica, después del recorte. */
export const effectiveDuration = sharedDuration

export function qualityFlag(encoder: string, quality: number): string[] {
  if (encoder.endsWith('_nvenc')) return ['-rc', 'vbr', '-cq', String(quality)]
  if (encoder.endsWith('_qsv')) return ['-global_quality', String(quality)]
  if (encoder.endsWith('_amf')) return ['-rc', 'cqp', '-qp_i', String(quality), '-qp_p', String(quality)]
  if (encoder === 'libvpx-vp9') return ['-crf', String(quality), '-b:v', '0']
  return ['-crf', String(quality)]
}

export function presetFlag(encoder: string, preset: string): string[] {
  // SVT-AV1 usa presets numéricos (0 lento / 13 rápido), no nombres.
  if (encoder === 'libsvtav1') {
    const map: Record<string, string> = {
      ultrafast: '12',
      superfast: '11',
      veryfast: '10',
      faster: '9',
      fast: '8',
      medium: '6',
      slow: '4',
      slower: '3',
      veryslow: '1'
    }
    return ['-preset', map[preset] ?? '6']
  }
  if (encoder === 'libvpx-vp9') {
    const fast = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast'].includes(preset)
    return ['-cpu-used', fast ? '4' : '1', '-row-mt', '1']
  }
  if (encoder.includes('_')) return [] // los encoders por hardware usan otra escala
  return ['-preset', preset]
}

function audioArgs(options: EncodeOptions): string[] {
  const { audio } = options
  if (audio.mode === 'mute') return ['-an']
  if (audio.mode === 'copy') return ['-c:a', 'copy']

  const codecMap = { aac: 'aac', opus: 'libopus', mp3: 'libmp3lame' }
  const args = ['-c:a', codecMap[audio.codec], '-b:a', `${audio.bitrateKbps}k`]
  if (audio.channels !== null) args.push('-ac', String(audio.channels))
  if (audio.sampleRate !== null) args.push('-ar', String(audio.sampleRate))
  return args
}

export interface BuiltCommand {
  /** Una entrada por pasada. Dos entradas = codificación en dos pasadas. */
  passes: string[][]
  /** Bitrate de video resuelto, para mostrarle al usuario qué se decidió. */
  resolvedVideoKbps: number | null
}

export function buildEncodeArgs(
  inputPath: string,
  outputPath: string,
  options: EncodeOptions,
  probe: MediaProbe,
  /**
   * Prefijo del log de estadísticas de dos pasadas. Debe ser una ruta
   * escribible: sin esto FFmpeg lo escribe en el CWD del proceso, que en la
   * app instalada es la carpeta de instalación y suele ser de sólo lectura.
   */
  passLogPrefix?: string
): BuiltCommand {
  const encoder = resolveEncoder(options)
  const { video } = options

  const filters: string[] = []
  const scale = scaleFilter(video.scale)
  if (scale) filters.push(scale)
  if (video.fps !== null) filters.push(`fps=${video.fps}`)

  // El modo por peso objetivo también se codifica por bitrate; sólo cambia
  // de dónde sale el número.
  const usesBitrate = video.rateMode === 'bitrate' || video.rateMode === 'targetSize'
  const resolvedVideoKbps = usesBitrate
    ? video.rateMode === 'targetSize'
      ? budgetForTargetSize(options, probe).videoKbps
      : video.bitrateKbps
    : null

  const base: string[] = ['-hide_banner', '-y']

  if (options.trim) {
    // Antes de -i para que el salto sea rápido (busca por keyframe).
    base.push('-ss', String(options.trim.startSec))
  }
  base.push('-i', inputPath)
  if (options.trim?.endSec != null) {
    base.push('-t', String(options.trim.endSec - options.trim.startSec))
  }

  const videoArgs: string[] = ['-c:v', encoder]
  if (filters.length > 0) videoArgs.push('-vf', filters.join(','))

  if (resolvedVideoKbps !== null) {
    videoArgs.push('-b:v', `${resolvedVideoKbps}k`)
    videoArgs.push('-maxrate', `${Math.round(resolvedVideoKbps * 1.5)}k`)
    videoArgs.push('-bufsize', `${resolvedVideoKbps * 2}k`)
  } else {
    videoArgs.push(...qualityFlag(encoder, video.quality))
  }
  videoArgs.push(...presetFlag(encoder, video.preset))

  const tail: string[] = []
  if (options.stripMetadata) tail.push('-map_metadata', '-1')
  if (options.faststart && options.container === 'mp4') tail.push('-movflags', '+faststart')
  // Progreso legible por máquina en stdout; deja stderr para errores reales.
  tail.push('-progress', 'pipe:1', '-nostats')

  // Dos pasadas sólo tiene sentido con bitrate fijo: la primera pasada mide
  // dónde poner los bits, la segunda los reparte.
  const canTwoPass = video.twoPass && resolvedVideoKbps !== null && !encoder.includes('_')

  if (canTwoPass) {
    const nullSink = process.platform === 'win32' ? 'NUL' : '/dev/null'
    const passLog = passLogPrefix ? ['-passlogfile', passLogPrefix] : []
    return {
      resolvedVideoKbps,
      passes: [
        [...base, ...videoArgs, '-pass', '1', ...passLog, '-an', '-f', 'null', ...tail, nullSink],
        [...base, ...videoArgs, '-pass', '2', ...passLog, ...audioArgs(options), ...tail, outputPath]
      ]
    }
  }

  return {
    resolvedVideoKbps,
    passes: [[...base, ...videoArgs, ...audioArgs(options), ...tail, outputPath]]
  }
}
