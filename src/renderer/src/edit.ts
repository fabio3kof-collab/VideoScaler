import type { EditClip, EditProject, EditSource, EditTrack } from '@shared/edit'
import { clipEnd, clipLength, projectDuration } from '@shared/edit'
import type { MediaProbe } from '@shared/types'

/**
 * Las operaciones del montaje, sin una sola línea de interfaz.
 *
 * Todas devuelven un proyecto nuevo y ninguna toca el que recibe. No es
 * ceremonia de inmutabilidad: es lo que hace que deshacer sea guardar el
 * anterior en una pila y sacarlo, en vez de rehacer al revés cada operación —
 * que es donde un editor acumula sus errores más caros, porque el usuario sólo
 * se entera de que deshacer estaba roto cuando ya perdió el trabajo.
 *
 * La regla de oro está en `@shared/edit`: la pista de video lleva imagen y las
 * de audio llevan sonido. Aquí se cumple hermanando los dos bloques que salen
 * de un mismo archivo, para que se muevan como uno hasta que alguien los separe.
 */

/** Lo más corto que se deja dejar un bloque. Por debajo no es un corte, es un
    accidente del ratón. */
export const MIN_CLIP = 0.08

let counter = 0
function id(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}`
}

export const MIN_ZOOM = 4
export const MAX_ZOOM = 400

export function sourceFromProbe(probe: MediaProbe): EditSource {
  return {
    id: id('src'),
    path: probe.path,
    filename: probe.filename,
    durationSec: probe.durationSec,
    hasVideo: probe.video !== null,
    hasAudio: probe.audio !== null,
    width: probe.video?.width ?? 0,
    height: probe.video?.height ?? 0,
    fps: probe.video?.fps ?? 0
  }
}

/** Dos pistas de audio de salida, no una: la de la voz del video y la de lo que
    se le pone encima son dos cosas distintas, y separarlas es lo primero que
    hace cualquiera que añade música. */
export function emptyTracks(): EditTrack[] {
  return [
    { id: 'V1', kind: 'video', label: 'V1' },
    { id: 'A1', kind: 'audio', label: 'A1' },
    { id: 'A2', kind: 'audio', label: 'A2' }
  ]
}

export function projectFromProbe(probe: MediaProbe): EditProject {
  const source = sourceFromProbe(probe)
  const empty: EditProject = { sources: [source], tracks: emptyTracks(), clips: [] }
  return insertSource(empty, source, 0)
}

/**
 * Trae un origen a la línea de tiempo, en `atSec`.
 *
 * Un archivo con imagen y sonido entra como dos bloques hermanados; uno de sólo
 * audio entra como uno solo en la primera pista de audio libre. El video va
 * siempre a V1: apilar imagen sobre imagen es composición, y componer sin
 * mandos de posición ni de opacidad sería prometer algo que no está.
 */
export function insertSource(project: EditProject, source: EditSource, atSec: number): EditProject {
  const start = Math.max(0, atSec)
  const clips: EditClip[] = []
  const link = source.hasVideo && source.hasAudio ? id('link') : null
  const duration = source.durationSec > 0 ? source.durationSec : 0

  if (duration <= 0) return project

  if (source.hasVideo) {
    clips.push({
      id: id('clip'),
      sourceId: source.id,
      kind: 'video',
      trackId: 'V1',
      startSec: start,
      inSec: 0,
      outSec: duration,
      gain: 1,
      linkId: link
    })
  }

  if (source.hasAudio) {
    const track = freeAudioTrack(project, start, start + duration)
    clips.push({
      id: id('clip'),
      sourceId: source.id,
      kind: 'audio',
      trackId: track,
      startSec: start,
      inSec: 0,
      outSec: duration,
      gain: 1,
      linkId: link
    })
  }

  if (clips.length === 0) return project

  const next = withSource(project, source)
  // El video no se solapa nunca: si el sitio pedido está ocupado, el bloque cae
  // detrás del último. Es la regla de V1 dicha una sola vez, aquí.
  const video = clips.find((c) => c.kind === 'video')
  if (video) {
    const legal = fitOnVideoTrack(next, video, start)
    const shift = legal - start
    for (const clip of clips) clip.startSec += shift
  }

  return { ...next, clips: [...next.clips, ...clips] }
}

function withSource(project: EditProject, source: EditSource): EditProject {
  if (project.sources.some((s) => s.id === source.id)) return project
  return { ...project, sources: [...project.sources, source] }
}

/** La primera pista de audio donde el tramo cabe sin pisar a nadie; si todas
    están ocupadas, la última — el sonido se mezcla, así que solaparlo no rompe
    nada, sólo se oye peor. */
function freeAudioTrack(project: EditProject, from: number, to: number): string {
  const audio = project.tracks.filter((t) => t.kind === 'audio')
  for (const track of audio) {
    const busy = project.clips.some(
      (c) => c.trackId === track.id && c.startSec < to - 0.001 && clipEnd(c) > from + 0.001
    )
    if (!busy) return track.id
  }
  return audio[audio.length - 1]?.id ?? 'A1'
}

/**
 * Dónde puede caer un bloque de video que quiere empezar en `wanted`.
 *
 * Se prueba el sitio pedido y, si choca, se salta al canto más cercano del
 * vecino que estorba. Se repite unas cuantas veces porque saltar a un canto
 * puede meterlo dentro del siguiente. Si después de eso sigue sin caber, se va
 * detrás de todo: mover un bloque y que desaparezca dentro de otro sería perder
 * material sin decirlo.
 */
function fitOnVideoTrack(project: EditProject, clip: EditClip, wanted: number): number {
  const length = clipLength(clip)
  const others = project.clips.filter(
    (c) => c.trackId === 'V1' && c.id !== clip.id && clipLength(c) > 0
  )
  let start = Math.max(0, wanted)

  for (let round = 0; round < 8; round++) {
    const hit = others.find((c) => start < clipEnd(c) - 0.001 && start + length > c.startSec + 0.001)
    if (!hit) return start
    const before = Math.max(0, hit.startSec - length)
    const after = clipEnd(hit)
    start = Math.abs(before - wanted) <= Math.abs(after - wanted) ? before : after
  }

  return others.reduce((end, c) => Math.max(end, clipEnd(c)), 0)
}

/** El bloque y su hermano, si lo tiene. */
export function linkedGroup(project: EditProject, clipId: string): EditClip[] {
  const clip = project.clips.find((c) => c.id === clipId)
  if (!clip) return []
  if (!clip.linkId) return [clip]
  return project.clips.filter((c) => c.linkId === clip.linkId)
}

function replace(project: EditProject, clips: EditClip[]): EditProject {
  return { ...project, clips }
}

/**
 * Corta por donde está el cursor.
 *
 * Sin selección corta todo lo que el cursor cruce, que es lo que uno quiere el
 * 90 % de las veces: partir la escena entera para quitar el trozo del medio. Con
 * selección corta sólo lo seleccionado, que es la otra vez.
 *
 * Los hermanos siguen hermanados después del corte, pero por parejas: la mitad
 * izquierda de la imagen con la mitad izquierda del sonido, y las dos derechas
 * con un vínculo nuevo. Con un solo vínculo para las cuatro, mover la primera
 * mitad arrastraría la segunda.
 */
export function splitAt(project: EditProject, at: number, only: string[] = []): EditProject {
  const target = new Set(only)
  const fresh = new Map<string, string>()
  const out: EditClip[] = []
  let cut = false

  for (const clip of project.clips) {
    const crosses = at > clip.startSec + MIN_CLIP && at < clipEnd(clip) - MIN_CLIP
    const chosen = target.size === 0 || target.has(clip.id)
    if (!crosses || !chosen) {
      out.push(clip)
      continue
    }

    cut = true
    const offset = at - clip.startSec
    let rightLink: string | null = null
    if (clip.linkId) {
      rightLink = fresh.get(clip.linkId) ?? id('link')
      fresh.set(clip.linkId, rightLink)
    }

    out.push({ ...clip, outSec: clip.inSec + offset })
    out.push({
      ...clip,
      id: id('clip'),
      startSec: at,
      inSec: clip.inSec + offset,
      linkId: rightLink
    })
  }

  return cut ? replace(project, out) : project
}

/**
 * Quita bloques. Con `ripple`, todo lo que venía después se corre hacia atrás.
 *
 * El corrimiento es de todas las pistas a la vez y no sólo de la que se tocó:
 * cerrar el hueco de la imagen dejando el sonido donde estaba desincroniza el
 * resto del montaje, y eso se descubre al exportar, que es tarde.
 */
export function removeClips(project: EditProject, ids: string[], ripple: boolean): EditProject {
  const doomed = new Set<string>()
  for (const clipId of ids) for (const c of linkedGroup(project, clipId)) doomed.add(c.id)
  if (doomed.size === 0) return project

  const gone = project.clips.filter((c) => doomed.has(c.id))
  const rest = project.clips.filter((c) => !doomed.has(c.id))
  if (!ripple) return replace(project, rest)

  const from = Math.min(...gone.map((c) => c.startSec))
  const to = Math.max(...gone.map(clipEnd))
  const gap = to - from
  return replace(
    project,
    rest.map((c) => (c.startSec >= to - 0.001 ? { ...c, startSec: c.startSec - gap } : c))
  )
}

/** Mueve un bloque — y a su hermano con él — a otra pista y otro instante. */
export function moveClip(
  project: EditProject,
  clipId: string,
  toTrackId: string,
  startSec: number
): EditProject {
  const group = linkedGroup(project, clipId)
  const clip = group.find((c) => c.id === clipId)
  if (!clip) return project

  const track = project.tracks.find((t) => t.id === toTrackId)
  // Un bloque no cambia de naturaleza al cambiar de fila: el sonido no se puede
  // soltar en la pista de imagen ni al revés.
  if (!track || track.kind !== clip.kind) return project

  const wanted = Math.max(0, startSec)
  const landing =
    track.kind === 'video' ? fitOnVideoTrack(project, clip, wanted) : wanted
  const shift = landing - clip.startSec
  if (Math.abs(shift) < 0.0005 && toTrackId === clip.trackId) return project

  return replace(
    project,
    project.clips.map((c) => {
      if (c.id === clipId) return { ...c, trackId: toTrackId, startSec: landing }
      // El hermano acompaña en el tiempo, no en la pista: separar imagen y
      // sonido es otra orden, y esta no debe hacerla por su cuenta.
      if (group.some((g) => g.id === c.id)) return { ...c, startSec: Math.max(0, c.startSec + shift) }
      return c
    })
  )
}

/**
 * Estira o encoge un canto.
 *
 * Por la izquierda se mueven a la vez el sitio en el montaje y la entrada en el
 * origen — si sólo se moviera uno, recortar el principio desplazaría todo lo que
 * viene detrás, que es justo lo que un editor no debe hacer sin que se lo pidan.
 * Los topes son los del archivo: no se puede pedir imagen que no se grabó.
 */
export function trimClip(
  project: EditProject,
  clipId: string,
  edge: 'start' | 'end',
  atSec: number
): EditProject {
  const group = linkedGroup(project, clipId)
  const clip = group.find((c) => c.id === clipId)
  if (!clip) return project
  const source = project.sources.find((s) => s.id === clip.sourceId)
  const limit = source?.durationSec ?? clip.outSec

  let delta: number
  if (edge === 'start') {
    const lowest = clip.startSec - clip.inSec // no hay material antes de la entrada
    const highest = clipEnd(clip) - MIN_CLIP
    const at = Math.min(Math.max(atSec, Math.max(0, lowest)), highest)
    delta = at - clip.startSec
  } else {
    const highest = clip.startSec + (limit - clip.inSec)
    const at = Math.min(Math.max(atSec, clip.startSec + MIN_CLIP), highest)
    delta = at - clipEnd(clip)
  }
  if (Math.abs(delta) < 0.0005) return project

  return replace(
    project,
    project.clips.map((c) => {
      if (!group.some((g) => g.id === c.id)) return c
      if (edge === 'start') {
        return { ...c, startSec: c.startSec + delta, inSec: c.inSec + delta }
      }
      return { ...c, outSec: c.outSec + delta }
    })
  )
}

/** Rompe el vínculo: a partir de aquí la imagen y el sonido son dos bloques. */
export function unlink(project: EditProject, clipId: string): EditProject {
  const group = linkedGroup(project, clipId)
  if (group.length < 2) return project
  const ids = new Set(group.map((c) => c.id))
  return replace(
    project,
    project.clips.map((c) => (ids.has(c.id) ? { ...c, linkId: null } : c))
  )
}

/** Vuelve a hermanar dos bloques que salieron del mismo archivo. */
export function relink(project: EditProject, clipId: string, otherId: string): EditProject {
  const a = project.clips.find((c) => c.id === clipId)
  const b = project.clips.find((c) => c.id === otherId)
  if (!a || !b || a.kind === b.kind) return project
  const link = id('link')
  return replace(
    project,
    project.clips.map((c) => (c.id === a.id || c.id === b.id ? { ...c, linkId: link } : c))
  )
}

export function setGain(project: EditProject, clipId: string, gain: number): EditProject {
  const value = Math.min(2, Math.max(0, gain))
  return replace(
    project,
    project.clips.map((c) => (c.id === clipId ? { ...c, gain: value } : c))
  )
}

/** Una copia del bloque justo detrás del original. */
export function duplicateClip(project: EditProject, clipId: string): EditProject {
  const group = linkedGroup(project, clipId)
  const clip = group.find((c) => c.id === clipId)
  if (!clip) return project
  const link = group.length > 1 ? id('link') : null
  const at = clipEnd(clip)

  const copies = group.map((c) => ({
    ...c,
    id: id('clip'),
    startSec: at + (c.startSec - clip.startSec),
    linkId: link
  }))

  const video = copies.find((c) => c.kind === 'video')
  if (video) {
    const legal = fitOnVideoTrack(project, video, video.startSec)
    const shift = legal - video.startSec
    for (const c of copies) c.startSec += shift
  }

  return replace(project, [...project.clips, ...copies])
}

/** Empuja todo contra el principio, en orden, sin huecos. Sólo la imagen manda:
    el sonido hermanado la sigue para no perder la sincronía. */
export function closeGaps(project: EditProject): EditProject {
  const video = project.clips
    .filter((c) => c.kind === 'video')
    .sort((a, b) => a.startSec - b.startSec)
  if (video.length === 0) return project

  const shifts = new Map<string, number>()
  let cursor = 0
  for (const clip of video) {
    shifts.set(clip.id, cursor - clip.startSec)
    cursor += clipLength(clip)
  }

  return replace(
    project,
    project.clips.map((c) => {
      if (c.kind === 'video') return { ...c, startSec: c.startSec + (shifts.get(c.id) ?? 0) }
      // El sonido suelto se queda donde está: nadie pidió moverlo, y una música
      // de fondo no tiene por qué seguir a los cortes de la imagen.
      const sibling = c.linkId
        ? video.find((v) => v.linkId === c.linkId)
        : undefined
      if (!sibling) return c
      return { ...c, startSec: c.startSec + (shifts.get(sibling.id) ?? 0) }
    })
  )
}

/** Qué se ve y qué suena en el instante `t`. */
export function clipsAt(project: EditProject, t: number): EditClip[] {
  return project.clips.filter((c) => t >= c.startSec - 0.001 && t < clipEnd(c) - 0.001)
}

export function videoClipAt(project: EditProject, t: number): EditClip | null {
  return clipsAt(project, t).find((c) => c.kind === 'video') ?? null
}

/** Dónde está ese instante dentro del archivo del bloque. */
export function sourceTime(clip: EditClip, t: number): number {
  return clip.inSec + Math.max(0, t - clip.startSec)
}

/**
 * Los sitios a los que el cursor y los bloques se pegan: el cero, el cursor y
 * cada canto de cada bloque. Un montaje sin imán obliga a acertar el pixel, y
 * un cuadro de hueco entre dos bloques es un parpadeo negro que nadie ve venir
 * hasta que exporta.
 */
export function magnets(project: EditProject, exclude: Set<string>, playhead: number): number[] {
  const points = [0, playhead]
  for (const clip of project.clips) {
    if (exclude.has(clip.id)) continue
    points.push(clip.startSec, clipEnd(clip))
  }
  return points
}

export function snapTo(value: number, points: number[], tolerance: number): number {
  let best = value
  let distance = tolerance
  for (const point of points) {
    const d = Math.abs(point - value)
    if (d < distance) {
      distance = d
      best = point
    }
  }
  return best
}

/** El lienzo que propone el proyecto: el del primer video que entró, con topes
    razonables. Un montaje sin video no propone nada. */
export function suggestCanvas(project: EditProject): { width: number; height: number; fps: number } {
  const first = project.clips
    .filter((c) => c.kind === 'video')
    .sort((a, b) => a.startSec - b.startSec)[0]
  const source = first ? project.sources.find((s) => s.id === first.sourceId) : undefined
  const width = source?.width && source.width > 0 ? source.width : 1920
  const height = source?.height && source.height > 0 ? source.height : 1080
  const fps = source?.fps && source.fps > 0 ? Math.min(60, Math.round(source.fps)) : 30
  // Pares: casi todos los códecs rechazan dimensiones impares, y un montaje que
  // falla al exportar por un píxel es la peor forma de enterarse.
  return { width: width - (width % 2), height: height - (height % 2), fps }
}

export { clipEnd, clipLength, projectDuration }
