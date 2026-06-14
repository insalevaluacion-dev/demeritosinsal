/**
 * Sincroniza secuencias IDENTITY/SERIAL tras import INSAL.
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { pgClientOptions } from './pg-config.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local') })

const tables = [
  ['principal', 'maestros', 'maestro_id'],
  ['principal', 'estudiantes', 'estudiante_id'],
  ['principal', 'grados', 'grado_id'],
  ['principal', 'orientadores', 'orientador_id'],
]

const c = new pg.Client(pgClientOptions(process.env.DATABASE_URL))
await c.connect()
try {
  for (const [schema, table, col] of tables) {
    const seqRes = await c.query(`SELECT pg_get_serial_sequence($1, $2) AS name`, [
      `${schema}.${table}`,
      col,
    ])
    const seq = seqRes.rows[0]?.name
    if (!seq) {
      console.log(`[fix-seq] Sin secuencia: ${schema}.${table}.${col}`)
      continue
    }
    const maxRes = await c.query(
      `SELECT COALESCE(MAX(${col}), 0)::bigint AS m FROM ${schema}.${table}`
    )
    const max = Number(maxRes.rows[0].m)
    if (max === 0) {
      await c.query(`SELECT setval($1::regclass, 1, false)`, [seq])
      console.log(`[fix-seq] ${schema}.${table}: vacía → secuencia ${seq} reiniciada (próximo 1)`)
    } else {
      await c.query(`SELECT setval($1::regclass, $2::bigint, true)`, [seq, max])
      const after = await c.query(`SELECT last_value FROM ${seq}`)
      console.log(
        `[fix-seq] ${schema}.${table}: max=${max} → secuencia ${seq} last_value=${after.rows[0].last_value} (próximo ${max + 1})`
      )
    }
  }
  console.log('[fix-seq] Listo.')
} finally {
  await c.end()
}
