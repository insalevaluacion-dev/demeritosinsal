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
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
    // Reintentos: Postgres en Railway a veces tarda en levantar tras idle/redeploy
    ...(needsSsl(raw) ? { ssl: { rejectUnauthorized: false } } : {}),
  }
}

async function withDbRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      const msg = e instanceof Error ? e.message : String(e)
      const starting =
        msg.includes('starting up') ||
        msg.includes('Connection terminated') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('timeout') ||
        (typeof e === 'object' && e && 'code' in e && (e as { code?: string }).code === '57P03')
      if (!starting || i === attempts - 1) throw e
      await new Promise((r) => setTimeout(r, 800 * (i + 1)))
    }
  }
  throw last
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
  return withDbRetry(async () => {
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
  })
}
