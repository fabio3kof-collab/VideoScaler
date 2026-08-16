import { useCallback, useEffect, useRef } from 'react'
import type { JSX } from 'react'
import type { JobProgress, JobResult } from '@shared/types'
import { formatBytes, formatDuration } from './defaults'
import type { FriendlyError } from './errors'
import { Mass } from './Mass'
import { IconArrow, IconFolder, IconPlay, IconStop } from './Icons'

/**
 * La hoja del trabajo: el velo, el porcentaje y el desenlace.
 *
 * Un bloqueo, no un aviso. Mientras FFmpeg escribe, la ventana no admite otra
 * orden que detener, y la forma tiene que decirlo antes de que nadie lo intente:
 * el velo apaga lo de abajo y se queda con el puntero, y la hoja se lleva el
 * foco del teclado.
 *
 * **No se va al terminar: cambia de cara.** Antes desaparecía en el instante en
 * que el trabajo acababa y el resultado aparecía al pie del cuerpo desplazable,
 * detrás de todo lo demás; quien había estado mirando el porcentaje en el centro
 * de la pantalla se quedaba mirando un sitio vacío. Ahora el desenlace se lee
 * donde se estuvo esperando.
 *
 * La usan los dos módulos que escriben archivos — comprimir y exportar el
 * montaje — con los mismos gestos y distintas palabras. Dos hojas parecidas
 * habrían acabado siendo dos hojas distintas.
 */
