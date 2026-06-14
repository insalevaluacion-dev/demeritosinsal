/** Añade contrasena_plana y actualiza la vista de maestros en APP_SCHEMA */

import pg from 'pg'

import dotenv from 'dotenv'

import path from 'path'

import { fileURLToPath } from 'url'

import { pgClientOptions } from './pg-config.mjs'

import { APP_SCHEMA, ensureAppSchema } from './db-schema.mjs'



const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

dotenv.config({ path: path.join(root, '.env.local') })



const client = new pg.Client(pgClientOptions(process.env.DATABASE_URL))



async function main() {

  await client.connect()

  await ensureAppSchema(client)



  await client.query(`

    ALTER TABLE principal.maestros ADD COLUMN IF NOT EXISTS contrasena_plana VARCHAR(255)

  `).catch(async () => {

    await client.query(`ALTER TABLE maestros ADD COLUMN IF NOT EXISTS contrasena_plana VARCHAR(255)`)

  })



  await client.query(`

    ALTER TABLE principal.maestros ADD COLUMN IF NOT EXISTS rol_sesion VARCHAR(20)

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

  console.log('[migrate] Listo. Reinicie npm run dev si la app estaba abierta.')

}



main().catch(e => { console.error(e); process.exit(1) }).finally(() => client.end())


