// Generates resources/icon.png — a flat document-editor icon that mirrors the
// app layout (navy title bar + left navigation sidebar + content lines).
// Pure Node (no native deps): draws with an analytic rounded-rect SDF for
// anti-aliasing, then encodes a 32-bit RGBA PNG via zlib.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const N = 1024
const buf = new Float32Array(N * N * 4) // straight RGBA, 0..1

function hex(h) {
  return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]
}

// Signed distance to a rounded rectangle centred at (cx,cy).
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  const outside = Math.hypot(ax, ay)
  const inside = Math.min(Math.max(qx, qy), 0)
  return outside + inside - r
}

function fillRoundRect(x, y, w, h, r, color, alpha = 1) {
  const [cr, cg, cb] = color
  const cx = x + w / 2
  const cy = y + h / 2
  const hw = w / 2
  const hh = h / 2
  const x0 = Math.max(0, Math.floor(x - 2))
  const x1 = Math.min(N, Math.ceil(x + w + 2))
  const y0 = Math.max(0, Math.floor(y - 2))
  const y1 = Math.min(N, Math.ceil(y + h + 2))
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const d = sdRoundRect(px + 0.5, py + 0.5, cx, cy, hw, hh, r)
      let cov = 0.5 - d
      if (cov <= 0) continue
      if (cov > 1) cov = 1
      const a = cov * alpha
      const i = (py * N + px) * 4
      buf[i] = cr * a + buf[i] * (1 - a)
      buf[i + 1] = cg * a + buf[i + 1] * (1 - a)
      buf[i + 2] = cb * a + buf[i + 2] * (1 - a)
      buf[i + 3] = a + buf[i + 3] * (1 - a)
    }
  }
}

// ---- Palette (matches the app theme) ----
const NAVY = hex('#1f3a5f')
const BLUE = hex('#2563eb')
const WHITE = hex('#ffffff')
const SIDEBAR = hex('#e9edf2')
const NAVLINE = hex('#c2ccd8')
const TEXTLINE = hex('#d7dde5')
const SHADOW = hex('#1f3a5f')

// Soft drop shadow, then the white "page" tile.
fillRoundRect(70, 96, 884, 884, 210, SHADOW, 0.14)
fillRoundRect(48, 48, 928, 928, 200, WHITE)

// Navy title bar (a rounded block near the top).
fillRoundRect(132, 150, 760, 150, 30, NAVY)
// A small "CI" square + title line inside the bar.
fillRoundRect(168, 186, 78, 78, 16, WHITE, 0.95)
fillRoundRect(280, 200, 430, 22, 11, WHITE, 0.85)
fillRoundRect(280, 244, 300, 18, 9, WHITE, 0.5)

// Left navigation sidebar.
fillRoundRect(132, 344, 210, 540, 30, SIDEBAR)
for (let k = 0; k < 4; k++) {
  const w = [150, 120, 138, 104][k]
  fillRoundRect(170, 392 + k * 70, w, 26, 13, NAVLINE)
}

// Content area: a blue heading line, then body text lines.
const cx = 374
fillRoundRect(cx, 366, 300, 34, 16, BLUE) // heading
const widths = [486, 452, 500, 430, 486, 360]
for (let k = 0; k < widths.length; k++) {
  fillRoundRect(cx, 440 + k * 62, widths[k], 24, 12, TEXTLINE)
}

// ---- Encode PNG (RGBA, 8-bit) ----
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(b) {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(N, 0)
ihdr.writeUInt32BE(N, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
// raw scanlines with filter byte 0
const raw = Buffer.alloc((N * 4 + 1) * N)
let p = 0
for (let y = 0; y < N; y++) {
  raw[p++] = 0
  for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4
    raw[p++] = Math.round(buf[i] * 255)
    raw[p++] = Math.round(buf[i + 1] * 255)
    raw[p++] = Math.round(buf[i + 2] * 255)
    raw[p++] = Math.round(buf[i + 3] * 255)
  }
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

mkdirSync('resources', { recursive: true })
writeFileSync('resources/icon.png', png)
console.log(`wrote resources/icon.png (${N}x${N}, ${png.length} bytes)`)
