import { stat } from 'node:fs/promises'
import type { EditProject, RenderOptions } from '@shared/edit'
import { clipEnd, clipLength, projectDuration } from '@shared/edit'
import type { JobProgress, JobResult } from '@shared/types'
import { encoderFor, presetFlag, qualityFlag } from './args'
import { runPass } from './encode'
import { resolveFfmpeg } from './paths'

/**
 * El montaje, traducido a una sola orden de FFmpeg.
 *
 * No se escriben trozos intermedios en el disco y luego se pegan: eso serían
 * dos codificaciones por bloque — una para el trozo y otra para el pegado — y
 * el usuario pagaría dos veces la misma pérdida de calidad. Aquí cada bloque es
 * una *entrada* con su `-ss` y su `-t`, y el `filter_complex` los pone en fila
 * (`concat`) y mezcla el sonido (`amix`) antes de codificar una única vez.
 *
 * Una entrada por bloque, y no una por archivo, es a propósito: `-ss` antes de
 * `-i` hace que FFmpeg salte por el índice del contenedor en vez de decodificar
 * desde el principio y tirar lo que sobra. Con diez cortes de un video de una
 * hora, la diferencia es entre minutos y horas. El precio es abrir el mismo
 * archivo diez veces, que es barato.
 */

const AUDIO_ENCODER = { aac: 'aac', opus: 'libopus', mp3: 'libmp3lame' } as const

/** Tres decimales: FFmpeg acepta segundos con coma flotante y un milisegundo
    es más fino que cualquier cuadro. */
function secs(n: number): string {
  return Math.max(0, n).toFixed(3)
}

export interface BuiltRender {
  args: string[]
  /** Lo que va a durar el archivo escrito, para el porcentaje. */
  durationSec: number
  /** Cuántos archivos distintos entran en el montaje. */
  sourceCount: number
}

/**
 * Construye la orden. Separado del runner por la misma razón que `args.ts`: es
 * la lógica de verdad del módulo y conviene poder leerla sin lanzar un proceso.
 */
