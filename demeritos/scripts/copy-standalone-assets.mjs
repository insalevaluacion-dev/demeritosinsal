/**
 * Tras `next build` con output:standalone, copia assets que Next no incluye.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const standalone = path.join(root, '.next', 'standalone')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true })
  return true
}

if (!fs.existsSync(standalone)) {
  console.log('[standalone] Sin carpeta standalone — omitido')
  process.exit(0)
}

const okPublic = copyDir(path.join(root, 'public'), path.join(standalone, 'public'))
const okStatic = copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'))
console.log('[standalone] public:', okPublic ? 'ok' : 'skip', '| static:', okStatic ? 'ok' : 'skip')
