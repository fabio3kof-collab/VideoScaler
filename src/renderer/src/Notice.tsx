import { useState } from 'react'
import type { JSX, ReactNode } from 'react'
import type { FriendlyError } from './errors'
import { IconAlert } from './Icons'

/**
 * El aviso, con su detalle técnico plegado.
 *
 * Vive fuera de los módulos porque el mismo fallo puede alcanzarlos a los dos:
 * un archivo que no se deja leer rompe tanto al compresor como al reproductor,
 * y el usuario tiene que leer lo mismo en ambos sitios.
 */
export function Notice({
  tone = 'alert',
  icon,
  children
}: {
  tone?: 'alert' | 'quiet'
  icon?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    // Un fallo interrumpe; una confirmación espera su turno. Anunciar «guardado»
    // con la misma urgencia que «no se pudo leer el archivo» gasta la urgencia.
    <p
      className={`notice${tone === 'quiet' ? ' notice-quiet' : ''}`}
      role={tone === 'alert' ? 'alert' : 'status'}
    >
      {icon ?? <IconAlert aria-hidden="true" />}
      <span>{children}</span>
    </p>
  )
}

/** Un fallo con su causa cruda a un clic: el mensaje explica, el detalle prueba. */
export function ErrorNotice({ error }: { error: FriendlyError }): JSX.Element {
  const [shown, setShown] = useState(false)

  return (
    <Notice>
      {error.message}{' '}
      <button type="button" className="link" onClick={() => setShown((s) => !s)}>
        {shown ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}
      </button>
      {shown && <code className="detail">{error.detail}</code>}
    </Notice>
  )
}
