/**
 * Diagnostica demeritos/.env.railway (DNS + conexion).
 * Uso: node scripts/test-env-railway.mjs
 */
import fs from 'fs'
import path from 'path'
import dns from 'dns/promises'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'
import { pgClientOptions } from './pg-config.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env.railway')

console.log('--- Diagnostico .env.railway ---')
console.log('Archivo:', envPath)

if (!fs.existsSync(envPath)) {
  console.error('ERROR: No existe demeritos/.env.railway')
  console.error('Ejecuta CONFIGURAR-ENV.bat en la carpeta del proyecto.')
  process.exit(1)
}

const rawFile = fs.readFileSync(envPath, 'utf8')
console.log('Tamano:', rawFile.length, 'bytes')
if (rawFile.charCodeAt(0) === 0xfeff) {
  console.warn('AVISO: El archivo tiene BOM (Notepad a veces lo agrega). Reescribelo con CONFIGURAR-ENV.bat')
}

dotenv.config({ path: envPath, override: true })
const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error('ERROR: DATABASE_URL vacio o no leido')
  process.exit(1)
}

console.log('DATABASE_URL leido (sin password):', url.replace(/:([^:@/]+)@/, ':****@'))

let parsed
try {
  parsed = new URL(url.replace(/^postgres:\/\//, 'postgresql://'))
} catch (e) {
  console.error('ERROR: URL invalida —', e.message)
  console.error('Debe verse asi: postgresql://postgres:PASS@maglev.proxy.rlwy.net:52223/railway')
  process.exit(1)
}

const host = parsed.hostname
const port = parsed.port || '(sin puerto)'
console.log('Host parseado:', host)
console.log('Puerto parseado:', port)

if (!parsed.port) {
  console.error('ERROR: Falta el puerto. Debe ser maglev.proxy.rlwy.net:52223')
  process.exit(1)
}

if (/\.net\d+$/.test(host)) {
  console.error('ERROR: El puerto quedo pegado al host (net52223). Falta ":" antes del puerto.')
  process.exit(1)
}

try {
  const ips = await dns.lookup(host)
  console.log('DNS OK:', host, '->', ips.address)
} catch (e) {
  console.error('DNS FALLO:', e.message)
  console.error('Revisa internet en esta laptop o firewall/antivirus.')
  process.exit(1)
}

try {
  const client = new pg.Client(pgClientOptions(url))
  await client.connect()
  const r = await client.query('SELECT 1 AS ok')
  console.log('PostgreSQL OK:', r.rows[0])
  await client.end()
  console.log('--- Todo correcto ---')
} catch (e) {
  console.error('PostgreSQL FALLO:', e.message)
  process.exit(1)
}
