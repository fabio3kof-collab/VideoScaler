// Genera build/icon.png (512x512): el paquete de foil de Packet.tsx sobre tinta.
// Rasterizador propio (polígonos + líneas gruesas, 4x supersampling) y PNG con zlib.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2]
const S = 512
const SS = 4 // supersampling
const W = S * SS

const buf = new Float64Array(W * W * 4) // RGBA premultiplicado-no, plano

function setPx(i, r, g, b, a) {
  const o = i * 4
  const ia = 1 - a
  buf[o] = buf[o] * ia + r * a
  buf[o + 1] = buf[o + 1] * ia + g * a
  buf[o + 2] = buf[o + 2] * ia + b * a
  buf[o + 3] = buf[o + 3] * ia + 255 * a
}

function fillAll(r, g, b) {
  for (let i = 0; i < W * W; i++) setPx(i, r, g, b, 1)
}

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

// Relleno de polígono por regla par-impar, escaneando filas.
function fillPoly(pts, colorAt) {
  let minY = Infinity,
    maxY = -Infinity
  for (const [, y] of pts) {
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const y0 = Math.max(0, Math.floor(minY))
  const y1 = Math.min(W - 1, Math.ceil(maxY))
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5
    const xs = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      if (ay === by) continue
      if (cy >= Math.min(ay, by) && cy < Math.max(ay, by)) {
        xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax))
      }
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5))
      const xb = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5))
      for (let x = xa; x <= xb; x++) {
        const [r, g, b, a] = colorAt(x, y)
        setPx(y * W + x, r, g, b, a)
      }
    }
  }
}

// Línea gruesa = quad con extremos a tope.
function line(x0, y0, x1, y1, width, color, alpha) {
  const dx = x1 - x0,
    dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * (width / 2)
  const ny = (dx / len) * (width / 2)
  const [r, g, b] = color
  fillPoly(
    [
      [x0 + nx, y0 + ny],
      [x1 + nx, y1 + ny],
      [x1 - nx, y1 - ny],
      [x0 - nx, y0 - ny]
    ],
    () => [r, g, b, alpha]
  )
}

// --- composición -----------------------------------------------------------

const INK = hex('#0a0a0a')
const FOIL_A = hex('#e8c85e')
const FOIL_B = hex('#d4af37')
const FOIL_C = hex('#b38f2a')
const FOLD = hex('#8a6c18')

fillAll(...INK)

// Geometría original del paquete (viewBox 168x148 de Packet.tsx).
const SRC = [
  [12, 74],
  [46, 58],
  [80, 74],
  [80, 114],
  [46, 130],
  [12, 114]
]
const BX = 12,
  BY = 58,
  BW = 68,
  BH = 72
const TARGET = 336 * SS // alto del paquete en px de supersampling
const scale = TARGET / BH
const offX = (W - BW * scale) / 2
const offY = (W - BH * scale) / 2
const P = ([x, y]) => [offX + (x - BX) * scale, offY + (y - BY) * scale]

// Gradiente de foil a 103°, como en .act-commit.
const ang = (103 * Math.PI) / 180
const gx = Math.cos(ang),
  gy = Math.sin(ang)
const proj = (x, y) => {
  const t = ((x - W / 2) * gx + (y - W / 2) * gy) / (W * 0.62) + 0.5
  return Math.min(1, Math.max(0, t))
}
const lerp = (a, b, t) => a + (b - a) * t
const foilAt = (x, y) => {
  const t = proj(x, y)
  const [c0, c1, k] = t < 0.5 ? [FOIL_A, FOIL_B, t * 2] : [FOIL_B, FOIL_C, (t - 0.5) * 2]
  return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k), 1]
}

// Tres caras, no un bloque: el gradiente de foil recorre la pieza entera y cada
// cara se separa por luz, de modo que el pliegue se lee incluso a 16px.
const faced = (mul) => (x, y) => {
  const c = foilAt(x, y)
  return [
    Math.min(255, c[0] * mul),
    Math.min(255, c[1] * mul),
    Math.min(255, c[2] * mul),
    1
  ]
}
const TOP = [[12, 74], [46, 58], [80, 74], [46, 90]]
const LEFT = [[12, 74], [46, 90], [46, 130], [12, 114]]
const RIGHT = [[46, 90], [80, 74], [80, 114], [46, 130]]

fillPoly(TOP.map(P), faced(1.14))
fillPoly(LEFT.map(P), faced(0.88))
fillPoly(RIGHT.map(P), faced(0.6))

// Los tres pliegues: la tapa en V y la arista vertical.
const lw = 1.2 * scale
line(...P([12, 74]), ...P([46, 90]), lw, FOLD, 0.45)
line(...P([46, 90]), ...P([80, 74]), lw, FOLD, 0.45)
line(...P([46, 90]), ...P([46, 130]), lw, FOLD, 0.45)

// --- downsample + PNG ------------------------------------------------------

const out = Buffer.alloc(S * S * 4)
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    let r = 0,
      g = 0,
      b = 0,
      a = 0
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const o = ((y * SS + sy) * W + (x * SS + sx)) * 4
        r += buf[o]
        g += buf[o + 1]
        b += buf[o + 2]
        a += buf[o + 3]
      }
    }
    const n = SS * SS
    const o = (y * S + x) * 4
    out[o] = Math.round(r / n)
    out[o + 1] = Math.round(g / n)
    out[o + 2] = Math.round(b / n)
    out[o + 3] = Math.round(a / n)
  }
}

const raw = Buffer.alloc(S * (S * 4 + 1))
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0
  out.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([len, body, crc])
}
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

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8
ihdr[9] = 6
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

mkdirSync(join(OUT, '..'), { recursive: true })
writeFileSync(OUT, png)
console.log('escrito', OUT, png.length, 'bytes')
