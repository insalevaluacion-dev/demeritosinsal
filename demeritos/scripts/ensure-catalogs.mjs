import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { pgClientOptions } from './pg-config.mjs'
import { regclass } from './db-schema.mjs'
import {
  CAUSALES_DEMERITO,
  OPCIONES_REDENCION,
  TIPOS_RECONOCIMIENTO,
} from './catalog-texts.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local') })

async function upsertCatalog(client, table, col, rows) {
  for (const [letra, descripcion] of rows) {
    await client.query(
      `INSERT INTO ${table} (${col}, descripcion, activo) VALUES ($1, $2, true)
       ON CONFLICT (${col}) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true`,
      [letra, descripcion]
    )
  }
  console.log(`[catalogs] Catálogo ${table} sincronizado.`)
}

export async function ensureCatalogs(url = process.env.DATABASE_URL) {
  const client = new pg.Client(pgClientOptions(url))
  await client.connect()
  try {
    const { rows } = await client.query(`SELECT to_regclass(${regclass('causales_demerito')}) AS t`)
    if (!rows[0]?.t) return
    await upsertCatalog(client, 'causales_demerito', 'letra', CAUSALES_DEMERITO)
    await upsertCatalog(client, 'opciones_redencion', 'letra', OPCIONES_REDENCION)
    await upsertCatalog(client, 'tipos_reconocimiento', 'letra', TIPOS_RECONOCIMIENTO)
  } finally {
    await client.end()
  }
}

if (process.argv[1]?.endsWith('ensure-catalogs.mjs')) {
  ensureCatalogs().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
