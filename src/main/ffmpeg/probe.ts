import { execFile } from 'node:child_process'
import { basename, extname } from 'node:path'
import { stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { AudioStreamInfo, MediaProbe, VideoStreamInfo } from '@shared/types'
import { resolveFfmpeg } from './paths'

const execFileAsync = promisify(execFile)

interface RawStream {
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
  r_frame_rate?: string
  avg_frame_rate?: string
  bit_rate?: string
  pix_fmt?: string
  channels?: number
  sample_rate?: string
}

interface RawProbe {
  streams?: RawStream[]
  format?: { duration?: string; format_name?: string; bit_rate?: string }
}

/** "30000/1001" -> 29.97. Devuelve 0 ante entradas inservibles. */
function parseRational(value: string | undefined): number {
  if (!value) return 0
  const [num, den] = value.split('/')
  const n = Number(num)
  const d = den === undefined ? 1 : Number(den)
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return 0
  return n / d
}

function toKbps(bitRate: string | undefined): number | null {
  const n = Number(bitRate)
  return Number.isFinite(n) && n > 0 ? Math.round(n / 1000) : null
}

export async function probeMedia(path: string): Promise<MediaProbe> {
  const env = await resolveFfmpeg()
  if (!env.ffprobePath) {
    throw new Error('No se encontró ffprobe. Instala FFmpeg o reinstala la aplicación.')
  }

  const { stdout } = await execFileAsync(
    env.ffprobePath,
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
    { timeout: 30_000, maxBuffer: 8 * 1024 * 1024 }
  )

  const raw = JSON.parse(stdout) as RawProbe
  const streams = raw.streams ?? []
  const v = streams.find((s) => s.codec_type === 'video')
  const a = streams.find((s) => s.codec_type === 'audio')
  const { size } = await stat(path)

  const video: VideoStreamInfo | null = v
    ? {
        codec: v.codec_name ?? 'desconocido',
        width: v.width ?? 0,
        height: v.height ?? 0,
        fps: parseRational(v.avg_frame_rate || v.r_frame_rate),
        bitrateKbps: toKbps(v.bit_rate),
        pixFmt: v.pix_fmt ?? null
      }
    : null

  const audio: AudioStreamInfo | null = a
    ? {
        codec: a.codec_name ?? 'desconocido',
        channels: a.channels ?? 0,
        sampleRate: Number(a.sample_rate) || 0,
        bitrateKbps: toKbps(a.bit_rate)
      }
    : null

  return {
    path,
    filename: basename(path),
    sizeBytes: size,
    durationSec: Number(raw.format?.duration) || 0,
    container: (raw.format?.format_name ?? extname(path).replace('.', '')).split(',')[0] ?? '',
    video,
    audio
  }
}
