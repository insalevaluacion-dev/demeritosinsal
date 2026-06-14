/**

 * Configura APP_SCHEMA en Railway (vistas INSAL + tablas deméritos + catálogos).

 * Uso: npm run db:setup-railway  (con DATABASE_URL y DB_SCHEMA=demeritos en .env.local)

 */

import fs from 'fs'

import path from 'path'

import { fileURLToPath } from 'url'

import { execSync } from 'child_process'

import dotenv from 'dotenv'

import pg from 'pg'

import { pgPoolOptions } from './pg-config.mjs'

import { APP_SCHEMA, ensureAppSchema, regclass } from './db-schema.mjs'



const __dirname = path.dirname(fileURLToPath(import.meta.url))

const root = path.join(__dirname, '..')



dotenv.config({ path: path.join(root, '.env.local') })



const url = process.env.DATABASE_URL

if (!url) {

  console.error('[railway-setup] Falta DATABASE_URL')

  process.exit(1)

}



async function verify() {

  const pool = new pg.Pool(pgPoolOptions(url))

  const client = await pool.connect()

  try {

    await ensureAppSchema(client)

    const checks = [

      `SELECT to_regclass(${regclass('estudiantes')}) AS t`,

      `SELECT to_regclass(${regclass('maestros')}) AS t`,

      `SELECT to_regclass(${regclass('demeritos')}) AS t`,

      `SELECT to_regclass(${regclass('causales_demerito')}) AS t`,

      `SELECT COUNT(*)::int AS n FROM estudiantes`,

      `SELECT COUNT(*)::int AS n FROM principal.maestros WHERE email IS NOT NULL AND email <> ''`,

    ]

    for (const sql of checks) {

      const r = await client.query(sql)

      console.log('[verify]', sql.slice(0, 55), '->', r.rows[0])

    }

  } finally {

    client.release()

    await pool.end()

  }

}



async function applySetupDb() {

  const pool = new pg.Pool(pgPoolOptions(url))

  const client = await pool.connect()

  try {

    await ensureAppSchema(client)

    const sql = fs.readFileSync(path.join(__dirname, 'setup-db.sql'), 'utf8')

    console.log(`[railway-setup] Aplicando setup-db.sql en ${APP_SCHEMA} …`)

    await client.query(sql)

  } finally {

    client.release()

    await pool.end()

  }

}



console.log(`[railway-setup] 0/3 asegurar schema ${APP_SCHEMA} …`)

{

  const pool = new pg.Pool(pgPoolOptions(url))

  const client = await pool.connect()

  await ensureAppSchema(client)

  client.release()

  await pool.end()

}



console.log(`[railway-setup] 1/3 setup-db.sql (tablas en ${APP_SCHEMA}) …`)

await applySetupDb()



console.log(`[railway-setup] 2/3 post-import-insal (vistas ${APP_SCHEMA}.*) …`)

execSync('node scripts/post-import-insal.mjs', {

  stdio: 'inherit',

  cwd: root,

  env: { ...process.env, DATABASE_URL: url },

})



console.log('[railway-setup] 3/4 ensure-catalogs …')

execSync('node scripts/ensure-catalogs.mjs', {

  stdio: 'inherit',

  cwd: root,

  env: { ...process.env, DATABASE_URL: url },

})



console.log('[railway-setup] 4/4 migrate-public-fks (FKs; no borra esquema app) …')

execSync('node scripts/migrate-public-fks.mjs', {

  stdio: 'inherit',

  cwd: root,

  env: { ...process.env, DATABASE_URL: url },

})



console.log('[railway-setup] Verificación:')

await verify()

console.log('[railway-setup] Listo.')


