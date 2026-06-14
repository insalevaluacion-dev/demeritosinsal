import { spawn, execSync } from 'child_process'

import path from 'path'

import { fileURLToPath } from 'url'

import dotenv from 'dotenv'



const __dirname = path.dirname(fileURLToPath(import.meta.url))

const root = path.join(__dirname, '..')



dotenv.config({ path: path.join(root, '.env.local'), override: true })

dotenv.config({ path: path.join(root, '.env') })



if (!process.env.DATABASE_URL) {

  console.error('[dev] DATABASE_URL no definido en .env.local')

  process.exit(1)

}



let nextChild = null



function shutdown(code = 0) {

  if (nextChild && !nextChild.killed) nextChild.kill('SIGINT')

  process.exit(code)

}



process.on('SIGINT', () => shutdown(0))

process.on('SIGTERM', () => shutdown(0))



try {

  execSync('node scripts/migrate-contrasena-plana.mjs', { stdio: 'inherit', cwd: root, env: process.env })

} catch {

  console.warn('[dev] Aviso: no se pudo aplicar migrate-contrasena-plana.mjs')

}



const host = (() => {

  try {

    return new URL(process.env.DATABASE_URL.replace(/^postgres:\/\//, 'postgresql://')).hostname

  } catch {

    return 'PostgreSQL'

  }

})()



console.log(`[dev] Conectando a ${host}… Iniciando Next.js…`)



nextChild = spawn('npx', ['next', 'dev', '--turbopack', '-H', '0.0.0.0'], {

  stdio: 'inherit',

  cwd: root,

  env: process.env,

  shell: true,

})



nextChild.on('exit', (code) => shutdown(code ?? 0))

