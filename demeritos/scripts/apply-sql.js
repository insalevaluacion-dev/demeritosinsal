// Aplica setup-schema.sql y setup-db.sql en APP_SCHEMA (sin psql).
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const dotenv = require('dotenv')

const root = path.join(__dirname, '..')
dotenv.config({ path: path.join(root, '.env.local') })

const url = process.env.DATABASE_URL
if (!url) {
  console.error('apply-sql: falta DATABASE_URL')
  process.exit(1)
}

async function main() {
  const { ensureAppSchema, APP_SCHEMA } = await import('./db-schema.mjs')
  const { pgPoolOptions } = await import('./pg-config.mjs')
  const pool = new Pool(pgPoolOptions(url))
  const client = await pool.connect()
  try {
    await ensureAppSchema(client)
    console.log(`apply-sql: esquema ${APP_SCHEMA}`)
    for (const rel of ['setup-schema.sql', 'setup-db.sql']) {
      const file = path.join(__dirname, rel)
      const sql = fs.readFileSync(file, 'utf8')
      console.log(`apply-sql: ejecutando ${rel} …`)
      await client.query(sql)
    }
    console.log('apply-sql: listo.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('apply-sql:', e.message)
  process.exit(1)
})
