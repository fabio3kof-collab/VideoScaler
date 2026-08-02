import type { JSX } from 'react'
import type { FriendlyError } from './errors'
import { IconAlert, IconArrow } from './Icons'
import logo from './assets/logo.png'

/**
 * Estado vacío: la hoja en reposo.
 *
 * La figura es la marca oficial. Antes fue el paquete de foil dibujado en la
 * gramática del pliegue, y la razón para cambiarlo no es estética sino de
 * identidad: la pantalla vacía es la primera vez que alguien ve la aplicación
 * después del icono que abrió, y las dos imágenes tienen que ser la misma.
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
          <img src={logo} alt="" width={128} height={128} />
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
