import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'
import type { FfmpegStatus } from '@shared/types'

const execFileAsync = promisify(execFile)
// El main se compila a ESM; `require` no existe, pero lo necesitamos para
// cargar módulos opcionales sin romper el arranque si faltan.
const require = createRequire(import.meta.url)

/**
 * Resolución en tres niveles, a propósito.
 *
 * La app se distribuye con FFmpeg empaquetado, pero no queremos que un fallo de
 * empaquetado la deje inservible: si el binario propio no está, caemos al del
 * módulo de node y luego al del PATH del sistema. El usuario siempre puede
 * comprimir si tiene FFmpeg de alguna forma.
 */

const exe = process.platform === 'win32' ? '.exe' : ''

function bundledDir(): string {
  // En producción los binarios viajan fuera del asar (ver asarUnpack).
  return app.isPackaged
    ? join(process.resourcesPath, 'ffmpeg')
    : join(app.getAppPath(), 'resources', 'ffmpeg')
}

function fromBundle(name: string): string | null {
  const candidate = join(bundledDir(), `${name}${exe}`)
  return existsSync(candidate) ? candidate : null
}

function fromModule(name: 'ffmpeg' | 'ffprobe'): string | null {
  // Import perezoso: estos módulos son opcionales y pueden no estar instalados.
  try {
    if (name === 'ffmpeg') {
      const mod = require('ffmpeg-static') as string | { default: string }
      const p = typeof mod === 'string' ? mod : mod.default
      // En producción la ruta apunta dentro del asar; hay que desempaquetarla.
      const unpacked = p?.replace('app.asar', 'app.asar.unpacked')
      return unpacked && existsSync(unpacked) ? unpacked : null
    }
    const mod = require('ffprobe-static') as { path: string }
    const unpacked = mod.path?.replace('app.asar', 'app.asar.unpacked')
    return unpacked && existsSync(unpacked) ? unpacked : null
  } catch {
    return null
  }
}

async function fromSystem(name: string): Promise<string | null> {
  try {
    await execFileAsync(name, ['-version'], { timeout: 5000 })
    return name
  } catch {
    return null
  }
}

let cached: FfmpegStatus | null = null

export async function resolveFfmpeg(force = false): Promise<FfmpegStatus> {
  if (cached && !force) return cached

  let source: FfmpegStatus['source'] = null
  let ffmpegPath = fromBundle('ffmpeg')
  let ffprobePath = fromBundle('ffprobe')
  if (ffmpegPath) source = 'bundled'

  if (!ffmpegPath) {
    ffmpegPath = fromModule('ffmpeg')
    ffprobePath = ffprobePath ?? fromModule('ffprobe')
    if (ffmpegPath) source = 'module'
  }

  if (!ffmpegPath) {
    ffmpegPath = await fromSystem('ffmpeg')
    ffprobePath = ffprobePath ?? (await fromSystem('ffprobe'))
    if (ffmpegPath) source = 'system'
  }

  let version: string | null = null
  if (ffmpegPath) {
    try {
      const { stdout } = await execFileAsync(ffmpegPath, ['-version'], { timeout: 8000 })
      version = stdout.split('\n')[0]?.trim() ?? null
    } catch {
      version = null
    }
  }

  cached = {
    available: Boolean(ffmpegPath && ffprobePath),
    ffmpegPath,
    ffprobePath,
    source,
    version
  }
  return cached
}
