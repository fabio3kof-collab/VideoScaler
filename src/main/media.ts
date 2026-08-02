import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, resolve as resolvePath } from 'node:path'
import { Readable } from 'node:stream'
import { protocol } from 'electron'
import log from 'electron-log'

/**
 * Cómo llega un archivo local al reproductor del renderer.
 *
 * `file://` no sirve: en desarrollo el renderer se carga desde http://localhost
 * y Chromium bloquea todo subrecurso `file:` desde un origen http, así que el
 * video andaría en el instalador y no al desarrollarlo — la peor forma de
 * romperse. Un esquema propio funciona igual en los dos casos.
 *
 * Y no es un pasillo abierto al disco: sólo se sirven las rutas que el usuario
 * abrió por el diálogo o soltó en la ventana. El renderer sigue sin poder leer
 * un archivo que no eligió, que es la razón por la que existe `contextIsolation`
 * en esta aplicación.
 */
export const MEDIA_SCHEME = 'vsmedia'

/** Rutas que el usuario abrió. Sólo estas se sirven. */
const granted = new Set<string>()

/** Windows no distingue mayúsculas en rutas; comparar tal cual daría falsos no. */
function key(path: string): string {
  const abs = resolvePath(path)
  return process.platform === 'win32' ? abs.toLowerCase() : abs
}

/** Autoriza una ruta y devuelve la URL con la que el renderer puede pedirla. */
export function grantMedia(path: string): string {
  granted.add(key(path))
  return `${MEDIA_SCHEME}://file/${encodeURIComponent(resolvePath(path))}`
}

export function revokeMedia(path: string): void {
  granted.delete(key(path))
}

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.ogv': 'video/ogg',
  '.ts': 'video/mp2t',
  '.m2ts': 'video/mp2t',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.3gp': 'video/3gpp',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv'
}

/** `bytes=1024-` o `bytes=1024-2047`. Cualquier otra forma se ignora. */
function parseRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return null

  // Sufijo: `bytes=-500` son los últimos 500 bytes, no del 0 al 500.
  if (rawStart === '') {
    const length = Number(rawEnd)
    if (!Number.isFinite(length) || length <= 0) return null
    return { start: Math.max(0, size - length), end: size - 1 }
  }

  const start = Number(rawStart)
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return null
  return { start, end }
}

function body(stream: Readable): ReadableStream {
  return Readable.toWeb(stream) as unknown as ReadableStream
}

export function registerMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    let path: string
    try {
      path = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ''))
    } catch {
      return new Response('URL ilegible', { status: 400 })
    }

    if (!granted.has(key(path))) {
      log.warn(`[media] ruta no autorizada: ${path}`)
      return new Response('No autorizado', { status: 403 })
    }

    let size: number
    try {
      size = (await stat(path)).size
    } catch (err) {
      return new Response(String(err), { status: 404 })
    }

    const headers: Record<string, string> = {
      'Content-Type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      // El canvas de captura se ensucia si el video se considera de otro origen
      // sin permiso explícito, y un canvas sucio no deja exportar la imagen.
      // Con esta cabecera y `crossOrigin="anonymous"` en el elemento, la
      // captura de fotograma es legal.
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }

    const rangeHeader = request.headers.get('Range')
    if (!rangeHeader) {
      return new Response(body(createReadStream(path)), {
        status: 200,
        headers: { ...headers, 'Content-Length': String(size) }
      })
    }

    const range = parseRange(rangeHeader, size)
    if (!range || range.start >= size) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, 'Content-Range': `bytes */${size}` }
      })
    }

    // Sin esto no hay búsqueda en la línea de tiempo: saltar a un minuto exige
    // pedir el trozo que lo contiene, no el archivo entero desde el principio.
    return new Response(body(createReadStream(path, { start: range.start, end: range.end })), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
        'Content-Length': String(range.end - range.start + 1)
      }
    })
  })
}
