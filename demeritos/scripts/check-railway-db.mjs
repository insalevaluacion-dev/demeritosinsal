import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { pgPoolOptions } from './pg-config.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.railway'), override: true })

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL en .env.railway')
  process.exit(1)
}

const schema = (process.env.DB_SCHEMA || 'demeritos').trim()
const pool = new pg.Pool(pgPoolOptions(url))
const client = await pool.connect()

try {
  await client.query(`SET search_path TO ${schema}, principal, public`)
  for (const table of ['estudiantes', 'maestros', 'demeritos', 'causales_demerito']) {
    const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`)
    console.log(`${table}: ${r.rows[0].n} registros`)
  }
  console.log('Railway DB: OK')
} catch (e) {
  console.error('Railway DB: FAIL —', e.message)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
