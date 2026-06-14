import { Pool, PoolConfig, type QueryResultRow } from 'pg'
import { pgSearchPathOption } from '@/lib/db-schema'

declare global {
  var _pgPool: Pool | undefined
  var _pgPoolGeneration: number | undefined
}

function needsSsl(connectionString: string): boolean {
  return (
    connectionString.includes('rlwy.net') ||
    connectionString.includes('render.com') ||
    /sslmode=require/i.test(connectionString)
  )
}

function normalizeConnectionString(connectionString: string): string {
  if (!needsSsl(connectionString)) return connectionString
  return connectionString
    .replace(/([?&])sslmode=[^&]*&?/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/\?$/, '')
}

export function getPgConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('DATABASE_URL is not set')
  }
  const connectionString = normalizeConnectionString(raw)
  return {
    connectionString,
    options: pgSearchPathOption(),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    ...(needsSsl(raw) ? { ssl: { rejectUnauthorized: false } } : {}),
  }
}

/** Pool independiente por ruta (cerrar con pool.end() no afecta el pool global). */
export function createRoutePool(): Pool {
  return new Pool(getPgConfig())
}

function newPool() {
  global._pgPool = new Pool(getPgConfig())
  return global._pgPool
}

export function resetPool() {
  if (global._pgPool) {
    global._pgPool.end().catch(() => {})
  }
  global._pgPool = undefined
}

export function getPool(): Pool {
  if (!global._pgPool) return newPool()
  return global._pgPool
}

/** Consulta con pool compartido (no cerrar el pool global). */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  try {
    return await getPool().query<T>(text, params)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('after calling end on the pool')) {
      resetPool()
      return newPool().query<T>(text, params)
    }
    throw e
  }
}
