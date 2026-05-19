/**
 * Generates PWA icons as PNG files using only Node.js built-ins.
 * Outputs: public/pwa-192x192.png and public/pwa-512x512.png
 *
 * Design: dark navy background (#0F172A) with "FL" in sky blue (#38BDF8)
 */
import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC   = join(__dirname, '..', 'public')

const BG = [0x0F, 0x17, 0x2A]   // #0F172A
const FG = [0x38, 0xBD, 0xF8]   // #38BDF8

// 5×7 pixel bitmap glyphs
const GLYPHS = {
  F: [
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,1,1,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ],
  L: [
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1],
  ],
}

// ── CRC-32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcData = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcData))
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

// ── PNG builder ───────────────────────────────────────────────────────────────

function makePNG(size) {
  // Fill pixel buffer with background color
  const pixels = Buffer.alloc(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3]     = BG[0]
    pixels[i * 3 + 1] = BG[1]
    pixels[i * 3 + 2] = BG[2]
  }

  // Scale glyph to ~55% of icon height
  const GLYPH_H = 7
  const GLYPH_W = 5
  const GAP     = 1          // gap between letters in glyph units
  const scale   = Math.floor(size * 0.55 / GLYPH_H)
  const totalW  = (GLYPH_W + GAP + GLYPH_W) * scale
  const totalH  = GLYPH_H * scale
  const ox      = Math.floor((size - totalW) / 2)
  const oy      = Math.floor((size - totalH) / 2)

  const drawGlyph = (char, charOffsetX) => {
    for (let row = 0; row < GLYPH_H; row++) {
      for (let col = 0; col < GLYPH_W; col++) {
        if (!GLYPHS[char][row][col]) continue
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = ox + charOffsetX + col * scale + dx
            const py = oy + row * scale + dy
            if (px < 0 || px >= size || py < 0 || py >= size) continue
            const idx = (py * size + px) * 3
            pixels[idx]     = FG[0]
            pixels[idx + 1] = FG[1]
            pixels[idx + 2] = FG[2]
          }
        }
      }
    }
  }

  drawGlyph('F', 0)
  drawGlyph('L', (GLYPH_W + GAP) * scale)

  // Build scanlines: filter byte 0 (None) before each row
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    const rowBase = y * (size * 3 + 1)
    raw[rowBase] = 0
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 3
      const dst = rowBase + 1 + x * 3
      raw[dst]     = pixels[src]
      raw[dst + 1] = pixels[src + 1]
      raw[dst + 2] = pixels[src + 2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8]  = 8  // bit depth
  ihdr[9]  = 2  // color type: RGB
  ihdr[10] = 0  // compression: deflate
  ihdr[11] = 0  // filter: adaptive
  ihdr[12] = 0  // interlace: none

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Generate ──────────────────────────────────────────────────────────────────

for (const size of [192, 512]) {
  const outPath = join(PUBLIC, `pwa-${size}x${size}.png`)
  writeFileSync(outPath, makePNG(size))
  console.log(`✓ ${outPath}`)
}