export function Working({
  progress,
  result,
  error,
  filename,
  path,
  labels,
  runningNote,
  canceledNote,
  onCancel,
  onClose,
  onWatch
}: {
  progress: JobProgress | null
  result: JobResult | null
  /** El fallo ya traducido. Si falta, se enseña el crudo de FFmpeg. */
  error: FriendlyError | null
  /** Qué se está escribiendo, mientras se escribe. */
  filename: string
  path: string
  labels: { running: string; done: string; canceled: string; failed: string }
  runningNote: string
  canceledNote: string
  onCancel: () => void
  onClose: () => void
  /** Abrir el archivo recién escrito en el reproductor. */
  onWatch: (path: string) => void
}): JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement>(null)
  const open = progress !== null
  const running = open && result === null

  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    return () => {
      // Al cerrarse, el foco vuelve de donde salió — casi siempre el botón que
      // lanzó el trabajo. Se comprueba que siga a la vista: si la hoja se fue
      // porque «Ver el resultado» cambió de archivo, ese botón está en el módulo
      // que se acaba de ocultar, y devolverle el foco sería dejarlo en un sitio
      // invisible.
      if (before?.isConnected && before.offsetParent !== null) before.focus?.()
    }
  }, [open])

  // El corral del teclado se rehace al pasar de trabajando a terminado: son dos
  // juegos de teclas distintos, y el primero de cada juego recibe el foco.
  useEffect(() => {
    if (!open) return
    const keys = (): HTMLElement[] =>
      Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('button') ?? [])
    keys()[0]?.focus()
    const onKey = (e: KeyboardEvent): void => {
      // Escape sólo cierra lo que ya terminó. Mientras se escribe el archivo,
      // detener es una decisión, y no una que se tome con la tecla de descartar.
      if (e.key === 'Escape' && !running) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = keys()
      if (!items.length) return
      e.preventDefault()
      const at = items.indexOf(document.activeElement as HTMLElement)
      const next = at < 0 ? 0 : (at + (e.shiftKey ? -1 : 1) + items.length) % items.length
      items[next]?.focus()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, running, onClose])

  const stop = useCallback(() => onCancel(), [onCancel])

  if (!open) return null

  return (
    <div
      className="working"
      role="dialog"
      aria-modal="true"
      aria-labelledby="working-title"
      /* Un archivo soltado sobre el velo llegaría a la ventana por burbujeo, y
         la ficha de arriba pasaría a describir otro video mientras este se
         escribe. Aquí el arrastre muere. */
      onDragEnter={(e) => e.stopPropagation()}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onDragLeave={(e) => e.stopPropagation()}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="working-sheet" ref={sheetRef}>
        {progress && result === null ? (
          <>
            <h2 className="working-title" id="working-title">
              {labels.running}
            </h2>
            <p className="working-name" title={path}>
              {filename}
            </p>

            <div className="working-figure">
              {/* El porcentaje manda: es lo único que contesta «¿cuánto falta?»
                  desde el otro lado de la habitación. */}
              <span className="working-pct" aria-hidden="true">
                {progress.percent.toFixed(0)}
                <i>%</i>
              </span>
              <span className="working-side">
                <span className="mass-k">Escrito</span>
                <span className="mass-v">{formatBytes(progress.outSizeBytes)}</span>
              </span>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Progreso del trabajo"
              aria-valuenow={Math.round(progress.percent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${Math.round(progress.percent)} %`}
            >
              <div
                className="progress-fill"
                style={{ transform: `scaleX(${progress.percent / 100})` }}
              />
            </div>

            <div className="working-stats">
              {/* Hasta que FFmpeg no lleva unos segundos de trabajo no hay ni
                  velocidad ni tiempo restante que decir. Se dice eso, en vez de
                  dejar el hueco vacío y que parezca que se colgó. */}
              {progress.speed !== null ? (
                <span>{progress.speed.toFixed(1)}× de tiempo real</span>
              ) : (
                <span>arrancando</span>
              )}
              {progress.etaSec !== null && <span>faltan {formatDuration(progress.etaSec)}</span>}
            </div>

            <div className="working-acts">
              <button type="button" className="act act-quiet" onClick={stop}>
                <IconStop aria-hidden="true" />
                Detener
              </button>
              <p className="working-note">{runningNote}</p>
            </div>
          </>
        ) : result?.status === 'done' ? (
          <>
            <h2 className="working-title" id="working-title">
              {labels.done}
            </h2>
            {/* El nombre que salió, no el que entró: es un archivo nuevo, y es
                el que hay que buscar en la carpeta. */}
            <p className="working-name" title={result.outputPath ?? ''}>
              {result.outputPath?.split(/[\\/]/).pop() ?? ''}
            </p>

            <div className="working-result">
              {/* Sin peso de entrada no hay flecha que dibujar: un montaje sale
                  de varios archivos y compararlo con la suma de todos no
                  significa nada. Ahí se dice sólo lo que pesa lo que salió. */}
              {result.inputSizeBytes > 0 && result.ratio !== null ? (
                <>
                  <Mass bytes={result.inputSizeBytes} />
                  <IconArrow aria-hidden="true" />
                  <Mass bytes={result.outputSizeBytes} strong />
                  <span className="mass-drop">−{Math.round((1 - result.ratio) * 100)}%</span>
                </>
              ) : (
                <>
                  <span className="mass-k">Pesa</span>
                  <Mass bytes={result.outputSizeBytes} strong />
                </>
              )}
            </div>

            {/* Las dos cosas que se hacen con un archivo recién escrito, en el
                sitio donde se estuvo esperando a que apareciera. Mirarlo va
                primero y con peso: la cifra de arriba dice cuánto pesa, no cómo
                se ve, y comprobar que no se arruinó es lo único que la cifra no
                puede contestar. */}
            <div className="working-acts">
              <button
                type="button"
                className="act act-commit"
                onClick={() => onWatch(result.outputPath!)}
              >
                <IconPlay aria-hidden="true" />
                Ver el resultado
              </button>
              <button
                type="button"
                className="act act-quiet"
                onClick={() => void window.videoscaler.revealInFolder(result.outputPath!)}
              >
                <IconFolder aria-hidden="true" />
                Ver en la carpeta
              </button>
              <button type="button" className="act act-quiet working-close" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        ) : result?.status === 'canceled' ? (
          <>
            <h2 className="working-title" id="working-title">
              {labels.canceled}
            </h2>
            <p className="working-name" title={path}>
              {filename}
            </p>
            <p className="working-say">{canceledNote}</p>
            {/* Sin `working-close`: es el único botón de la fila, y no hay de
                qué apartarlo. */}
            <div className="working-acts">
              <button type="button" className="act act-quiet" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="working-title" id="working-title">
              {labels.failed}
            </h2>
            <p className="working-name" title={path}>
              {filename}
            </p>
            {/* El mismo texto que queda en el aviso del cuerpo: aquí para leerlo
                ahora, y allí para volver a leerlo después de cerrar, con el
                detalle técnico a un clic. */}
            <p className="working-say">
              {error?.message ?? result?.error ?? 'FFmpeg terminó sin escribir el archivo.'}
            </p>
            <div className="working-acts">
              <button type="button" className="act act-quiet" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
