// Solo catálogos de deméritos (sin alumnos, maestros ni grados de prueba).
require('dotenv').config()
require('dotenv').config({ path: '.env.local', override: true })
const { Pool } = require('pg')

const dbUrl = process.env.DATABASE_URL
const needSsl =
  !!dbUrl &&
  (dbUrl.includes('render.com') || /sslmode=require/i.test(dbUrl))
const pool = new Pool({
  connectionString: dbUrl,
  ssl: needSsl ? { rejectUnauthorized: false } : undefined,
})

async function main() {
  console.log('[seed] Catálogos de deméritos...')

  await pool.query(`INSERT INTO causales_demerito (letra, descripcion) VALUES
    ('A','No saludar al entrar o al salir del aula.'),
    ('B','Omitir "Por favor" al hacer una petición.'),
    ('C','Omitir "Gracias" al recibir un favor, material o atención.'),
    ('D','Usar un tono grosero o irrespetuoso hacia compañeros, docentes o personal.')
    ON CONFLICT (letra) DO NOTHING`)

  await pool.query(`INSERT INTO opciones_redencion (letra, descripcion) VALUES
    ('A','Cumplir una semana completa con saludos y expresiones de cortesía ejemplares.'),
    ('B','Apoyar voluntariamente en actividades de orden y limpieza escolar.'),
    ('C','Participar en campañas de valores organizadas por el centro educativo.')
    ON CONFLICT (letra) DO NOTHING`)

  await pool.query(`INSERT INTO tipos_reconocimiento (letra, descripcion) VALUES
    ('A','Diplomas'),
    ('B','Menciones en Murales Escolares')
    ON CONFLICT (letra) DO NOTHING`)

  console.log('[seed] Catálogos listos.')
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e.message)
    process.exit(1)
  })
  .finally(() => pool.end())