export function buildRenderArgs(
  project: EditProject,
  options: RenderOptions,
  outputPath: string
): BuiltRender {
  const sources = new Map(project.sources.map((s) => [s.id, s]))
  const usable = project.clips.filter((c) => clipLength(c) > 0.02 && sources.has(c.sourceId))
  const video = usable.filter((c) => c.kind === 'video').sort((a, b) => a.startSec - b.startSec)
  // El sonido no se ordena: se mezcla, y a la mezcla le da igual quién llegó
  // antes. Cada bloque trae su propio retraso escrito en el filtro.
  const audio = usable.filter((c) => c.kind === 'audio' && c.gain > 0)
  const total = projectDuration({ ...project, clips: usable })

  const { width, height, fps } = options
  const args: string[] = ['-hide_banner', '-y']
  const chains: string[] = []
  const videoLabels: string[] = []
  let index = 0
  let gaps = 0

  /** Un hueco de la pista de video es negro de verdad, no un salto. Sin esto,
      `concat` pegaría los dos lados y todo lo que venga después sonaría
      adelantado respecto de la imagen. */
  const black = (durationSec: number): void => {
    chains.push(
      `color=c=black:s=${width}x${height}:r=${fps}:d=${secs(durationSec)},` +
        `format=yuv420p,setsar=1[g${gaps}]`
    )
    videoLabels.push(`[g${gaps}]`)
    gaps++
  }

  let cursor = 0
  for (const clip of video) {
    const source = sources.get(clip.sourceId)!
    if (clip.startSec - cursor > 0.02) black(clip.startSec - cursor)

    args.push('-ss', secs(clip.inSec), '-t', secs(clipLength(clip)), '-i', source.path)
    // Cada bloque llega al pegado con la misma forma — mismo tamaño, misma
    // relación de píxel, misma cadencia y mismo espacio de color — porque
    // `concat` exige que coincidan y porque el usuario puede haber traído un
    // vertical de teléfono y un 4K de cámara al mismo proyecto. `decrease` con
    // `pad` mete la imagen entera dentro del lienzo sin deformarla; lo que
    // sobra es negro, no un estirón.
    chains.push(
      `[${index}:v]setpts=PTS-STARTPTS,` +
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
        `setsar=1,fps=${fps},format=yuv420p[v${index}]`
    )
    videoLabels.push(`[v${index}]`)
    cursor = clipEnd(clip)
    index++
  }

  // La imagen dura lo que dure el montaje: si el sonido sigue después del
  // último bloque de video, lo que se ve es negro y no el final congelado.
  if (total - cursor > 0.02) black(total - cursor)

  const audioLabels: string[] = []
  for (const clip of audio) {
    const source = sources.get(clip.sourceId)!
    args.push('-ss', secs(clip.inSec), '-t', secs(clipLength(clip)), '-i', source.path)
    // `aformat` antes de mezclar: los orígenes llegan con distinta frecuencia,
    // distinto formato de muestra y hasta distinto número de canales, y `amix`
    // con entradas desiguales devuelve ruido o se planta. `adelay` lo pone en
    // su sitio del montaje — es el único lugar donde el sonido sabe de tiempo.
    chains.push(
      `[${index}:a]asetpts=PTS-STARTPTS,volume=${clip.gain.toFixed(3)},` +
        `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
        `adelay=${Math.round(clip.startSec * 1000)}:all=1[a${index}]`
    )
    audioLabels.push(`[a${index}]`)
    index++
  }

  chains.push(`${videoLabels.join('')}concat=n=${videoLabels.length}:v=1:a=0[vout]`)

  if (audioLabels.length === 1) {
    // Un solo sonido no se mezcla con nadie: `amix` de una entrada sólo
    // añadiría una copia y un remuestreo que no hacen falta.
    chains.push(`${audioLabels[0]}anull[aout]`)
  } else if (audioLabels.length > 1) {
    // `normalize=0`: por defecto `amix` divide el volumen entre el número de
    // entradas, y añadir una segunda pista bajaría a la mitad la primera —
    // exactamente lo que nadie pide al añadir música. `dropout_transition=0`
    // quita el desvanecido que hace cuando una entrada se acaba.
    chains.push(
      `${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0:dropout_transition=0[aout]`
    )
  }

  const encoder = encoderFor(options.videoCodec, options.hardwareAccel)
  args.push('-filter_complex', chains.join(';'))
  args.push('-map', '[vout]')
  if (audioLabels.length > 0) args.push('-map', '[aout]')

  args.push('-c:v', encoder)
  args.push(...qualityFlag(encoder, options.quality))
  args.push(...presetFlag(encoder, options.preset))
  args.push('-r', String(fps))

  if (audioLabels.length > 0) {
    args.push('-c:a', AUDIO_ENCODER[options.audioCodec], '-b:a', `${options.audioBitrateKbps}k`)
    args.push('-ar', '48000')
  } else {
    args.push('-an')
  }

  // El corte final va aquí y no en los filtros: `adelay` puede alargar el
  // sonido unos milisegundos y `concat` redondea al cuadro, y sin un tope el
  // archivo saldría con una cola de silencio que nadie montó.
  args.push('-t', secs(total))
  if (options.container === 'mp4') args.push('-movflags', '+faststart')
  args.push('-progress', 'pipe:1', '-nostats')
  args.push(outputPath)

  return {
    args,
    durationSec: total,
    sourceCount: new Set(usable.map((c) => c.sourceId)).size
  }
}

/** Lo que impide exportar, dicho en una frase, o `null` si no hay nada. */
export function renderBlocker(project: EditProject): string | null {
  const usable = project.clips.filter((c) => clipLength(c) > 0.02)
  if (usable.length === 0) return 'La línea de tiempo está vacía: no hay nada que exportar.'
  if (!usable.some((c) => c.kind === 'video')) {
    return 'No queda ningún bloque de imagen en la línea de tiempo. VideoScaler exporta video, así que hace falta al menos uno.'
  }
  return null
}

export async function runRender(
  jobId: string,
  project: EditProject,
  options: RenderOptions,
  outputPath: string,
  onProgress: (p: JobProgress) => void
): Promise<JobResult> {
  const startedAt = Date.now()
  const env = await resolveFfmpeg()

  // El peso de entrada es la suma de lo que se trajo al proyecto. No sirve para
  // una razón de compresión — un montaje puede usar dos segundos de un archivo
  // de un giga — pero sí para decir de cuánto material salió esto.
  let inputSizeBytes = 0
  for (const source of project.sources) {
    inputSizeBytes += await stat(source.path)
      .then((s) => s.size)
      .catch(() => 0)
  }

  const base: JobResult = {
    jobId,
    status: 'error',
    outputPath: null,
    inputSizeBytes,
    outputSizeBytes: null,
    ratio: null,
    elapsedMs: 0,
    error: null
  }

  if (!env.ffmpegPath) {
    return { ...base, elapsedMs: Date.now() - startedAt, error: 'No se encontró FFmpeg.' }
  }

  const blocked = renderBlocker(project)
  if (blocked) return { ...base, elapsedMs: Date.now() - startedAt, error: blocked }

  const { args, durationSec } = buildRenderArgs(project, options, outputPath)

  try {
    await runPass(env.ffmpegPath, args, jobId, durationSec, 0, 1, onProgress)
    const { size } = await stat(outputPath)
    return {
      ...base,
      status: 'done',
      outputPath,
      outputSizeBytes: size,
      // Sin razón de compresión: el montaje no promete pesar menos que sus
      // orígenes, y un «−300 %» sería una cifra inventada.
      ratio: null,
      elapsedMs: Date.now() - startedAt
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ...base,
      status: message === 'CANCELED' ? 'canceled' : 'error',
      elapsedMs: Date.now() - startedAt,
      error: message === 'CANCELED' ? null : message
    }
  }
}
