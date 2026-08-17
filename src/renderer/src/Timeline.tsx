import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import type { EditClip, EditProject } from '@shared/edit'
import { clipEnd, clipLength, projectDuration } from '@shared/edit'
import { formatDuration, formatTimecode } from './defaults'
import { magnets, moveClip, snapTo, trimClip } from './edit'

/*
 * La línea de tiempo: la regla, las pistas y el cursor.
 *
 * Es un mando, no un dibujo. Todo lo que se puede pensar sobre un montaje —
 * dónde empieza cada trozo, cuánto dura, qué suena encima de qué — tiene que
 * poder tocarse aquí con el ratón, o el módulo es un formulario con aspecto de
 * editor.
 *
 * Tres reglas la sostienen:
 *
 * 1. **El píxel por segundo lo decide el usuario, no el archivo.** Un montaje de
 *    diez segundos y otro de dos horas se editan con los mismos gestos; lo único
 *    que cambia es el zoom. Por eso todas las medidas de aquí abajo son
 *    segundos multiplicados por `zoom`, y ninguna es un porcentaje.
 *
 * 2. **Un arrastre se calcula siempre contra el proyecto de cuando empezó**, no
 *    contra el de hace un cuadro. Aplicar deltas sobre el resultado anterior
 *    acumula el error del redondeo y del imán, y un bloque arrastrado despacio
 *    acaba en otro sitio que uno arrastrado rápido a la misma distancia.
 *
 * 3. **Los cantos son imanes.** Un cuadro de hueco entre dos bloques es un
 *    parpadeo negro que no se ve al montar y sí al exportar.
 */

/** La altura de una pista. Vive aquí y no en la hoja de estilo porque el
    arrastre necesita el mismo número para saber sobre qué fila está el ratón. */
const ROW = 56
/** A cuántos píxeles del canto agarra el imán. Se convierte a segundos con el
    zoom, para que pegue igual de cerca a cualquier escala. */
const MAGNET_PX = 9
/** El ancho de la zona de estirar. Menos de esto no se acierta con el ratón. */
const HANDLE = 10

const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800]

/** El escalón de la regla: el primero que deje al menos 68 px entre marcas. */
function rulerStep(zoom: number): number {
  return STEPS.find((s) => s * zoom >= 68) ?? STEPS[STEPS.length - 1]!
}

interface Drag {
  mode: 'move' | 'start' | 'end'
  clipId: string
  base: EditProject
  clip: EditClip
  originX: number
  pointerId: number
  moved: boolean
}

