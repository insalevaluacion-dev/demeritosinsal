/**
 * Genera insal-logo.ico multi-resolucion desde public/insal-logo.png
 * Uso: node scripts/make-icon.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'public', 'insal-logo.png')
const outRoot = path.join(root, '..', 'insal-logo.ico')
const outPublic = path.join(root, 'public', 'insal-logo.ico')

const sizes = [16, 24, 32, 48, 64, 128, 256]

const pngBuffers = await Promise.all(
  sizes.map((size) =>
    sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: false })
      .toBuffer()
  )
)

const ico = await pngToIco(pngBuffers)

for (const dest of [outRoot, outPublic]) {
  fs.writeFileSync(dest, ico)
  console.log('Creado:', dest, `(${ico.length} bytes, ${sizes.length} tamanos)`)
}
