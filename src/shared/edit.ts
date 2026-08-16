import type { AudioCodec, Container, EncodePreset, HardwareAccel, VideoCodec } from './types'

/**
 * El modelo del montaje: qué trozos de qué archivos, y dónde.
 *
 * Tres piezas y nada más. Un **origen** es un archivo traído al proyecto — se
 * sondea una vez y se cita muchas. Una **pista** es una fila de la línea de
 * tiempo, y sólo sabe de qué es: imagen o sonido. Un **bloque** es un trozo de
 * un origen puesto en una pista: dónde empieza en el montaje, y qué pedazo del
 * archivo usa. Nada se copia ni se corta en el disco hasta exportar; cortar un
 * bloque en dos es escribir dos veces la misma cita con distintos límites.
 *
 * La regla que sostiene todo lo demás: **la pista de video lleva sólo imagen y
 * las de audio sólo sonido.** Un archivo con las dos cosas entra como dos
 * bloques hermanados por `linkId`, que se mueven, se cortan y se borran juntos.
 * Separar el audio del video no es un modo ni una casilla: es romper ese
 * vínculo, y a partir de ahí son dos bloques como cualquier otro. Sin esta
 * regla, la exportación tendría que preguntarse en cada bloque de imagen si
 * además suena, y el usuario tendría que acordarse de la respuesta.
 */

export type TrackKind = 'video' | 'audio'

/** Un archivo del proyecto. Se sondea al traerlo y no se vuelve a tocar. */
export interface EditSource {
  id: string
  path: string
  filename: string
  durationSec: number
  hasVideo: boolean
  hasAudio: boolean
  /** Del video, si lo tiene. Sirven para proponer el lienzo de salida. */
  width: number
  height: number
  fps: number
}

export interface EditClip {
  id: string
  sourceId: string
  /** Qué corriente del origen usa este bloque: la imagen o el sonido. */
  kind: TrackKind
  trackId: string
  /** Dónde empieza en la línea de tiempo, en segundos. */
  startSec: number
  /** Entrada y salida dentro del origen. La duración es la resta. */
  inSec: number
  outSec: number
  /** Ganancia lineal del sonido: 1 es tal cual, 0 es mudo. */
  gain: number
  /** Hermana este bloque con su par de la otra pista. `null` = suelto. */
  linkId: string | null
}

export interface EditTrack {
  id: string
  kind: TrackKind
  label: string
}

export interface EditProject {
  sources: EditSource[]
  tracks: EditTrack[]
  clips: EditClip[]
}

/** El lienzo y el códec de la exportación. */
export interface RenderOptions {
  container: Container
  width: number
  height: number
  fps: number
  videoCodec: VideoCodec
  /** CRF/CQ del códec elegido. */
  quality: number
  preset: EncodePreset
  hardwareAccel: HardwareAccel
  audioCodec: AudioCodec
  audioBitrateKbps: number
}

export interface RenderRequest {
  jobId: string
  outputPath: string
  project: EditProject
  options: RenderOptions
}

/** Cuánto dura un bloque en la línea de tiempo. */
export function clipLength(clip: EditClip): number {
  return Math.max(0, clip.outSec - clip.inSec)
}

export function clipEnd(clip: EditClip): number {
  return clip.startSec + clipLength(clip)
}

/**
 * Cuánto dura el montaje: hasta donde llegue el último bloque, sea de la pista
 * que sea. Un proyecto vacío dura cero, no `-Infinity` — que es lo que devuelve
 * `Math.max` sin argumentos y lo que hacía que la línea de tiempo desapareciera.
 */
export function projectDuration(project: EditProject): number {
  let end = 0
  for (const clip of project.clips) end = Math.max(end, clipEnd(clip))
  return end
}
