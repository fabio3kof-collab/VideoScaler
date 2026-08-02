/**
 * Contrato compartido entre el proceso main y el renderer.
 *
 * Regla del producto: toda característica que afecte el peso del archivo debe
 * existir aquí como opción manipulable. Si una palanca de compresión no está
 * en este archivo, el usuario no la puede tocar — y eso es un defecto.
 */

// ---------------------------------------------------------------------------
// Análisis del archivo de entrada
// ---------------------------------------------------------------------------

export interface VideoStreamInfo {
  codec: string
  width: number
  height: number
  fps: number
  bitrateKbps: number | null
  pixFmt: string | null
}

export interface AudioStreamInfo {
  codec: string
  channels: number
  sampleRate: number
  bitrateKbps: number | null
}

export interface MediaProbe {
  path: string
  filename: string
  sizeBytes: number
  durationSec: number
  container: string
  video: VideoStreamInfo | null
  audio: AudioStreamInfo | null
}

// ---------------------------------------------------------------------------
// Palancas de compresión
// ---------------------------------------------------------------------------

export type Container = 'mp4' | 'mkv' | 'webm'

export type VideoCodec = 'h264' | 'h265' | 'av1' | 'vp9'

/** Cómo se decide la cantidad de bits que recibe el video. */
export type RateMode =
  /** Calidad constante. El peso final es una consecuencia, no una entrada. */
  | 'quality'
  /** Bitrate promedio fijado por el usuario. */
  | 'bitrate'
  /** El usuario fija el peso final y el bitrate se deriva de la duración. */
  | 'targetSize'

/** Compromiso velocidad/compresión del encoder. Más lento = más chico. */
export type EncodePreset =
  | 'ultrafast'
  | 'superfast'
  | 'veryfast'
  | 'faster'
  | 'fast'
  | 'medium'
  | 'slow'
  | 'slower'
  | 'veryslow'

export type ScaleMode =
  | { kind: 'original' }
  /** Porcentaje de la resolución original, 1-100. */
  | { kind: 'percent'; percent: number }
  /** Alto fijo en píxeles; el ancho se deriva manteniendo el aspecto. */
  | { kind: 'height'; height: number }
  /** Ancho fijo en píxeles; el alto se deriva manteniendo el aspecto. */
  | { kind: 'width'; width: number }
  /** Ancho y alto explícitos. Puede deformar si no coincide el aspecto. */
  | { kind: 'exact'; width: number; height: number }

export type HardwareAccel = 'none' | 'nvenc' | 'qsv' | 'amf'

export interface VideoOptions {
  codec: VideoCodec
  rateMode: RateMode
  /** CRF/CQ. Rango útil depende del códec; menor = mejor calidad y más peso. */
  quality: number
  /** Usado cuando rateMode es 'bitrate'. */
  bitrateKbps: number
  /** Usado cuando rateMode es 'targetSize'. El objetivo de espacio, en MB. */
  targetSizeMB: number
  preset: EncodePreset
  /** Dos pasadas: mejor reparto de bits a igual peso, al doble de tiempo. */
  twoPass: boolean
  scale: ScaleMode
  /** null = conservar el frame rate original. */
  fps: number | null
  hardwareAccel: HardwareAccel
}

export type AudioMode =
  /** Copiar el audio sin recomprimir. Sin pérdida, sin ahorro. */
  | 'copy'
  /** Recomprimir con los parámetros de abajo. */
  | 'encode'
  /** Sin pista de audio. El ahorro máximo. */
  | 'mute'

export type AudioCodec = 'aac' | 'opus' | 'mp3'

export interface AudioOptions {
  mode: AudioMode
  codec: AudioCodec
  bitrateKbps: number
  /** 1 = mono (ahorra), 2 = estéreo, null = conservar. */
  channels: 1 | 2 | null
  /** null = conservar el sample rate original. */
  sampleRate: number | null
}

export interface EncodeOptions {
  container: Container
  video: VideoOptions
  audio: AudioOptions
  /** Recorte temporal. Menos duración es menos peso. */
  trim: { startSec: number; endSec: number | null } | null
  /** Elimina metadata y carátulas embebidas. Ahorro pequeño pero real. */
  stripMetadata: boolean
  /** Mueve el índice al inicio para reproducción progresiva (mp4). */
  faststart: boolean
}

// ---------------------------------------------------------------------------
// Trabajos de codificación
// ---------------------------------------------------------------------------

export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'canceled'

export interface JobProgress {
  jobId: string
  /** 0-100. Derivado del tiempo procesado sobre la duración total. */
  percent: number
  /** Multiplicador de velocidad respecto a tiempo real, p.ej. 3.2 = 3.2x. */
  speed: number | null
  fps: number | null
  etaSec: number | null
  /** Peso del archivo de salida hasta el momento. */
  outSizeBytes: number | null
}

export interface JobResult {
  jobId: string
  status: JobStatus
  outputPath: string | null
  inputSizeBytes: number
  outputSizeBytes: number | null
  /** Fracción del peso original, p.ej. 0.28 = quedó en el 28%. */
  ratio: number | null
  elapsedMs: number
  error: string | null
}

export interface EncodeRequest {
  jobId: string
  inputPath: string
  outputPath: string
  options: EncodeOptions
}

// ---------------------------------------------------------------------------
// Reproducción y captura
// ---------------------------------------------------------------------------

export interface CaptureRequest {
  /** El video del que salió el fotograma: la imagen se guarda a su lado. */
  sourcePath: string
  /** Número de cuadro, para nombrar el archivo con algo que se pueda buscar. */
  frame: number
  /**
   * El zoom dejaba parte del cuadro fuera de la mesa y la imagen es sólo esa
   * parte. Va en el nombre: un recorte y el fotograma entero del mismo cuadro
   * no son el mismo archivo, y quien los busque después necesita distinguirlos.
   */
  crop: boolean
  /** PNG ya codificado por el renderer. */
  data: Uint8Array
}

// ---------------------------------------------------------------------------
// Entorno
// ---------------------------------------------------------------------------

export interface FfmpegStatus {
  available: boolean
  ffmpegPath: string | null
  ffprobePath: string | null
  /** De dónde salió el binario: empaquetado, node_modules o PATH del sistema. */
  source: 'bundled' | 'module' | 'system' | null
  version: string | null
}

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready'; version: string }
  | { status: 'none' }
  | { status: 'error'; message: string }
