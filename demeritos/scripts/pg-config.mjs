import { pgSearchPathOption } from './db-schema.mjs'

/** Opciones pg para DATABASE_URL (SSL en Neon/Railway/Render). */
export function needsRemoteSsl(connectionString) {
  return (
    connectionString.includes('rlwy.net') ||
    connectionString.includes('render.com') ||
    connectionString.includes('neon.tech') ||
    /sslmode=require/i.test(connectionString)
  )
}

/** El pooler de Neon no acepta `-c search_path` al arrancar. El endpoint directo sí. */
export function useDirectNeonEndpoint(connectionString) {
  try {
    const asPg = connectionString.replace(/^postgres:\/\//, 'postgresql://')
    const u = new URL(asPg)
    if (u.hostname.endsWith('.neon.tech') && u.hostname.includes('-pooler')) {
      u.hostname = u.hostname.replace('-pooler', '')
      const out = u.toString()
      return connectionString.startsWith('postgres://') ? out.replace(/^postgresql:\/\//, 'postgres://') : out
    }
  } catch {
    /* se deja la URL original */
  }
  return connectionString
}

/** Quita sslmode y channel_binding: pg no negocia channel binding y Neon exige SSL aparte. */
export function normalizeConnectionString(connectionString) {
  const direct = useDirectNeonEndpoint(connectionString)
  if (!needsRemoteSsl(connectionString)) return direct
  return direct
    .replace(/([?&])sslmode=[^&]*&?/gi, '$1')
    .replace(/([?&])channel_binding=[^&]*&?/gi, '$1')
    .replace(/\?&/g, '?')
    .replace(/[?&]$/, '')
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
