/**
 * Genera iconos y splash de Android desde public/insal-logo.png
 * Uso: node scripts/generate-android-icons.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'public', 'insal-logo.png')
const res = path.join(root, 'android', 'app', 'src', 'main', 'res')

if (!fs.existsSync(src)) {
  console.error('[icons] Falta public/insal-logo.png')
  process.exit(1)
}

const mipmapSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
}

const foregroundSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
}

const splashSizes = {
  'drawable-port-mdpi': { w: 320, h: 480 },
  'drawable-port-hdpi': { w: 480, h: 800 },
  'drawable-port-xhdpi': { w: 720, h: 1280 },
  'drawable-port-xxhdpi': { w: 960, h: 1600 },
  'drawable-port-xxxhdpi': { w: 1280, h: 1920 },
  'drawable-land-mdpi': { w: 480, h: 320 },
  'drawable-land-hdpi': { w: 800, h: 480 },
  'drawable-land-xhdpi': { w: 1280, h: 720 },
  'drawable-land-xxhdpi': { w: 1600, h: 960 },
  'drawable-land-xxxhdpi': { w: 1920, h: 1280 },
}

const BG = { r: 15, g: 90, b: 171, alpha: 1 } // #0f5aab

async function roundIcon(size) {
  const logo = await sharp(src)
    .resize(Math.round(size * 0.82), Math.round(size * 0.82), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const roundMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
  )

  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .composite([{ input: roundMask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function squareIcon(size) {
  const logo = await sharp(src)
    .resize(Math.round(size * 0.82), Math.round(size * 0.82), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toBuffer()
}

async function adaptiveForeground(size) {
  // Safe zone ~66% of adaptive canvas
  const logoSize = Math.round(size * 0.66)
  const logo = await sharp(src)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toBuffer()
}

async function splash(w, h) {
  const logoSize = Math.round(Math.min(w, h) * 0.42)
  const logo = await sharp(src)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return sharp({
    create: { width: w, height: h, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toBuffer()
}

console.log('[icons] Generando iconos INSAL…')

for (const [dir, size] of Object.entries(mipmapSizes)) {
  const outDir = path.join(res, dir)
  fs.mkdirSync(outDir, { recursive: true })
  const square = await squareIcon(size)
  const round = await roundIcon(size)
  fs.writeFileSync(path.join(outDir, 'ic_launcher.png'), square)
  fs.writeFileSync(path.join(outDir, 'ic_launcher_round.png'), round)
  console.log(`  ${dir}/ic_launcher*.png (${size}px)`)
}

for (const [dir, size] of Object.entries(foregroundSizes)) {
  const outDir = path.join(res, dir)
  fs.mkdirSync(outDir, { recursive: true })
  const fg = await adaptiveForeground(size)
  fs.writeFileSync(path.join(outDir, 'ic_launcher_foreground.png'), fg)
  console.log(`  ${dir}/ic_launcher_foreground.png (${size}px)`)
}

// Adaptive icon XML → PNG foreground + solid color background
fs.writeFileSync(
  path.join(res, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0F5AAB</color>
</resources>
`
)

fs.writeFileSync(
  path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
)

fs.writeFileSync(
  path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
)

// Remove default vector foreground so PNG mipmap wins
const vectorFg = path.join(res, 'drawable-v24', 'ic_launcher_foreground.xml')
if (fs.existsSync(vectorFg)) {
  fs.unlinkSync(vectorFg)
  console.log('  removido drawable-v24/ic_launcher_foreground.xml (Capacitor)')
}

console.log('[icons] Generando splash INSAL…')
for (const [dir, { w, h }] of Object.entries(splashSizes)) {
  const outDir = path.join(res, dir)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'splash.png'), await splash(w, h))
  console.log(`  ${dir}/splash.png (${w}x${h})`)
}

const drawableSplash = path.join(res, 'drawable', 'splash.png')
fs.mkdirSync(path.dirname(drawableSplash), { recursive: true })
fs.writeFileSync(drawableSplash, await splash(480, 800))
console.log('  drawable/splash.png')

console.log('[icons] Listo.')
