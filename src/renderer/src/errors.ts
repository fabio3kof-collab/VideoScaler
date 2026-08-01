/**
 * Traduce fallos técnicos a algo accionable.
 *
 * Un `ENOENT: no such file or directory` en rojo no le dice al usuario qué
 * pasó ni qué hacer. Cada mensaje nombra el problema y la salida; el texto
 * crudo sigue disponible tras una revelación para quien lo necesite.
 */

export interface FriendlyError {
  message: string
  detail: string
}

export function explain(raw: string, filename?: string): FriendlyError {
  const t = raw.toLowerCase()
  const name = filename ? `«${filename}»` : 'el archivo'

  if (t.includes('enoent') || t.includes('no such file')) {
    return {
      message: `No se encuentra ${name}. Puede haberse movido, renombrado o estar en una unidad desconectada. Vuelve a elegirlo.`,
      detail: raw
    }
  }
  if (t.includes('eacces') || t.includes('eperm') || t.includes('permission')) {
    return {
      message: `Windows no deja leer ${name}. Ciérralo en otros programas, o cópialo a tu carpeta de usuario e inténtalo desde ahí.`,
      detail: raw
    }
  }
  if (t.includes('enospc') || t.includes('no space')) {
    return {
      message:
        'No queda espacio en el disco de destino. Libera espacio o baja el peso objetivo antes de volver a comprimir.',
      detail: raw
    }
  }
  if (t.includes('invalid data') || t.includes('moov atom') || t.includes('does not contain')) {
    return {
      message: `${name} está incompleto o dañado, y FFmpeg no puede leerlo. Prueba con otra copia del archivo.`,
      detail: raw
    }
  }
  if (t.includes('unknown encoder') || t.includes('encoder not found')) {
    return {
      message:
        'Este códec no está disponible en la copia de FFmpeg incluida. Elige otro códec en la fila Códec.',
      detail: raw
    }
  }
  if (t.includes('nvenc') || t.includes('qsv') || t.includes('amf') || t.includes('hardware')) {
    return {
      message:
        'La aceleración por hardware falló: tu tarjeta no la admite para este códec. Cambia Aceleración por hardware a Ninguna.',
      detail: raw
    }
  }
  if (t.includes('ffmpeg') && t.includes('no se encontró')) {
    return { message: raw, detail: raw }
  }

  return {
    message: `No se pudo procesar ${name}. Revisa el detalle técnico o prueba con otro archivo.`,
    detail: raw
  }
}
