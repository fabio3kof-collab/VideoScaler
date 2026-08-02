// Genera la gráfica de la marca a partir del logo oficial:
//   build/icon.png                        512x512, de donde salen todos los .ico
//   build/installerSidebar.bmp            164x314, el panel del asistente
//   src/renderer/src/assets/logo.png      256x256, la marca dentro de la ventana
//
// El logo no se dibuja aquí: es una pieza de diseño que vive en
// `Logo/Logo oficial 2.png`. Este script sólo lo lleva a los tamaños y formatos
// que electron-builder y NSIS exigen — y NSIS exige BMP, no hay alternativa.
//
// Se usa tal cual, con su fondo. Recortarlo para dejar las esquinas
// transparentes se probó y se descartó: el brillo de la pieza se derrama fuera
// de su propio contorno, así que no hay silueta limpia que recortar y el borde
// queda sucio. Si algún día llega una versión con alfa, el decodificador ya la
// respeta y no hay nada que cambiar aquí.
//
// Sin dependencias de imagen: decodifica el PNG con zlib, remuestrea por área
// y vuelve a codificar. Añadir `sharp` traería binarios nativos por plataforma
// a un proyecto que sólo empaqueta Windows.
import { deflateSync, inflateSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SRC = process.argv[3] ?? join(ROOT, 'Logo', 'Logo oficial 2.png')
const OUT = process.argv[2] ?? join(ROOT, 'build', 'icon.png')
const S = 512

// --- decodificación ---------------------------------------------------------

function decodePng(file) {
  let b
  try {
    b = readFileSync(file)
  } catch {
    // `npm run dist` y `npm run release` regeneran la gráfica antes de
    // empaquetar, así que el logo tiene que estar versionado: si falta, el
    // paquete saldría con el icono de una versión anterior sin avisar.
    throw new Error(`falta el logo oficial en ${file} — está versionado en Logo/`)
  }
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i++) {
    if (b[i] !== sig[i]) throw new Error(`${file} no es un PNG`)
  }

  let w = 0
  let h = 0
  let depth = 0
  let color = 0
  let palette = null
  let alpha = null
  const idat = []

  for (let p = 8; p + 8 <= b.length; ) {
    const len = b.readUInt32BE(p)
    const type = b.toString('ascii', p + 4, p + 8)
    const data = b.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      depth = data[8]
      color = data[9]
      if (data[12] !== 0) throw new Error('PNG entrelazado: no soportado')
    } else if (type === 'PLTE') palette = Buffer.from(data)
    else if (type === 'tRNS') alpha = Buffer.from(data)
    else if (type === 'IDAT') idat.push(Buffer.from(data))
    else if (type === 'IEND') break
    p += 12 + len
  }

  if (depth !== 8) throw new Error(`profundidad ${depth} bits: sólo 8`)
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color]
  if (!CH) throw new Error(`tipo de color ${color} desconocido`)

  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * CH
  const px = Buffer.alloc(h * stride)

  // Deshacer los filtros por fila (PNG §9). `bpp` es la distancia en bytes al
  // píxel de la izquierda; en la primera fila la de arriba vale 0.
  const bpp = CH
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    const dst = y * stride
    const up = dst - stride
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x]
      const a = x >= bpp ? px[dst + x - bpp] : 0
      const bU = y > 0 ? px[up + x] : 0
      const c = y > 0 && x >= bpp ? px[up + x - bpp] : 0
      let out
      if (ft === 0) out = v
      else if (ft === 1) out = v + a
      else if (ft === 2) out = v + bU
      else if (ft === 3) out = v + ((a + bU) >> 1)
      else if (ft === 4) {
        const pp = a + bU - c
        const pa = Math.abs(pp - a)
        const pb = Math.abs(pp - bU)
        const pc = Math.abs(pp - c)
        out = v + (pa <= pb && pa <= pc ? a : pb <= pc ? bU : c)
      } else throw new Error(`filtro ${ft} desconocido en la fila ${y}`)
      px[dst + x] = out & 0xff
    }
  }

  // Todo se normaliza a RGBA: el remuestreo no quiere saber de formatos.
  const rgba = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const o = i * 4
    if (color === 6) {
      px.copy(rgba, o, i * 4, i * 4 + 4)
    } else if (color === 2) {
      px.copy(rgba, o, i * 3, i * 3 + 3)
      rgba[o + 3] = 255
    } else if (color === 0) {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = px[i]
      rgba[o + 3] = 255
    } else if (color === 4) {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = px[i * 2]
      rgba[o + 3] = px[i * 2 + 1]
    } else {
      const k = px[i]
      rgba[o] = palette[k * 3]
      rgba[o + 1] = palette[k * 3 + 1]
      rgba[o + 2] = palette[k * 3 + 2]
      rgba[o + 3] = alpha && k < alpha.length ? alpha[k] : 255
    }
  }
  return { w, h, rgba }
}

// --- remuestreo por área ----------------------------------------------------

