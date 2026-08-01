import { useRef } from 'react'
import type { JSX, ReactNode } from 'react'

/**
 * Una fila de pliegue.
 *
 * `kind` no es color decorativo: montaña son los controles que quitan peso,
 * valle los que preservan calidad, y `none` las filas que no son palancas.
 * Los dos tipos se distinguen por forma además de por color — relleno contra
 * contorno — porque un usuario con deficiencia de color no puede leer un gris
 * claro contra un azul claro.
 */
export function Crease({
  kind,
  label,
  hint,
  value,
  hidden = false,
  children
}: {
  kind: 'mountain' | 'valley' | 'none'
  label: string
  hint?: string
  value?: string
  /**
   * Una palanca puede mudarse a otra sección según el modo. Se declara aquí y
   * no envolviendo la fila en el punto de uso porque estas filas son largas:
   * enterrarlas en una condicional esconde de qué palanca se trata.
   */
  hidden?: boolean
  children: ReactNode
}): JSX.Element | null {
  if (hidden) return null

  return (
    <div className={`crease${value === undefined ? ' crease-novalue' : ''}`}>
      {kind === 'none' ? (
        <span aria-hidden="true" />
      ) : (
        <span
          className={`crease-mark crease-mark-${kind}`}
          role="img"
          aria-label={kind === 'mountain' ? 'Quita peso' : 'Preserva calidad'}
        />
      )}
      <div>
        <span className="crease-label">{label}</span>
        {hint && <span className="crease-hint">{hint}</span>}
      </div>
      {children}
      {value !== undefined && <span className="crease-value">{value}</span>}
    </div>
  )
}

/**
 * Grupo de opciones mutuamente excluyentes.
 *
 * Es un radiogroup, no una fila de botones de alternar: sólo una opción puede
 * estar activa y siempre hay una. Con tabindex móvil, para que cruzar la hoja
 * desplegada no cueste treinta tabulaciones.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label
}: {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  label: string
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  const move = (delta: number): void => {
    const i = options.findIndex((o) => o.value === value)
    const next = options[(i + delta + options.length) % options.length]
    if (!next) return
    onChange(next.value)
    // El foco sigue a la selección, como en un radiogroup nativo.
    requestAnimationFrame(() => {
      const buttons = ref.current?.querySelectorAll('button')
      buttons?.[(i + delta + options.length) % options.length]?.focus()
    })
  }

  return (
    <div className="seg" role="radiogroup" aria-label={label} ref={ref}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault()
              move(1)
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault()
              move(-1)
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Palanca continua.
 *
 * Existe para las características que son un recorrido y no un juego de
 * opciones: ahí lo que el usuario decide es cuánto, no cuál. Los extremos van
 * rotulados porque un riel sin números no dice hacia dónde se empeora.
 */
export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  valueText,
  ends
}: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  /** Lo que anuncia un lector de pantalla: el número solo rara vez se explica. */
  valueText: string
  /** Rótulos de los extremos. Se omiten cuando la fila ya dice el recorrido. */
  ends?: [string, string]
}): JSX.Element {
  return (
    <div className="slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {ends && (
        <span className="slider-ends">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </span>
      )}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}): JSX.Element {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}
