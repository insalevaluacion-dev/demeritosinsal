/**
 * PostgreSQL local embebido + importación del snapshot Railway.
 * Uso: npm run db:setup-local
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import dotenv from 'dotenv'
import pg from 'pg'
import { pgPoolOptions } from './pg-config.mjs'
import { LOCAL_PG, ensureLocalDatabase, localDatabaseUrl, startLocalPostgres } from './local-postgres.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dataDir = LOCAL_PG.dataDir
const snapshot = path.join(root, 'data', 'railway-snapshot.sql')

const LOCAL = LOCAL_PG

dotenv.config({ path: path.join(root, '.env.local') })

function localUrl(db = LOCAL.database) {
  return localDatabaseUrl(db)
}

async function waitForDb(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const pool = new pg.Pool(pgPoolOptions(url))
      const client = await pool.connect()
      await client.query('SELECT 1')
      client.release()
      await pool.end()
      return
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw new Error('PostgreSQL local no respondió a tiempo')
}

async function applySnapshot(url) {
  if (!fs.existsSync(snapshot)) {
    throw new Error(`No existe ${snapshot}. Ejecute primero: npm run db:export-railway`)
  }

  const sql = fs.readFileSync(snapshot, 'utf8')
  const pool = new pg.Pool(pgPoolOptions(url))
  const client = await pool.connect()
  try {
    console.log('[local-db] Limpiando esquemas previos…')
    await client.query(`DROP SCHEMA IF EXISTS demeritos CASCADE`)
    await client.query(`DROP SCHEMA IF EXISTS principal CASCADE`)
    console.log('[local-db] Importando snapshot…')
    await client.query(sql)
    const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM principal.estudiantes`)
    console.log(`[local-db] Estudiantes importados: ${rows[0].n}`)
  } finally {
    client.release()
    await pool.end()
  }
}

async function runPostImport(url) {
  console.log('[local-db] Creando vistas demeritos.* …')
  spawnSync('node', ['scripts/post-import-insal.mjs'], {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, DATABASE_URL: url, DB_SCHEMA: 'demeritos', SKIP_MAESTRO_EMAILS: '1' },
  })
  spawnSync('node', ['scripts/migrate-contrasena-plana.mjs'], {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, DATABASE_URL: url, DB_SCHEMA: 'demeritos' },
  })
}

async function verify(url) {
  const pool = new pg.Pool(pgPoolOptions(url))
  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO demeritos, principal, public`)
    const checks = [
      ['principal.estudiantes', 'SELECT COUNT(*)::int AS n FROM principal.estudiantes'],
      ['demeritos.estudiantes (vista)', 'SELECT COUNT(*)::int AS n FROM estudiantes'],
      ['demeritos.demeritos', 'SELECT COUNT(*)::int AS n FROM demeritos'],
      ['principal.maestros', 'SELECT COUNT(*)::int AS n FROM principal.maestros'],
    ]
    for (const [label, sql] of checks) {
      const r = await client.query(sql)
      console.log(`[verify] ${label}: ${r.rows[0].n}`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

console.log('[local-db] Iniciando PostgreSQL embebido…')
const initialized = fs.existsSync(path.join(LOCAL_PG.dataDir, 'PG_VERSION'))
await startLocalPostgres()
if (!initialized) {
  console.log(`[local-db] Base de datos ${LOCAL.database} creada`)
}
await ensureLocalDatabase()

const appUrl = localUrl()
await waitForDb(appUrl)
await applySnapshot(appUrl)
await runPostImport(appUrl)
await verify(appUrl)

console.log('[local-db] PostgreSQL local listo.')
console.log(`[local-db] DATABASE_URL=${appUrl}`)
console.log('[local-db] Use npm run dev:local para desarrollar sin Railway.')
