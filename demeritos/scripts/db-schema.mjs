/**
 * Esquema de la app (tablas/vistas de deméritos, maestros vista, etc.).
 * En Railway suele ser `demeritos` (antes `public`). Local antiguo: `public`.
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local') })
dotenv.config({ path: path.join(root, '.env') })

function parseSchemaName(raw) {
  const name = (raw || 'demeritos').trim()
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`DB_SCHEMA inválido: ${name}`)
  }
  return name
}

/** @type {string} */
export const APP_SCHEMA = parseSchemaName(process.env.DB_SCHEMA)

export function qual(table) {
  return `${APP_SCHEMA}.${table}`
}

export function regclass(table) {
  return `'${APP_SCHEMA}.${table}'`
}

/** Opción de conexión pg: tablas sin prefijo resuelven en APP_SCHEMA, luego principal y public. */
export function pgSearchPathOption() {
  return `-c search_path=${APP_SCHEMA},principal,public`
}

export async function ensureAppSchema(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${APP_SCHEMA}`)
  await client.query(`SET search_path TO ${APP_SCHEMA}, principal`)
  try {
    await client.query(`GRANT ALL ON SCHEMA ${APP_SCHEMA} TO postgres`)
  } catch {
    /* rol distinto en Railway */
  }
}

/** No borrar el esquema demeritos si ya contiene las tablas de la app. */
export async function isLegacyDemeritosSchema(client) {
  const app = await client.query(`SELECT to_regclass($1) AS t`, [qual('demeritos')])
  if (app.rows[0]?.t) return false
  const old = await client.query(`SELECT to_regclass('demeritos.demerito') AS t`)
  return Boolean(old.rows[0]?.t)
}
