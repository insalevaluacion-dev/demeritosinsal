/**
 * Prepara variables de Railway y genera .env.capacitor con la URL pública.
 * Uso: node scripts/railway-deploy-setup.mjs [URL_PUBLICA]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const urlArg = process.argv[2]?.trim()

const railwayEnvExample = `# Variables en Railway (servicio Web → Variables)
# DATABASE_URL = referencia al servicio PostgreSQL (ya existe)
DB_SCHEMA=demeritos
NODE_ENV=production
JWT_SECRET=cambiar-por-secreto-largo-aleatorio
PORT=3000
`

const examplePath = path.join(root, '.env.railway.production.example')
fs.writeFileSync(examplePath, railwayEnvExample, 'utf8')
console.log('[railway] Plantilla:', examplePath)

if (urlArg && /^https?:\/\//i.test(urlArg)) {
  const url = urlArg.replace(/\/$/, '')
  const capacitorEnv = `# URL pública de la app en Railway (para APK Capacitor)\nCAPACITOR_SERVER_URL=${url}\n`
  fs.writeFileSync(path.join(root, '.env.capacitor'), capacitorEnv, 'utf8')
  console.log('[railway] .env.capacitor actualizado:', url)
  console.log('[railway] Ejecuta: npm run cap:sync')
} else {
  console.log('[railway] Cuando tengas la URL pública de Railway:')
  console.log('  node scripts/railway-deploy-setup.mjs https://tu-app.railway.app')
}
