/** Añade contrasena_plana y actualiza la vista de maestros en APP_SCHEMA */

import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { pgClientOptions } from './pg-config.mjs'
import { APP_SCHEMA, ensureAppSchema } from './db-schema.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const envFile = process.env.DOTENV_CONFIG_PATH || '.env.local'
dotenv.config({ path: path.join(root, envFile), override: true })

const client = new pg.Client(pgClientOptions(process.env.DATABASE_URL))

async function syncMaestroIdSequence() {
  const meta = await client.query(`
    SELECT is_identity, column_default
    FROM information_schema.columns
    WHERE table_schema = 'principal' AND table_name = 'maestros' AND column_name = 'maestro_id'
  `)
  const isIdentity = meta.rows[0]?.is_identity === 'YES'

  const seqRes = await client.query(
    `SELECT pg_get_serial_sequence('principal.maestros', 'maestro_id') AS name`
  )
  const pgSeq = seqRes.rows[0]?.name

  if (isIdentity || pgSeq) {
    if (pgSeq) {
      await client.query(
        `SELECT setval($1::regclass, GREATEST(COALESCE((SELECT MAX(maestro_id) FROM principal.maestros), 0)::bigint, 1))`,
        [pgSeq]
      )
    }
    console.log('[migrate] maestro_id: columna IDENTITY/SERIAL — secuencia sincronizada')
    return
  }

  await client.query(`CREATE SEQUENCE IF NOT EXISTS principal.maestros_maestro_id_seq`)
  await client.query(`
    SELECT setval(
      'principal.maestros_maestro_id_seq',
      GREATEST(COALESCE((SELECT MAX(maestro_id) FROM principal.maestros), 0), 1)
    )
  `)

  const hasSeqDefault = String(meta.rows[0]?.column_default || '').includes('nextval')
  if (!hasSeqDefault) {
    await client.query(`
      ALTER TABLE principal.maestros
      ALTER COLUMN maestro_id SET DEFAULT nextval('principal.maestros_maestro_id_seq')
    `)
    await client.query(`
      ALTER SEQUENCE principal.maestros_maestro_id_seq OWNED BY principal.maestros.maestro_id
    `).catch(() => {})
  }
  console.log('[migrate] secuencia maestro_id en principal.maestros: OK')
}

async function main() {
  await client.connect()
  await ensureAppSchema(client)

  await syncMaestroIdSequence()

  await client.query(`
    ALTER TABLE principal.maestros ADD COLUMN IF NOT EXISTS contrasena_plana VARCHAR(255)
  `).catch(async () => {
    await client.query(`ALTER TABLE maestros ADD COLUMN IF NOT EXISTS contrasena_plana VARCHAR(255)`)
  })

  await client.query(`
    ALTER TABLE principal.maestros ADD COLUMN IF NOT EXISTS rol_sesion VARCHAR(20)
  `).catch(() => {})

  await client.query(`
    ALTER TABLE principal.maestros
    ADD COLUMN IF NOT EXISTS orientador_declinado BOOLEAN NOT NULL DEFAULT FALSE
  `).catch(() => {})

  await client.query(`
    CREATE OR REPLACE VIEW ${APP_SCHEMA}.maestros AS
    SELECT maestro_id, nombre, email, contrasena, contrasena_plana,
      materia_id, turno_id, rol_id, activo, creado_en, actualizado_en, rol_sesion
    FROM principal.maestros
  `)

  const check = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'principal' AND table_name = 'maestros' AND column_name = 'contrasena_plana'
  `)
  console.log('[migrate] contrasena_plana en principal.maestros:', check.rows.length > 0 ? 'OK' : 'FALTA')

  const view = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = 'maestros' AND column_name = 'contrasena_plana'
  `, [APP_SCHEMA])
  console.log(`[migrate] contrasena_plana en ${APP_SCHEMA}.maestros:`, view.rows.length > 0 ? 'OK' : 'FALTA')
  console.log('[migrate] Listo.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => client.end())
