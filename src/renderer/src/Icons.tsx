import type { JSX, SVGProps } from 'react'

/*
 * Iconos dibujados en la gramática del patrón: aristas rectas, ángulos de 60°,
 * un solo grosor de trazo. Nada de glifos unicode ni librerías genéricas — en
 * un mundo de pliegues, un icono redondeado de librería se delata.
 */

type P = SVGProps<SVGSVGElement>

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

/** Paquete plegado: la hoja en reposo. */
export function IconPacket(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M3 4.2 8 2l5 2.2v7.6L8 14l-5-2.2Z" />
      <path d="M3 4.2 8 6.4l5-2.2M8 6.4V14" />
    </svg>
  )
}

/** Hoja desplegada: cuatro celdas del patrón, lo máximo que resiste a 16px. */
export function IconSheet(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M2 4.5h5.5v3.5H2ZM7.5 4.5H13v3.5H7.5Z" />
      <path d="M3 8h5.5v3.5H3ZM8.5 8H14v3.5H8.5Z" />
    </svg>
  )
}

/** Flecha del pliegue: dirección de la acción. */
export function IconArrow(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M2.5 8h11M9.5 4l4 4-4 4" />
    </svg>
  )
}

export function IconChevron(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

export function IconAlert(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M8 1.8 15 14H1Z" />
      <path d="M8 6.2v3.4M8 11.6v.1" />
    </svg>
  )
}

export function IconFolder(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M1.8 3.5h4.4l1.6 2h6.4v7H1.8Z" />
    </svg>
  )
}

export function IconStop(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M4.5 4.5h7v7h-7Z" />
    </svg>
  )
}

/**
 * Actualización: algo que baja hasta la hoja.
 *
 * Recta y no circular a propósito. La flecha en círculo es el glifo de librería
 * para «recargar», y aquí una curva se delataría entre puros pliegues: el
 * mundo no tiene un solo radio.
 */
export function IconUpdate(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M8 2v7.4M5 6.6 8 9.6l3-3" />
      <path d="M2.6 12.4h10.8" />
    </svg>
  )
}

export function IconCheck(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M2.5 8.4 6 12l7.5-8" />
    </svg>
  )
}
