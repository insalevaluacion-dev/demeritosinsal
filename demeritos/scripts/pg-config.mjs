import { pgSearchPathOption } from './db-schema.mjs'

/** Opciones pg para DATABASE_URL (SSL en Railway/Render). */
export function needsRemoteSsl(connectionString) {
  return (
    connectionString.includes('rlwy.net') ||
    connectionString.includes('render.com') ||
    /sslmode=require/i.test(connectionString)
  )
}

/** Quita sslmode de la URL para evitar verify-full estricto en pg v8+. */
export function normalizeConnectionString(connectionString) {
  if (!needsRemoteSsl(connectionString)) return connectionString
  return connectionString
    .replace(/([?&])sslmode=[^&]*&?/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/\?$/, '')
}

export function pgPoolOptions(connectionString) {
  const needSsl = needsRemoteSsl(connectionString)
  return {
    connectionString: normalizeConnectionString(connectionString),
    options: pgSearchPathOption(),
    connectionTimeoutMillis: needSsl ? 60000 : 10000,
    ...(needSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  }
}

export function pgClientOptions(connectionString) {
  return pgPoolOptions(connectionString)
}
