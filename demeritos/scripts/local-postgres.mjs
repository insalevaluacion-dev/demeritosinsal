import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import EmbeddedPostgres from 'embedded-postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

export const LOCAL_PG = {
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  password: 'postgres',
  database: 'insal_demeritos',
  dataDir: path.join(root, '.embedded-postgres'),
}

export function localDatabaseUrl(db = LOCAL_PG.database) {
  const { user, password, host, port } = LOCAL_PG
  return `postgresql://${user}:${password}@${host}:${port}/${db}`
}

let instance = null

async function canConnect(url, attempts = 3) {
  const pg = await import('pg')
  const { pgPoolOptions } = await import('./pg-config.mjs')
  for (let i = 0; i < attempts; i++) {
    const pool = new pg.default.Pool(pgPoolOptions(url))
    try {
      const client = await pool.connect()
      await client.query('SELECT 1')
      client.release()
      await pool.end()
      return true
    } catch {
      await pool.end().catch(() => {})
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  return false
}

export async function startLocalPostgres() {
  const appUrl = localDatabaseUrl()
  if (await canConnect(appUrl)) {
    return null
  }

  if (instance) return instance

  instance = new EmbeddedPostgres({
    databaseDir: LOCAL_PG.dataDir,
    user: LOCAL_PG.user,
    password: LOCAL_PG.password,
    port: LOCAL_PG.port,
    persistent: true,
    onLog: () => {},
    onError: (msg) => console.error('[local-pg]', msg),
  })

  const initialized = fs.existsSync(path.join(LOCAL_PG.dataDir, 'PG_VERSION'))
  if (!initialized) {
    await instance.initialise()
  }
  await instance.start()
  return instance
}

export async function ensureLocalDatabase() {
  const pg = await import('pg')
  const { pgPoolOptions } = await import('./pg-config.mjs')
  const adminUrl = localDatabaseUrl('postgres')
  const pool = new pg.default.Pool(pgPoolOptions(adminUrl))
  const client = await pool.connect()
  try {
    const exists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [
      LOCAL_PG.database,
    ])
    if (!exists.rows.length) {
      await client.query(`CREATE DATABASE ${LOCAL_PG.database}`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

export function isLocalDatabaseUrl(url) {
  try {
    const u = new URL(url.replace(/^postgres:\/\//, 'postgresql://'))
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost'
  } catch {
    return false
  }
}
