/**
 * Arranque en producción (Railway): usa standalone de Next si existe.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = process.env.PORT || '3000'
const host = '0.0.0.0'

const standalone = path.join(root, '.next', 'standalone', 'server.js')

if (fs.existsSync(standalone)) {
  // Next standalone espera cwd en .next/standalone (ahí están node_modules y public copiados)
  const cwd = path.dirname(standalone)
  process.env.PORT = String(port)
  process.env.HOSTNAME = host
  console.log(`[start] standalone → node server.js (${host}:${port})`)
  const child = spawn(process.execPath, ['server.js'], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  })
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 1)
  })
} else {
  console.log(`[start] next start -H ${host} -p ${port}`)
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'start', '-H', host, '-p', String(port)],
    { cwd: root, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' }
  )
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 1)
  })
}
