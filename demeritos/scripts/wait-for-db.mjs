import pg from 'pg'
import { pgPoolOptions } from './pg-config.mjs'

const WAKE_CODES = new Set(['57P03', 'ECONNREFUSED', 'ENOTFOUND'])
const MAX_ATTEMPTS = 12
const DELAY_MS = 5000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Espera a que PostgreSQL en Railway termine de despertar. */
export async function waitForDatabase(url, label = 'PostgreSQL') {
  if (!url) return

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const pool = new pg.Pool(pgPoolOptions(url))
    try {
      await pool.query('SELECT 1')
      console.log(`[dev] ${label} listo (intento ${attempt}/${MAX_ATTEMPTS})`)
      return
    } catch (e) {
      const code = e?.code || ''
      const msg = e?.message || String(e)
      const retryable =
        WAKE_CODES.has(code) ||
        msg.includes('starting up') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('ENOTFOUND')

      if (!retryable || attempt === MAX_ATTEMPTS) {
        console.warn(`[dev] ${label} no respondió tras ${attempt} intento(s): ${msg}`)
        return
      }
      console.log(`[dev] ${label} despertando… reintento ${attempt}/${MAX_ATTEMPTS} en ${DELAY_MS / 1000}s`)
      await sleep(DELAY_MS)
    } finally {
      await pool.end().catch(() => {})
    }
  }
}
