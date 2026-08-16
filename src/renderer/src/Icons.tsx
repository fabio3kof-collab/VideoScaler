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

/*
 * Transporte del reproductor. Van en contorno como el resto, y no rellenos como
 * los suele dibujar cualquier reproductor: en esta hoja todo es filete, y un
 * triángulo macizo sería la única mancha sólida de la interfaz que no es foil.
 */

export function IconPlay(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M5 3.4 12.8 8 5 12.6Z" />
    </svg>
  )
}

export function IconPause(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M4.6 3.6h2.4v8.8H4.6ZM9 3.6h2.4v8.8H9Z" />
    </svg>
  )
}

/** Un cuadro atrás: el tope contra el que choca la imagen. */
export function IconStepBack(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M12.4 3.4 5.4 8l7 4.6Z" />
      <path d="M3.2 3.4v9.2" />
    </svg>
  )
}

export function IconStepNext(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M3.6 3.4 10.6 8l-7 4.6Z" />
      <path d="M12.8 3.4v9.2" />
    </svg>
  )
}

/** Captura: la caja, el visor y el rombo del diafragma. Ni una curva. */
export function IconCamera(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M1.8 5.2h3.1l1.3-1.8h3.6l1.3 1.8h3.1v8H1.8Z" />
      <path d="M8 6.9 9.9 9.2 8 11.5 6.1 9.2Z" />
    </svg>
  )
}

/** Enfoque: las cuatro escuadras del recuadro y la cruz que marca el centro. */
export function IconFocus(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M2.2 5.4V2.2h3.2M10.6 2.2h3.2v3.2M13.8 10.6v3.2h-3.2M5.4 13.8H2.2v-3.2" />
      <path d="M6.4 8h3.2M8 6.4v3.2" />
    </svg>
  )
}

export function IconSound(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M1.8 6.1h2.7l3.6-2.9v9.6L4.5 9.9H1.8Z" />
      <path d="M10.4 5.9 12.2 8l-1.8 2.1M12.8 4.2 15.2 8l-2.4 3.8" />
    </svg>
  )
}

export function IconMute(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M1.8 6.1h2.7l3.6-2.9v9.6L4.5 9.9H1.8Z" />
      <path d="M10.6 6.2 14 9.8M14 6.2l-3.4 3.6" />
    </svg>
  )
}

/* Los del banco de trabajo. Misma gramática: sin curvas, sin glifos. */

/** Cortar: la línea del corte y las dos mitades separándose. Unas tijeras a
    16 px son dos rizos ilegibles; esto es lo que el gesto hace de verdad. */
export function IconCut(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M8 1.6v12.8" />
      <path d="M6.2 4.4H2.4v7.2h3.8M9.8 4.4h3.8v7.2H9.8" />
    </svg>
  )
}

/** Vínculo: dos eslabones rectos que comparten un tramo. */
export function IconLink(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M6.4 4.2H3.2v3.2M3.2 7.4v-3.2h3.2" />
      <path d="M9.6 11.8h3.2V8.6M12.8 8.6v3.2H9.6" />
      <path d="M5.6 10.4 10.4 5.6" />
    </svg>
  )
}

export function IconPlus(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M8 2.8v10.4M2.8 8h10.4" />
    </svg>
  )
}

/** Quitar: la caja y la tapa, sin asa ni curvas. */
export function IconTrash(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M2.6 4.2h10.8M6.2 4.2V2.6h3.6v1.6" />
      <path d="M4 4.2 4.8 13.4h6.4L12 4.2" />
    </svg>
  )
}

/** Deshacer: la flecha que vuelve por donde vino, en ángulos rectos como todo
    lo demás — un arco aquí sería la única curva del juego. */
export function IconUndo(p: P): JSX.Element {
  return (
    <svg {...base} {...p}>
      <path d="M2.8 6.6h9.4v6.6H6.6" />
      <path d="M6 3.4 2.6 6.6 6 9.8" />
    </svg>
  )
}
