import type { JSX } from 'react'
import { formatBytes, formatKilobytes } from './defaults'

/**
 * Un peso dicho dos veces: megabytes arriba, kilobytes debajo y más chicos.
 *
 * Los MB son la cifra con la que se decide — es la unidad del límite de
 * WhatsApp, del correo, del pendrive — pero están redondeados a la décima, y
 * ahí adentro caben cien kilobytes de diferencia. Los KB no compiten con esa
 * lectura: van debajo, en gris, para quien necesita el número exacto.
 *
 * Vive en su propio archivo porque lo usan los tres sitios donde esta ventana
 * dice un peso: la barra de masa, el acta del resultado y la hoja del trabajo.
 */
export function Mass({
  bytes,
  strong = false
}: {
  bytes: number | null
  strong?: boolean
}): JSX.Element {
  const kb = formatKilobytes(bytes)
  return (
    <span className="mass-fig">
      <span className={strong ? 'mass-v mass-v-strong' : 'mass-v'}>{formatBytes(bytes)}</span>
      {kb && (
        <span className="mass-sub" aria-hidden="true">
          {kb}
        </span>
      )}
    </span>
  )
}