// Un píxel de destino cubre un rectángulo del origen y se lleva el promedio de
// todo lo que hay dentro, con los bordes pesados por la fracción que tocan.
// Reducir 1387→512 tomando muestras sueltas dejaría las flechas y la rejilla
// del logo con dientes; aquí cada píxel de origen cuenta.
function resample(src, size) {
  const { w, h, rgba } = src
  const out = Buffer.alloc(size * size * 4)
  const sx = w / size
  const sy = h / size

  for (let y = 0; y < size; y++) {
    const y0 = y * sy
    const y1 = y0 + sy
    for (let x = 0; x < size; x++) {
      const x0 = x * sx
      const x1 = x0 + sx
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let wsum = 0
      for (let py = Math.floor(y0); py < Math.min(h, Math.ceil(y1)); py++) {
        const cy = Math.min(y1, py + 1) - Math.max(y0, py)
        for (let px = Math.floor(x0); px < Math.min(w, Math.ceil(x1)); px++) {
          const cx = Math.min(x1, px + 1) - Math.max(x0, px)
          const k = cy * cx
          if (k <= 0) continue
          const o = (py * w + px) * 4
          // Color premultiplicado por alfa: promediar RGB de un píxel
          // transparente arrastraría su color hacia el borde.
          const al = rgba[o + 3] / 255
          r += rgba[o] * al * k
          g += rgba[o + 1] * al * k
          b += rgba[o + 2] * al * k
          a += rgba[o + 3] * k
          wsum += k
        }
      }
      const o = (y * size + x) * 4
      const av = a / wsum
      const un = av > 0 ? 255 / av : 0
      out[o] = Math.min(255, Math.round((r / wsum) * un))
      out[o + 1] = Math.min(255, Math.round((g / wsum) * un))
      out[o + 2] = Math.min(255, Math.round((b / wsum) * un))
      out[o + 3] = Math.round(av)
    }
  }
  return out
}

// --- codificación -----------------------------------------------------------

let TBL = null
function crc32(b) {
  if (!TBL) {
    TBL = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      TBL[n] = c
    }
  }
  let c = -1
  for (let i = 0; i < b.length; i++) c = TBL[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return c ^ -1
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([len, body, crc])
}

function encodePng(px, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// BMP de 24 bits, filas de abajo arriba: el único formato que NSIS acepta para
// el panel del asistente. Sin canal alfa, así que el logo se compone antes
// sobre el fondo.
function encodeBmp(rgb, w, h) {
  const stride = Math.ceil((w * 3) / 4) * 4
  const body = Buffer.alloc(stride * h)
  for (let y = 0; y < h; y++) {
    const row = (h - 1 - y) * stride
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3
      body[row + x * 3] = rgb[o + 2]
      body[row + x * 3 + 1] = rgb[o + 1]
      body[row + x * 3 + 2] = rgb[o]
    }
  }
  const head = Buffer.alloc(54)
  head.write('BM', 0, 'ascii')
  head.writeUInt32LE(54 + body.length, 2)
  head.writeUInt32LE(54, 10)
  head.writeUInt32LE(40, 14)
  head.writeInt32LE(w, 18)
  head.writeInt32LE(h, 22)
  head.writeUInt16LE(1, 26)
  head.writeUInt16LE(24, 28)
  head.writeUInt32LE(body.length, 34)
  return Buffer.concat([head, body])
}

// El panel del instalador: el logo sobre el mismo negro de sus propias
// esquinas, de modo que la marca flote en el panel en vez de recortarse contra
// él. Ligeramente por encima del centro óptico — centrado exacto en un lienzo
// tan alto se lee como caído.
function sidebar(src, w, h, mark, bg) {
  const out = Buffer.alloc(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    out[i * 3] = bg[0]
    out[i * 3 + 1] = bg[1]
    out[i * 3 + 2] = bg[2]
  }
  const logo = resample(src, mark)
  const x0 = Math.round((w - mark) / 2)
  const y0 = Math.round(h * 0.42 - mark / 2)
  for (let y = 0; y < mark; y++) {
    for (let x = 0; x < mark; x++) {
      const dx = x0 + x
      const dy = y0 + y
      if (dx < 0 || dy < 0 || dx >= w || dy >= h) continue
      const s = (y * mark + x) * 4
      const a = logo[s + 3] / 255
      const d = (dy * w + dx) * 3
      for (let c = 0; c < 3; c++) {
        out[d + c] = Math.round(logo[s + c] * a + out[d + c] * (1 - a))
      }
    }
  }
  return out
}

// --- main -------------------------------------------------------------------

const src = decodePng(SRC)
if (src.w !== src.h) {
  console.warn(`aviso: el logo no es cuadrado (${src.w}x${src.h}); se deformará al cuadrar`)
}

const png = encodePng(resample(src, S), S)
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, png)
console.log(`escrito ${OUT} — ${S}x${S}, ${png.length} bytes, desde ${SRC}`)

const SIDE = join(dirname(OUT), 'installerSidebar.bmp')
const bmp = encodeBmp(sidebar(src, 164, 314, 116, [0x0a, 0x0a, 0x0a]), 164, 314)
writeFileSync(SIDE, bmp)
console.log(`escrito ${SIDE} — 164x314, ${bmp.length} bytes`)

// La marca dentro de la ventana. 256 px sirve a los dos usos con margen: 22 px
// en el wordmark y 132 px en el estado vacío, ambos en pantallas al 200%.
const MARK = 256
const APP = join(ROOT, 'src', 'renderer', 'src', 'assets', 'logo.png')
const mark = encodePng(resample(src, MARK), MARK)
mkdirSync(dirname(APP), { recursive: true })
writeFileSync(APP, mark)
console.log(`escrito ${APP} — ${MARK}x${MARK}, ${mark.length} bytes`)
