/**
 * Keep-alive opcional: pings /api/health para evitar que el servicio quede frío.
 * En Railway, configura un Cron Job que ejecute:
 *   node scripts/railway-keepalive.mjs
 * cada 5–10 minutos, O un servicio Cron con curl.
 *
 * Uso local: node scripts/railway-keepalive.mjs [URL]
 */
const url = (process.argv[2] || process.env.CAPACITOR_SERVER_URL || process.env.KEEPALIVE_URL || '')
  .trim()
  .replace(/\/$/, '')

if (!url) {
  console.error('Uso: node scripts/railway-keepalive.mjs https://tu-app.up.railway.app')
  process.exit(1)
}

const target = `${url}/api/health`
const started = Date.now()
try {
  const res = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(25000) })
  const body = await res.text()
  console.log(`[keepalive] ${res.status} ${target} (${Date.now() - started}ms)`)
  if (body) console.log(body.slice(0, 200))
  process.exit(res.ok ? 0 : 2)
} catch (e) {
  console.error('[keepalive] FAIL', e instanceof Error ? e.message : e)
  process.exit(1)
}
