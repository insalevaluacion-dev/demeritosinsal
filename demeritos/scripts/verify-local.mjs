/**
 * Verifica DB local + endpoints HTTP (servidor debe estar en marcha para HTTP).
 * Uso: npm run verify:local
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { pgClientOptions } from './pg-config.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local'), override: true })

const schema = (process.env.DB_SCHEMA || 'demeritos').trim()
const checks = []
let failed = 0

async function dbCheck() {
  const pg = (await import('pg')).default
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no definido en .env.local')
  const c = new pg.Client(pgClientOptions(url))
  await c.connect()
  await c.query(`SET search_path TO ${schema}, principal, public`)

  const host = new URL(url.replace(/^postgres:\/\//, 'postgresql://')).hostname
  checks.push({ name: 'db:host', ok: true, detail: host })

  for (const [label, sql] of [
    ['estudiantes (vista)', 'SELECT COUNT(*)::int AS n FROM estudiantes'],
    ['principal.estudiantes', 'SELECT COUNT(*)::int AS n FROM principal.estudiantes'],
    ['maestros', 'SELECT COUNT(*)::int AS n FROM principal.maestros WHERE activo = true'],
    ['demeritos', 'SELECT COUNT(*)::int AS n FROM demeritos'],
    ['causales', 'SELECT COUNT(*)::int AS n FROM causales_demerito'],
  ]) {
    const r = await c.query(sql)
    checks.push({ name: `db:${label}`, ok: true, detail: `${r.rows[0].n} registros` })
  }

  const login = await c.query(`
    SELECT pm.email FROM principal.maestros pm
    WHERE pm.activo = true AND pm.email IS NOT NULL LIMIT 1
  `)
  checks.push({
    name: 'db:login',
    ok: Boolean(login.rows[0]?.email),
    detail: login.rows[0]?.email || 'sin maestro con email',
  })
  await c.end()
}

async function httpCheck(pathname) {
  const res = await fetch(`http://localhost:3000${pathname}`, { signal: AbortSignal.timeout(15000) })
  checks.push({ name: `http:${pathname}`, ok: res.ok, detail: `status ${res.status}` })
}

console.log('=== VERIFICACIÓN LOCAL ===')
try {
  await dbCheck()
} catch (e) {
  checks.push({ name: 'db:connection', ok: false, detail: e.message })
}

for (const pathname of ['/login', '/']) {
  try {
    await httpCheck(pathname)
  } catch (e) {
    checks.push({ name: `http:${pathname}`, ok: false, detail: e.message })
  }
}

for (const c of checks) {
  const mark = c.ok ? 'OK' : 'FAIL'
  if (!c.ok) failed++
  console.log(`[${mark}] ${c.name} — ${c.detail}`)
}

process.exit(failed > 0 ? 1 : 0)
