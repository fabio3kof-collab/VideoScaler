import type { EncodeOptions, MediaProbe } from './types'

/**
 * Reparto del presupuesto de bits. Vive en shared porque el renderer lo usa
 * para estimar y el main para codificar: si fueran dos implementaciones, el
 * número que ve el usuario y el archivo que sale acabarían discrepando.
 *
 * Unidades: 1 MB = 1 MiB = 1024·1024 bytes. Los bitrates son SI (1 kbps =
 * 1000 bits/s), que es lo que interpreta FFmpeg en `-b:v 2500k`.
 */

/** Margen para cabeceras de contenedor e imprecisión del control de tasa. */
const HEADROOM = 0.98

/** Debajo de esto el video es irreconocible; preferimos avisar a entregarlo. */
export const MIN_VIDEO_KBPS = 100

export function effectiveDuration(options: EncodeOptions, probe: MediaProbe): number {
  if (!options.trim) return probe.durationSec
  const end = options.trim.endSec ?? probe.durationSec
  return Math.max(0, end - options.trim.startSec)
}

/**
 * Lo que pesa la pista original por segundo.
 *
 * ffprobe no siempre declara el bitrate de la pista de audio — en MP4 es común
 * que falte. Cuando falta, el resto del archivo lo dice: el peso total menos lo
 * que se lleva el video. Inventar 128 kbps ahí adentro es lo que hacía que un
 * archivo con audio de 384 kbps saliera muy por encima de lo prometido.
 */
function sourceAudioKbps(probe: MediaProbe): number {
  const audio = probe.audio
  if (!audio) return 0
  if (audio.bitrateKbps) return audio.bitrateKbps

  if (probe.durationSec > 0 && probe.sizeBytes > 0 && probe.video?.bitrateKbps) {
    const totalKbps = (probe.sizeBytes * 8) / probe.durationSec / 1000
    const rest = Math.round(totalKbps - probe.video.bitrateKbps)
    // Sólo si el resto tiene forma de pista de audio. El bitrate de video que
    // declara el contenedor es un promedio y no siempre cuadra con el peso del
    // archivo; cuando no cuadra, esta resta da cualquier número.
    if (rest >= 24 && rest <= 640) return rest
  }

  return audio.channels > 2 ? 384 : 128
}

export function audioKbpsFor(options: EncodeOptions, probe: MediaProbe): number {
  // Sin pista de origen no hay pista de salida, elija lo que elija el usuario:
  // contar un audio que no existe infla la estimación de todos los modos.
  if (!probe.audio) return 0

  switch (options.audio.mode) {
    case 'mute':
      return 0
    case 'copy':
      return sourceAudioKbps(probe)
    case 'encode':
      // `-b:a` manda, y no cambia por bajar a mono: FFmpeg entrega los kbps
      // pedidos repartidos entre menos canales. Descontar aquí por el downmix
      // dejaba al video con bits de más y el archivo salía por encima.
      return options.audio.bitrateKbps
  }
}

export interface Budget {
  /** Bitrate de video que se le pedirá a FFmpeg, ya con el piso aplicado. */
  videoKbps: number
  audioKbps: number
  /** Lo que el objetivo pedía antes del piso. Negativo = el audio no cabe. */
  requestedVideoKbps: number
  /** false cuando el objetivo es inalcanzable y el piso se activó. */
  reachable: boolean
  /** Peso real que producirán estos ajustes, alcanzable o no. */
  bytes: number
}

/**
 * Deriva el bitrate de video de un peso objetivo.
 *
 * Este es el cálculo que convierte "el espacio disponible" en una entrada y no
 * en un resultado. Cuando el audio por sí solo excede el objetivo, el bitrate
 * pedido sale negativo: se aplica un piso y se marca `reachable: false` para
 * que la interfaz lo diga en vez de entregar un archivo que no cumple.
 */
/**
 * La inversa: qué objetivo de peso corresponde a un bitrate de video dado.
 *
 * En este modo el peso y el bitrate no son dos ajustes, son el mismo número
 * mirado desde dos lados — el audio y la duración hacen de cambio. Tener la
 * vuelta aquí, junto a la ida, es lo que impide que las dos direcciones se
 * desincronicen: si una de las dos viviera en el renderer, acabarían diciendo
 * cosas distintas.
 */
export function targetSizeForVideoKbps(
  videoKbps: number,
  options: EncodeOptions,
  probe: MediaProbe
): number {
  const duration = effectiveDuration(options, probe)
  if (duration <= 0) return options.video.targetSizeMB
  const bits = (videoKbps + audioKbpsFor(options, probe)) * 1000 * duration
  return bits / (1024 * 1024 * 8 * HEADROOM)
}

export function budgetForTargetSize(options: EncodeOptions, probe: MediaProbe): Budget {
  const duration = effectiveDuration(options, probe)
  const audioKbps = audioKbpsFor(options, probe)

  if (duration <= 0) {
    return {
      videoKbps: MIN_VIDEO_KBPS,
      audioKbps,
      requestedVideoKbps: MIN_VIDEO_KBPS,
      reachable: false,
      bytes: 0
    }
  }

  const budgetBits = options.video.targetSizeMB * 1024 * 1024 * 8 * HEADROOM
  const audioBits = audioKbps * 1000 * duration
  const requestedVideoKbps = (budgetBits - audioBits) / duration / 1000
  // Redondeado ya aquí: es el número que se le pasa a FFmpeg en `-b:v`, así que
  // es el que hay que usar para decir cuánto va a pesar. Estimar con el valor
  // sin redondear promete un peso que el encoder nunca recibió la orden de dar.
  const videoKbps = Math.round(Math.max(MIN_VIDEO_KBPS, requestedVideoKbps))

  return {
    videoKbps,
    audioKbps,
    requestedVideoKbps: Math.round(requestedVideoKbps),
    reachable: requestedVideoKbps >= MIN_VIDEO_KBPS,
    bytes: ((videoKbps + audioKbps) * 1000 * duration) / 8
  }
}
