/**
 * Borra registros operativos (deméritos, méritos, redenciones, notificaciones)
 * y deja alumnos, maestros y catálogos.
 *
 * Uso: node scripts/reset-registros.mjs
 * Lee DATABASE_URL de .env.railway (o DOTENV_CONFIG_PATH).
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { pgClientOptions } from './pg-config.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = process.env.DOTENV_CONFIG_PATH || '.env.railway'
dotenv.config({ path: path.join(root, envFile), override: true })

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}

const client = new pg.Client(pgClientOptions(url))
await client.connect()
await client.query('SET search_path TO demeritos, principal, public')

const before = {}
for (const t of [
  'estudiantes',
  'maestros',
  'demeritos',
  'reconocimientos',
  'movimientos_redencion',
  'notificaciones',
  'orientaciones_log',
]) {
  try {
    const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`)
    before[t] = r.rows[0].n
  } catch {
    before[t] = null
  }
}
console.log('Antes:', before)

await client.query('BEGIN')
try {
  // Romper FK demeritos <-> movimientos_redencion si existe
  await client.query(`
    DO $$ BEGIN
      UPDATE demeritos SET id_mov_redencion = NULL WHERE id_mov_redencion IS NOT NULL;
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
    END $$
  `)

  const wipe = [
    'movimientos_redencion',
    'notificaciones',
    'reconocimientos',
    'demeritos',
    'orientaciones_log',
  ]

  for (const table of wipe) {
    try {
      const r = await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`)
      console.log(`[OK] TRUNCATE ${table}`)
    } catch (e) {
      // Algunas BD usan nombre distinto o no tienen la tabla
      try {
        const r = await client.query(`DELETE FROM ${table}`)
        console.log(`[OK] DELETE ${table} (${r.rowCount} filas)`)
      } catch (e2) {
        console.log(`[SKIP] ${table}: ${e2.message}`)
      }
    }
  }

  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  console.error('Error:', e.message)
  await client.end()
  process.exit(1)
}

const after = {}
for (const t of [
  'estudiantes',
  'maestros',
  'demeritos',
  'reconocimientos',
  'movimientos_redencion',
  'notificaciones',
]) {
  try {
    const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`)
    after[t] = r.rows[0].n
  } catch {
    after[t] = null
  }
}
console.log('Después:', after)
console.log('Listo: alumnos y maestros intactos; registros operativos en 0.')
await client.end()
