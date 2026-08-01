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

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}
