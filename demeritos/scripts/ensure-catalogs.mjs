import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { pgClientOptions } from './pg-config.mjs'
import { regclass } from './db-schema.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local') })

const CAUSALES = [
  ['A', 'Falta de respeto a compañeros o docentes'],
  ['B', 'Uso de lenguaje inapropiado'],
  ['C', 'Daño a propiedad institucional'],
  ['D', 'Incumplimiento reiterado del reglamento'],
]
const OPCIONES = [
  ['A', 'Trabajo de beneficio comunitario'],
  ['B', 'Carta de reflexión firmada por el alumno y responsable'],
  ['C', 'Sesión de orientación con el docente orientador'],
]
const TIPOS = [
  ['A', 'Destacado en convivencia escolar'],
  ['B', 'Participación destacada en actividades institucionales'],
]

async function seedIfEmpty(client, table, col, rows) {
  const { rows: count } = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`)
  if (count[0].n > 0) return
  for (const [letra, descripcion] of rows) {
    await client.query(
      `INSERT INTO ${table} (${col}, descripcion) VALUES ($1, $2) ON CONFLICT (${col}) DO NOTHING`,
      [letra, descripcion]
    )
  }
  console.log(`[catalogs] Catálogo ${table} inicializado.`)
}

export async function ensureCatalogs(url = process.env.DATABASE_URL) {
  const client = new pg.Client(pgClientOptions(url))
  await client.connect()
  try {
    const { rows } = await client.query(`SELECT to_regclass(${regclass('causales_demerito')}) AS t`)
    if (!rows[0]?.t) return
    await seedIfEmpty(client, 'causales_demerito', 'letra', CAUSALES)
    await seedIfEmpty(client, 'opciones_redencion', 'letra', OPCIONES)
    await seedIfEmpty(client, 'tipos_reconocimiento', 'letra', TIPOS)
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
