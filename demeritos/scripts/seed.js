// Solo catálogos de deméritos (sin alumnos, maestros ni grados de prueba).
require('dotenv').config()
require('dotenv').config({ path: '.env.local', override: true })
const { Pool } = require('pg')

const dbUrl = process.env.DATABASE_URL
const needSsl =
  !!dbUrl &&
  (dbUrl.includes('render.com') || dbUrl.includes('rlwy.net') || /sslmode=require/i.test(dbUrl))
const pool = new Pool({
  connectionString: dbUrl,
  ssl: needSsl ? { rejectUnauthorized: false } : undefined,
})

async function upsert(table, letterCol, rows) {
  for (const [letra, descripcion] of rows) {
    await pool.query(
      `INSERT INTO ${table} (${letterCol}, descripcion, activo) VALUES ($1, $2, true)
       ON CONFLICT (${letterCol}) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true`,
      [letra, descripcion]
    )
  }
}

async function main() {
  const {
    CAUSALES_DEMERITO,
    OPCIONES_REDENCION,
    TIPOS_RECONOCIMIENTO,
  } = await import('./catalog-texts.mjs')

  console.log('[seed] Catálogos de deméritos...')
  await upsert('causales_demerito', 'letra', CAUSALES_DEMERITO)
  await upsert('opciones_redencion', 'letra', OPCIONES_REDENCION)
  await upsert('tipos_reconocimiento', 'letra', TIPOS_RECONOCIMIENTO)
  console.log('[seed] Catálogos listos.')
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e.message)
    process.exit(1)
  })
  .finally(() => pool.end())
