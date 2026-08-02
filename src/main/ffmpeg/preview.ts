import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import log from 'electron-log'
import { resolveFfmpeg } from './paths'

/**
 * Vista previa para lo que Chromium no sabe abrir.
 *
 * El motor de video del navegador entiende muchos menos contenedores que
 * FFmpeg: un MKV o un AVI con H.264 dentro se reproduce perfectamente en
 * cualquier reproductor y aquí no abre, no por el video sino por la caja.
 * Cambiar la caja sin tocar el video (`-c copy`) cuesta segundos y no pierde
 * un solo bit — el fotograma que se ve, y el que se captura, es el original.
 *
 * Se hace a petición y no de oficio: copiar los datos ocupa en disco lo mismo
 * que el archivo de entrada, y eso no se le hace a nadie por sorpresa.
 */

let current: ChildProcessWithoutNullStreams | null = null

function previewDir(): string {
  return join(app.getPath('temp'), 'videoscaler-vistaprevia')
}

/** Nombre estable por ruta+tamaño+fecha: si el archivo no cambió, se reusa. */
function previewName(path: string, size: number, mtimeMs: number): string {
  const hash = createHash('sha1').update(`${path}|${size}|${mtimeMs}`).digest('hex').slice(0, 16)
  return `${hash}.mp4`
}

function run(ffmpegPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true })
    current = child

    let stderrTail = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (data: string) => {
      stderrTail = (stderrTail + data).slice(-4000)
    })

    child.on('error', (err) => {
      current = null
      reject(err)
    })

    child.on('close', (code) => {
      current = null
      if (code === 0) resolve()
      else reject(new Error(stderrTail.trim() || `FFmpeg terminó con código ${code}`))
    })
  })
}

export async function makePreview(inputPath: string): Promise<string> {
  const env = await resolveFfmpeg()
  if (!env.ffmpegPath) throw new Error('No se encontró FFmpeg.')

  const source = await stat(inputPath)
  const dir = previewDir()
  const outputPath = join(dir, previewName(inputPath, source.size, source.mtimeMs))

  const existing = await stat(outputPath).catch(() => null)
  if (existing && existing.size > 0) return outputPath

  await mkdir(dir, { recursive: true })

  // Sólo la primera pista de video y la primera de audio: subtítulos, capítulos
  // y carátulas que un MKV lleva sin problema hacen fallar al muxer de MP4, y
  // ninguno de los tres hace falta para juzgar la imagen.
  const base = [
    '-y',
    '-i', inputPath,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-sn', '-dn',
    '-movflags', '+faststart'
  ]

  try {
    await run(env.ffmpegPath, [...base, '-c', 'copy', outputPath])
    return outputPath
  } catch (err) {
    log.info(`[vista previa] la copia directa falló, se recomprime el audio: ${String(err)}`)
    // El caso común del fallo es el audio, no la imagen: DTS o PCM no caben en
    // un MP4. Recomprimir sólo la pista de sonido sigue dejando el video intacto
    // y tarda poco más que la copia.
    await run(env.ffmpegPath, [...base, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', outputPath])
    return outputPath
  }
}

export function cancelPreview(): void {
  current?.kill('SIGKILL')
  current = null
}

/** Los temporales no sobreviven a la sesión: son copias enteras del original. */
export async function clearPreviews(): Promise<void> {
  cancelPreview()
  await rm(previewDir(), { recursive: true, force: true }).catch(() => undefined)
}
