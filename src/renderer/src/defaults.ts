import type { EncodeOptions, VideoCodec } from '@shared/types'

/**
 * Rangos de calidad por códec. No son intercambiables: un CRF 23 en H.264 y un
 * 23 en AV1 no significan lo mismo, y presentarlos como una sola escala
 * engañaría al usuario sobre lo que está eligiendo.
 */
export const QUALITY_RANGE: Record<VideoCodec, { min: number; max: number; default: number }> = {
  h264: { min: 0, max: 51, default: 23 },
  h265: { min: 0, max: 51, default: 28 },
  av1: { min: 0, max: 63, default: 35 },
  vp9: { min: 0, max: 63, default: 31 }
}

export const DEFAULT_OPTIONS: EncodeOptions = {
  container: 'mp4',
  video: {
    codec: 'h264',
    // El peso objetivo arranca seleccionado a propósito: el usuario llega con
    // una restricción de espacio, no con una opinión sobre el CRF.
    rateMode: 'targetSize',
    quality: QUALITY_RANGE.h264.default,
    bitrateKbps: 2500,
    targetSizeMB: 25,
    preset: 'medium',
    twoPass: false,
    scale: { kind: 'original' },
    fps: null,
    hardwareAccel: 'none'
  },
  audio: {
    mode: 'encode',
    codec: 'aac',
    bitrateKbps: 128,
    channels: null,
    sampleRate: null
  },
  trim: null,
  stripMetadata: false,
  faststart: true
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`
}

/**
 * La misma cifra en kilobytes, para poner debajo.
 *
 * «4.9 MB» redondea a la décima, y una décima de megabyte son cien kilobytes:
 * dos ajustes seguidos pueden mover el archivo sin mover el número. Los KB son
 * la cifra fina que sí acusa el cambio.
 *
 * Devuelve `null` cuando el peso no llega al megabyte, porque ahí `formatBytes`
 * ya está diciendo KB y repetirlo debajo no añade nada.
 */
export function formatKilobytes(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 1024 * 1024) return null
  // Espacio fino como separador de miles y no punto: al lado de un «4.9 MB»
  // donde el punto es decimal, «5.008 KB» se lee como cinco.
  const kb = Math.round(bytes / 1024)
  return `${kb.toLocaleString('es-ES').replaceAll('.', ' ')} KB`
}

/**
 * m:ss.cc — el reloj del reproductor.
 *
 * Aparte de `formatDuration` y no en vez de él: una duración se lee en
 * segundos enteros, pero quien avanza cuadro a cuadro necesita ver moverse algo
 * más fino que el segundo, o el botón parece no hacer nada.
 */
export function formatTimecode(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${h > 0 ? `${h}:${pad(m)}` : m}:${pad(s)}.${pad(cs)}`
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}
