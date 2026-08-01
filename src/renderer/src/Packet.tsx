import type { JSX } from 'react'
import type { FriendlyError } from './errors'
import { IconAlert, IconArrow } from './Icons'

/**
 * Estado vacío: la hoja en reposo.
 *
 * El paquete es la tesis de la ventana en una imagen — algo grande guardado en
 * algo pequeño. Se dibuja, no se ilustra con un icono de librería.
 */
export function Packet({
  onPick,
  dragging,
  probing,
  error
}: {
  onPick: () => void
  dragging: boolean
  probing: boolean
  error: FriendlyError | null
}): JSX.Element {
  return (
    <div className={`packet-wrap${dragging ? ' dropping' : ''}`}>
      <div className="packet">
        <div className={`packet-figure${probing ? ' is-probing' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 168 148">
            {/* La hoja desplegada, tenue: lo que el paquete contiene. */}
            <g stroke="var(--mountain)" strokeWidth="1" fill="none" opacity="0.85">
              <path d="M62 30 96 14l34 16 34-16v58l-34 16-34-16-34 16Z" />
              <path d="M96 14v58M130 30v58M62 59h102" />
            </g>
            {/* Pliegues valle, marcando la dirección del despliegue. */}
            <g stroke="var(--valley-line)" strokeWidth="1" fill="none" opacity="0.9">
              <path d="M62 30 96 46l34-16 34 16" />
            </g>
            {/* El paquete de foil: compacto, denso, con la tesis dentro. */}
            <g>
              <path d="M12 74 46 58l34 16v40L46 130 12 114Z" fill="var(--foil)" />
              <path
                d="M12 74 46 90l34-16M46 90v40"
                stroke="#8a6c18"
                strokeWidth="1"
                fill="none"
                opacity="0.55"
              />
            </g>
          </svg>
        </div>

        {probing ? (
          <>
            <h1>Leyendo el archivo</h1>
            <p aria-live="polite">
              Midiendo duración, resolución y bitrate. En archivos grandes o en una unidad de red
              tarda unos segundos.
            </p>
          </>
        ) : (
          <>
            <h1>Haz que quepa, sin arruinarlo</h1>
            <p>
              Suelta un video aquí y VideoScaler te muestra su peso, qué lo compone y cada palanca
              que puede bajarlo.
            </p>

            {error && (
              <p className="notice" role="alert">
                <IconAlert aria-hidden="true" />
                <span>{error.message}</span>
              </p>
            )}

            <button type="button" className="act act-commit" onClick={onPick}>
              Elegir archivo
              <IconArrow aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
