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

export function audioKbpsFor(options: EncodeOptions, probe: MediaProbe): number {
  switch (options.audio.mode) {
    case 'mute':
      return 0
    case 'copy':
      return probe.audio?.bitrateKbps ?? 128
    case 'encode': {
      const downmixing = options.audio.channels === 1 && (probe.audio?.channels ?? 2) > 1
      return options.audio.bitrateKbps * (downmixing ? 0.6 : 1)
    }
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
  const videoKbps = Math.max(MIN_VIDEO_KBPS, requestedVideoKbps)

  return {
    videoKbps: Math.round(videoKbps),
    audioKbps,
    requestedVideoKbps: Math.round(requestedVideoKbps),
    reachable: requestedVideoKbps >= MIN_VIDEO_KBPS,
    bytes: ((videoKbps + audioKbps) * 1000 * duration) / 8
  }
}
