/**
 * Generates PWA icons using a canvas-drawn heart matching the sidebar logo.
 * Requires: npm install --save-dev canvas  (already in devDependencies)
 *
 * Outputs: public/pwa-192x192.png  public/pwa-512x512.png
 */
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC    = join(__dirname, '..', 'public')

const BG    = '#0F172A'
const HEART = '#38BDF8'

/**
 * Draw a symmetric heart centered on the canvas.
 *
 * The heart is drawn as 4 cubic bezier curves:
 *   - two arcs for the top lobes (left and right)
 *   - two curves that converge to the bottom tip
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx  horizontal center of canvas
 * @param {number} heartW  bounding-box width (and height) of the heart
 * @param {number} bboxTop  y coordinate of the very top of the heart (lobe peaks)
 */
function drawHeart(ctx, cx, heartW, bboxTop) {
  const heartH = heartW          // square bounding box
  const tcH    = heartH * 0.30   // depth from lobe-peak down to center dip

  // The center dip sits at (cx, bboxTop + tcH)
  ctx.beginPath()
  ctx.moveTo(cx, bboxTop + tcH)

  // ── top-left lobe arc ────────────────────────────────────────────────────
  ctx.bezierCurveTo(
    cx,               bboxTop,          // cp1 – pulls curve up to peak
    cx - heartW / 2,  bboxTop,          // cp2 – left lobe peak
    cx - heartW / 2,  bboxTop + tcH     // end – left lobe mid-point
  )

  // ── bottom-left curve (down to tip) ──────────────────────────────────────
  ctx.bezierCurveTo(
    cx - heartW / 2,  bboxTop + (heartH + tcH) / 2,   // cp1
    cx,               bboxTop + (heartH + tcH) / 2,   // cp2
    cx,               bboxTop + heartH                 // end – bottom tip
  )

  // ── bottom-right curve (up from tip) ─────────────────────────────────────
  ctx.bezierCurveTo(
    cx,               bboxTop + (heartH + tcH) / 2,   // cp1
    cx + heartW / 2,  bboxTop + (heartH + tcH) / 2,   // cp2
    cx + heartW / 2,  bboxTop + tcH                    // end – right lobe mid-point
  )

  // ── top-right lobe arc ───────────────────────────────────────────────────
  ctx.bezierCurveTo(
    cx + heartW / 2,  bboxTop,          // cp1 – right lobe peak
    cx,               bboxTop,          // cp2 – pulls curve back to dip
    cx,               bboxTop + tcH     // end – back to center dip
  )

  ctx.closePath()
}

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx    = canvas.getContext('2d')

  // Background
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, size, size)

  // Heart: 58 % of canvas width, visually centered
  // Visual center of mass ≈ bboxTop + heartH * 0.58
  const heartW  = Math.round(size * 0.58)
  const bboxTop = Math.round(size / 2 - heartW * 0.58)
  const cx      = size / 2

  ctx.fillStyle = HEART
  drawHeart(ctx, cx, heartW, bboxTop)
  ctx.fill()

  return canvas.toBuffer('image/png')
}

for (const size of [192, 512]) {
  const buf  = generateIcon(size)
  const dest = join(PUBLIC, `pwa-${size}x${size}.png`)
  writeFileSync(dest, buf)
  console.log(`✓ ${dest}  (${(buf.length / 1024).toFixed(1)} KB)`)
}
