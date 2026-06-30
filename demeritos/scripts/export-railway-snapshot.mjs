/**
 * Exporta esquemas principal + demeritos (tablas base) desde Railway a data/railway-snapshot.sql
 * Uso: npm run db:export-railway  (lee DATABASE_URL de .env.railway o .env.local)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'
import { pgPoolOptions } from './pg-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'data')
const outFile = path.join(outDir, 'railway-snapshot.sql')

dotenv.config({ path: path.join(root, '.env.railway'), override: true })
if (!process.env.DATABASE_URL?.includes('rlwy.net')) {
  console.error('[export] Configure .env.railway con la URL de Railway antes de exportar.')
  process.exit(1)
}

const PRINCIPAL_TABLES = [
  'bachilleratos',
  'niveles_estudios',
  'turno',
  'roles',
  'materia',
  'secciones',
  'grados',
  'estudiantes',
  'familiares',
  'maestros',
  'orientadores',
  'orientaciones_log',
]

const DEMERITOS_TABLES = [
  'causales_demerito',
  'opciones_redencion',
  'tipos_reconocimiento',
  'demeritos',
  'reconocimientos',
  'movimientos_redencion',
  'notificaciones',
]

function sqlLiteral(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (val instanceof Date) return `'${val.toISOString().replace('T', ' ').replace('Z', '+00')}'`
  if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`
  if (typeof val === 'number' || typeof val === 'bigint') return String(val)
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

async function exportEnums(client, lines) {
  const { rows } = await client.query(`
    SELECT n.nspname AS schema, t.typname AS name, e.enumlabel AS label, e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname IN ('demeritos', 'public')
    ORDER BY n.nspname, t.typname, e.enumsortorder
  `)
  const grouped = new Map()
  for (const row of rows) {
    const key = `${row.schema}.${row.name}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(row.label)
  }
  for (const [key, labels] of grouped) {
    const [schema, name] = key.split('.')
    lines.push(
      `DO $$ BEGIN CREATE TYPE ${schema}.${name} AS ENUM (${labels.map((l) => sqlLiteral(l)).join(', ')}); EXCEPTION WHEN duplicate_object THEN null; END $$;`
    )
  }
}

async function exportTableDdl(client, schema, table, lines) {
  const { rows: cols } = await client.query(
    `SELECT column_name, data_type, udt_name, character_maximum_length, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table]
  )
  if (!cols.length) return false

  const colDefs = cols.map((c) => {
    let type = c.data_type
    if (type === 'USER-DEFINED') type = c.udt_name
    if (type === 'character varying' && c.character_maximum_length) {
      type = `varchar(${c.character_maximum_length})`
    }
    let def = `${c.column_name} ${type}`
    if (c.is_nullable === 'NO') def += ' NOT NULL'
    if (c.column_default && !String(c.column_default).includes('nextval')) {
      def += ` DEFAULT ${c.column_default}`
    }
    return def
  })

  lines.push(`CREATE TABLE IF NOT EXISTS ${schema}.${table} (`)
  lines.push(`  ${colDefs.join(',\n  ')}`)
  lines.push(`);`)
  return true
}

async function exportTableData(client, schema, table, lines) {
  const { rows } = await client.query(`SELECT * FROM ${schema}.${table}`)
  if (!rows.length) return 0

  const cols = Object.keys(rows[0])
  const colList = cols.map((c) => `"${c}"`).join(', ')
  for (const row of rows) {
    const vals = cols.map((c) => sqlLiteral(row[c]))
    lines.push(`INSERT INTO ${schema}.${table} (${colList}) VALUES (${vals.join(', ')});`)
  }
  return rows.length
}

async function resetSequences(client, schema, table, lines) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 AND column_default LIKE 'nextval%'`,
    [schema, table]
  )
  for (const { column_name } of rows) {
    lines.push(`
SELECT setval(pg_get_serial_sequence('${schema}.${table}', '${column_name}'),
  COALESCE((SELECT MAX("${column_name}") FROM ${schema}.${table}), 1), true);`)
  }
}

const url = process.env.DATABASE_URL

async function connectWithRetry(maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const pool = new pg.Pool(pgPoolOptions(url))
    try {
      const client = await pool.connect()
      return { pool, client }
    } catch (e) {
      await pool.end().catch(() => {})
      const msg = e instanceof Error ? e.message : String(e)
      if (attempt === maxAttempts || !msg.includes('starting up')) throw e
      console.log(`[export] Railway iniciando… reintento ${attempt}/${maxAttempts}`)
      await new Promise((r) => setTimeout(r, 4000))
    }
  }
  throw new Error('No se pudo conectar a Railway')
}

const { pool, client } = await connectWithRetry()

try {
  console.log('[export] Leyendo Railway…')
  const lines = [
    '-- INSAL demeritos — snapshot exportado desde Railway',
    `-- Generado: ${new Date().toISOString()}`,
    'CREATE SCHEMA IF NOT EXISTS principal;',
    'CREATE SCHEMA IF NOT EXISTS demeritos;',
    'SET search_path TO demeritos, principal, public;',
  ]

  await exportEnums(client, lines)

  for (const table of PRINCIPAL_TABLES) {
    const ok = await exportTableDdl(client, 'principal', table, lines)
    if (!ok) console.warn(`[export] Omitida principal.${table} (no existe)`)
  }

  for (const table of DEMERITOS_TABLES) {
    const ok = await exportTableDdl(client, 'demeritos', table, lines)
    if (!ok) console.warn(`[export] Omitida demeritos.${table} (no existe)`)
  }

  lines.push('-- Datos principal')
  let totalStudents = 0
  for (const table of PRINCIPAL_TABLES) {
    const n = await exportTableData(client, 'principal', table, lines)
    if (table === 'estudiantes') totalStudents = n
    if (n) console.log(`[export] principal.${table}: ${n} filas`)
  }

  lines.push('-- Datos demeritos')
  for (const table of DEMERITOS_TABLES) {
    const n = await exportTableData(client, 'demeritos', table, lines)
    if (n) console.log(`[export] demeritos.${table}: ${n} filas`)
  }

  lines.push('-- Secuencias')
  for (const table of [...PRINCIPAL_TABLES, ...DEMERITOS_TABLES]) {
    const schema = PRINCIPAL_TABLES.includes(table) ? 'principal' : 'demeritos'
    await resetSequences(client, schema, table, lines)
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8')
  const sizeMb = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(2)
  console.log(`[export] Listo: ${outFile} (${sizeMb} MB, ${totalStudents} estudiantes)`)
} finally {
  client.release()
  await pool.end()
}
