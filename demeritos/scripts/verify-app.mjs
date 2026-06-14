import dotenv from 'dotenv'
import { pgClientOptions } from './pg-config.mjs'

dotenv.config({ path: '.env.local', override: true })

const schema = (process.env.DB_SCHEMA || 'demeritos').trim()
const checks = []

async function dbCheck() {
  const pg = (await import('pg')).default
  const c = new pg.Client(pgClientOptions(process.env.DATABASE_URL))
  await c.connect()
  await c.query(`SET search_path TO ${schema}, principal, public`)

  for (const table of ['estudiantes', 'maestros', 'demeritos', 'causales_demerito', 'reconocimientos']) {
    const r = await c.query(`SELECT COUNT(*)::int AS n FROM ${table}`)
    checks.push({ name: `db:${table}`, ok: true, detail: `${r.rows[0].n} registros` })
  }

  const login = await c.query(`
    SELECT pm.email, mat.nombre_materia
    FROM principal.maestros pm
    LEFT JOIN principal.materia mat ON mat.materia_id = pm.materia_id
    WHERE pm.activo = true LIMIT 1
  `)
  checks.push({ name: 'db:login-query', ok: true, detail: login.rows[0]?.email || 'sin maestros' })
  await c.end()
}

async function httpCheck(path) {
  const res = await fetch(`http://localhost:3000${path}`, { signal: AbortSignal.timeout(20000) })
  checks.push({ name: `http:${path}`, ok: res.ok, detail: `status ${res.status}` })
}

console.log('=== VERIFICACIÓN ===')
try {
  await dbCheck()
  console.log('DB Railway: OK')
} catch (e) {
  checks.push({ name: 'db:railway', ok: false, detail: e.message })
  console.log('DB Railway: FAIL', e.message)
}

for (const path of ['/login', '/']) {
  try {
    await httpCheck(path)
  } catch (e) {
    checks.push({ name: `http:${path}`, ok: false, detail: e.message })
  }
}

let failed = 0
for (const c of checks) {
  const mark = c.ok ? 'OK' : 'FAIL'
  if (!c.ok) failed++
  console.log(`[${mark}] ${c.name} — ${c.detail}`)
}
process.exit(failed > 0 ? 1 : 0)
