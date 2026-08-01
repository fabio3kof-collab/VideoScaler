import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { UpdateState } from '@shared/types'
import { IconAlert, IconCheck, IconUpdate } from './Icons'

/**
 * Buscar e instalar una versión nueva, sin cerrar la aplicación.
 *
 * Vive en la cabecera y no dentro del cuerpo porque el cuerpo sólo existe
 * cuando hay un archivo cargado: quien abre la app y no suelta nada tiene
 * exactamente el mismo derecho a saber que hay una versión nueva.
 *
 * Un solo botón para los cinco estados, en vez de un botón más avisos sueltos.
 * El estado de la actualización es una sola cosa y se dice en un solo sitio; si
 * además apareciera como aviso en el cuerpo, serían dos verdades que hay que
 * mantener de acuerdo.
 */
export function Update({ update }: { update: UpdateState }): JSX.Element {
  // Sin esto no se distingue «no hay nada» de «acabas de preguntar y no hay
  // nada», que es justo lo que el usuario necesita oír tras pulsar.
  const [asked, setAsked] = useState(false)

  useEffect(() => {
    if (!asked || update.status !== 'none') return
    const t = setTimeout(() => setAsked(false), 5000)
    return () => clearTimeout(t)
  }, [asked, update.status])

  const working = update.status === 'checking' || update.status === 'downloading'
  const ready = update.status === 'ready'

  const label = ((): string => {
    switch (update.status) {
      case 'checking':
        return 'Buscando…'
      case 'available':
        return `Descargando ${update.version}`
      case 'downloading':
        return `Descargando ${update.percent} %`
      case 'ready':
        return `Reiniciar e instalar ${update.version}`
      case 'error':
        return 'Reintentar la búsqueda'
      case 'none':
        return asked ? 'Ya estás al día' : 'Buscar actualizaciones'
      default:
        return 'Buscar actualizaciones'
    }
  })()

  const icon =
    update.status === 'error' ? (
      <IconAlert aria-hidden="true" />
    ) : update.status === 'none' && asked ? (
      <IconCheck aria-hidden="true" />
    ) : (
      <IconUpdate aria-hidden="true" />
    )

  return (
    <button
      type="button"
      className={`act act-quiet bar-update${working ? ' is-working' : ''}`}
      disabled={working}
      onClick={() => {
        if (ready) {
          void window.videoscaler.installUpdate()
          return
        }
        setAsked(true)
        void window.videoscaler.checkForUpdates()
      }}
    >
      {icon}
      {label}
      {/* La cuenta la lleva el propio botón: mientras trabaja, un pliegue lo
          recorre. Se anuncia aparte porque el rótulo cambia solo. */}
      <span className="sr-only" aria-live="polite">
        {working ? label : ''}
      </span>
    </button>
  )
}