export function Timeline({
  project,
  playhead,
  selected,
  zoom,
  onSeek,
  onSelect,
  onBegin,
  onDraft,
  onEnd,
  onViewport
}: {
  project: EditProject
  playhead: number
  selected: string[]
  zoom: number
  onSeek: (t: number) => void
  onSelect: (ids: string[]) => void
  /** Antes del primer cambio de un gesto: es donde deshacer guarda el antes. */
  onBegin: () => void
  onDraft: (next: EditProject) => void
  onEnd: () => void
  /** El ancho útil de la línea de tiempo, cada vez que cambia. Lo necesita quien
      tenga que decidir cuánto zoom hace falta para que quepa el montaje entero:
      ese número vive aquí y sólo aquí. */
  onViewport?: (px: number) => void
}): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lanesRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const scrubRef = useRef(false)

  const duration = projectDuration(project)
  // Siempre sobra un poco de línea al final: sin cola, el último bloque queda
  // pegado al borde y no hay dónde soltar lo que se quiera poner detrás.
  const width = Math.max(duration + 4, 12) * zoom
  const step = rulerStep(zoom)
  const picked = useMemo(() => new Set(selected), [selected])

  const ticks = useMemo(() => {
    const out: number[] = []
    for (let t = 0; t <= duration + 4; t += step) out.push(Number(t.toFixed(3)))
    return out
  }, [duration, step])

  // El ancho útil, medido y no supuesto: cambia con la ventana, así que se
  // vigila en vez de leerlo una vez.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !onViewport) return
    const measure = (): void => onViewport(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [onViewport])

  const timeAt = useCallback(
    (clientX: number): number => {
      const el = lanesRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      return Math.max(0, (clientX - rect.left) / zoom)
    },
    [zoom]
  )

  /** Qué pista hay debajo del puntero. Sale de la geometría real y no de un
      cálculo con la altura de fila: las filas son las que son en el DOM. */
  const trackAt = useCallback(
    (clientY: number): string | null => {
      const lanes = lanesRef.current?.querySelectorAll<HTMLElement>('[data-track]')
      if (!lanes) return null
      for (const lane of lanes) {
        const rect = lane.getBoundingClientRect()
        if (clientY >= rect.top && clientY <= rect.bottom) return lane.dataset.track ?? null
      }
      return null
    },
    []
  )

  /** El zoom con el que se colocó la vista por última vez. Sirve para saber
      cuál de las dos cosas cambió, porque piden lo contrario la una de la otra. */
  const placedAt = useRef(zoom)

  /*
   * Dónde se queda la vista.
   *
   * Son dos preguntas distintas y antes se contestaban con la misma cuenta, que
   * es de donde salía el tumbo: mover la barra de zoom mandaba el cursor a
   * cuarenta píxeles del canto izquierdo si se alejaba y a ochenta del derecho
   * si se acercaba, así que el montaje daba un salto en cada píxel de arrastre y
   * en direcciones opuestas según hacia dónde se moviera la mano.
   *
   * Acercarse no es un motivo para irse a otra parte del montaje: lo que se
   * estaba mirando se queda donde está, y lo que crece a su alrededor es el
   * detalle. Correr, en cambio, sí es un motivo para mover la vista, pero lo
   * justo para que el cursor no se salga.
   */
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const before = placedAt.current

    if (before !== zoom) {
      placedAt.current = zoom
      const width = el.clientWidth
      const cursor = playhead * before
      // El punto que sostiene la vista es el cursor si se está viendo — es lo
      // que el usuario tiene los ojos puestos — y si no, el centro de lo que
      // haya en pantalla.
      const held =
        cursor >= el.scrollLeft && cursor <= el.scrollLeft + width
          ? { sec: playhead, at: cursor - el.scrollLeft }
          : { sec: (el.scrollLeft + width / 2) / before, at: width / 2 }
      el.scrollLeft = Math.max(0, held.sec * zoom - held.at)
      return
    }

    // No se centra: centrar en cada cuadro convierte la línea de tiempo en una
    // cinta que se desliza sola y marea.
    const x = playhead * zoom
    const left = el.scrollLeft
    const right = left + el.clientWidth
    if (x < left + 40) el.scrollLeft = Math.max(0, x - 40)
    else if (x > right - 80) el.scrollLeft = x - el.clientWidth + 80
  }, [playhead, zoom])

  const onClipDown = useCallback(
    (e: ReactPointerEvent, clip: EditClip, mode: Drag['mode']): void => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      onSelect(
        // Mayúsculas suma a la selección; sin ella, el bloque tocado es la
        // selección entera. Es lo que hace cualquier lista, y una línea de
        // tiempo es una lista con dos ejes.
        e.shiftKey ? [...new Set([...selected, clip.id])] : [clip.id]
      )
      dragRef.current = {
        mode,
        clipId: clip.id,
        base: project,
        clip,
        originX: e.clientX,
        pointerId: e.pointerId,
        moved: false
      }
    },
    [project, selected, onSelect]
  )

  const onClipMove = useCallback(
    (e: ReactPointerEvent): void => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const dx = (e.clientX - drag.originX) / zoom
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.originX) < 3 && drag.mode === 'move') return
        drag.moved = true
        onBegin()
      }

      const tolerance = MAGNET_PX / zoom
      const points = magnets(
        drag.base,
        new Set(
          drag.clip.linkId
            ? drag.base.clips.filter((c) => c.linkId === drag.clip.linkId).map((c) => c.id)
            : [drag.clip.id]
        ),
        playhead
      )

      if (drag.mode === 'move') {
        const wanted = drag.clip.startSec + dx
        const length = clipLength(drag.clip)
        // El imán mira los dos cantos y se queda con la corrección más pequeña:
        // pegar por la izquierda cuando lo que el usuario está alineando es el
        // final se siente como si el bloque se resistiera.
        const byStart = snapTo(wanted, points, tolerance)
        const byEnd = snapTo(wanted + length, points, tolerance) - length
        const start =
          Math.abs(byStart - wanted) <= Math.abs(byEnd - wanted) ? byStart : byEnd
        const track = trackAt(e.clientY) ?? drag.clip.trackId
        onDraft(moveClip(drag.base, drag.clipId, track, Math.max(0, start)))
        return
      }

      const edge = drag.mode === 'start' ? drag.clip.startSec : clipEnd(drag.clip)
      const at = snapTo(edge + dx, points, tolerance)
      onDraft(trimClip(drag.base, drag.clipId, drag.mode, at))
    },
    [zoom, playhead, onBegin, onDraft, trackAt]
  )

  const onClipUp = useCallback(
    (e: ReactPointerEvent): void => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      dragRef.current = null
      if (drag.moved) onEnd()
    },
    [onEnd]
  )

  const scrub = useCallback(
    (e: ReactPointerEvent): void => {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      scrubRef.current = true
      onSeek(timeAt(e.clientX))
    },
    [onSeek, timeAt]
  )

  return (
    <div className="deck">
      <div className="deck-gutter" aria-hidden="true">
        <div className="deck-cap" />
        {project.tracks.map((track) => (
          <div key={track.id} className={`lane-name lane-name-${track.kind}`}>
            {track.label}
          </div>
        ))}
      </div>

      <div className="deck-scroll" ref={scrollRef}>
        <div className="deck-canvas" style={{ width: `${width}px` }}>
          {/* La regla es también el mando de posición: se pulsa donde se quiere
              mirar. Un cursor que sólo se moviera con botones obligaría a contar
              segundos para llegar a un sitio que ya se está viendo. */}
          <div
            className="ruler"
            role="slider"
            tabIndex={0}
            aria-label="Posición en el montaje"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, duration)}
            aria-valuenow={playhead}
            aria-valuetext={formatTimecode(playhead)}
            onPointerDown={scrub}
            onPointerMove={(e) => {
              if (scrubRef.current) onSeek(timeAt(e.clientX))
            }}
            onPointerUp={() => {
              scrubRef.current = false
            }}
            onPointerCancel={() => {
              scrubRef.current = false
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') onSeek(Math.max(0, playhead - (e.shiftKey ? 1 : 5)))
              else if (e.key === 'ArrowRight') onSeek(playhead + (e.shiftKey ? 1 : 5))
              else return
              e.preventDefault()
            }}
          >
            {ticks.map((t) => (
              <span key={t} className="tick" style={{ left: `${t * zoom}px` }}>
                {step < 1 ? formatTimecode(t) : formatDuration(t)}
              </span>
            ))}
          </div>

          <div className="lanes" ref={lanesRef}>
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className={`lane lane-${track.kind}`}
                data-track={track.id}
                style={{ height: `${ROW}px` }}
                onPointerDown={(e) => {
                  // Pulsar el vacío es dejar de tener nada seleccionado y llevar
                  // el cursor ahí: son la misma intención — «mira aquí».
                  onSelect([])
                  onSeek(timeAt(e.clientX))
                }}
              >
                {project.clips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => {
                    const source = project.sources.find((s) => s.id === clip.sourceId)
                    const length = clipLength(clip)
                    return (
                      <div
                        key={clip.id}
                        className={`tl-clip${picked.has(clip.id) ? ' is-picked' : ''}${
                          clip.gain === 0 ? ' is-hushed' : ''
                        }`}
                        data-kind={clip.kind}
                        style={{ left: `${clip.startSec * zoom}px`, width: `${length * zoom}px` }}
                        title={`${source?.filename ?? ''} · ${formatTimecode(clip.inSec)} → ${formatTimecode(clip.outSec)}`}
                        onPointerDown={(e) => onClipDown(e, clip, 'move')}
                        onPointerMove={onClipMove}
                        onPointerUp={onClipUp}
                        onPointerCancel={onClipUp}
                      >
                        <span className="tl-clip-name">{source?.filename ?? 'sin origen'}</span>
                        <span className="tl-clip-len">{formatTimecode(length)}</span>
                        {clip.linkId && <span className="tl-clip-link" aria-hidden="true" />}

                        {/* Los tiradores son del bloque y no de la pista: al
                            estirar, lo que se agarra es este canto y no «el
                            canto que hubiera por aquí». */}
                        <span
                          className="tl-grip tl-grip-start"
                          style={{ width: `${HANDLE}px` }}
                          onPointerDown={(e) => onClipDown(e, clip, 'start')}
                          onPointerMove={onClipMove}
                          onPointerUp={onClipUp}
                          onPointerCancel={onClipUp}
                        />
                        <span
                          className="tl-grip tl-grip-end"
                          style={{ width: `${HANDLE}px` }}
                          onPointerDown={(e) => onClipDown(e, clip, 'end')}
                          onPointerMove={onClipMove}
                          onPointerUp={onClipUp}
                          onPointerCancel={onClipUp}
                        />
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>

          {/* Fuera de las pistas y con el puntero desactivado: cruza la regla y
              las tres filas de una pieza, y no se interpone entre el ratón y
              ningún bloque. */}
          <div
            className="playhead"
            style={{ transform: `translateX(${playhead * zoom}px)` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}
