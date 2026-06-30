/**
 * Inserta o actualiza catálogos en la BD (causales, redenciones, reconocimientos).
 * Uso: node scripts/update-catalogs.mjs
 *      DOTENV_CONFIG_PATH=.env.railway node scripts/update-catalogs.mjs
 */
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { pgClientOptions } from './pg-config.mjs'
import {
  CAUSALES_DEMERITO,
  OPCIONES_REDENCION,
  TIPOS_RECONOCIMIENTO,
} from './catalog-texts.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = process.env.DOTENV_CONFIG_PATH || '.env.local'
dotenv.config({ path: path.join(root, envFile), override: true })

async function upsertCatalog(client, table, letterCol, rows) {
  for (const [letra, descripcion] of rows) {
    await client.query(
      `
      INSERT INTO ${table} (${letterCol}, descripcion, activo)
      VALUES ($1, $2, true)
      ON CONFLICT (${letterCol}) DO UPDATE
      SET descripcion = EXCLUDED.descripcion, activo = true
      `,
      [letra, descripcion]
    )
    console.log(`[catalogs] ${table} ${letra}: ${descripcion}`)
  }
}

const client = new pg.Client(pgClientOptions(process.env.DATABASE_URL))
await client.connect()
try {
  await upsertCatalog(client, 'causales_demerito', 'letra', CAUSALES_DEMERITO)
  await upsertCatalog(client, 'opciones_redencion', 'letra', OPCIONES_REDENCION)
  await upsertCatalog(client, 'tipos_reconocimiento', 'letra', TIPOS_RECONOCIMIENTO)
  console.log('[catalogs] Catálogos actualizados.')
} finally {
  await client.end()
}
