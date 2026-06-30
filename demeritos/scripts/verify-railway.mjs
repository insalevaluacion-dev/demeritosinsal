/**
 * Verifica BD Railway + APIs locales.
 * Uso: node scripts/verify-railway.mjs [--base http://localhost:3000]
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { pgPoolOptions } from './pg-config.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.railway'), override: true })

const base = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:3000'
const schema = (process.env.DB_SCHEMA || 'demeritos').trim()
let failed = 0

function ok(name, detail) {
  console.log(`[OK] ${name} — ${detail}`)
}
function fail(name, detail) {
  console.log(`[FAIL] ${name} — ${detail}`)
  failed++
}

// ── DB ──────────────────────────────────────────────────────────
const pool = new pg.Pool(pgPoolOptions(process.env.DATABASE_URL))
const client = await pool.connect()
try {
  await client.query(`SET search_path TO ${schema}, principal, public`)
  for (const table of ['estudiantes', 'maestros', 'demeritos', 'causales_demerito']) {
    const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`)
    ok(`db:${table}`, `${r.rows[0].n} registros`)
  }

  const idCol = await client.query(`
    SELECT is_identity FROM information_schema.columns
    WHERE table_schema = 'principal' AND table_name = 'maestros' AND column_name = 'maestro_id'
  `)
  ok('db:maestro_id_identity', idCol.rows[0]?.is_identity === 'YES' ? 'IDENTITY (Railway)' : 'serial/manual')

  const seq = await client.query(`SELECT pg_get_serial_sequence('principal.maestros', 'maestro_id') AS s`)
  ok('db:maestro_seq', seq.rows[0]?.s || 'sin secuencia')
} catch (e) {
  fail('db:connect', e.message)
} finally {
  client.release()
  await pool.end()
}

// ── HTTP ────────────────────────────────────────────────────────
for (const path of ['/login', '/']) {
  try {
    const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30000) })
    if (res.ok) ok(`http:${path}`, `status ${res.status}`)
    else fail(`http:${path}`, `status ${res.status}`)
  } catch (e) {
    fail(`http:${path}`, e.message)
  }
}

// ── Auth registro de prueba (se borra si ya existe conflicto) ─────
const testEmail = `test.verify.${Date.now()}@clases.edu.sv`
const testPass = 'verify123'
try {
  const res = await fetch(`${base}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPass,
      confirmPassword: testPass,
      nombre: 'Usuario Verificacion',
      register: true,
    }),
    signal: AbortSignal.timeout(60000),
  })
  const data = await res.json()
  if (res.ok && data.token) {
    ok('api:auth/register', `token OK, maestro_id implícito`)
    const causales = await fetch(`${base}/api/causales`, {
      headers: { Authorization: `Bearer ${data.token}` },
      signal: AbortSignal.timeout(30000),
    })
    if (causales.ok) ok('api:causales', `status ${causales.status}`)
    else fail('api:causales', `status ${causales.status}`)
  } else {
    fail('api:auth/register', data.error || `status ${res.status}`)
  }
} catch (e) {
  fail('api:auth/register', e.message)
}

console.log(failed === 0 ? '\n✅ Verificación completa OK' : `\n❌ ${failed} fallo(s)`)
process.exit(failed > 0 ? 1 : 0)
