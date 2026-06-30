/**
 * Inserta 20 registros de dem meri rec de prueba etc
 *
 * Usen -  npm run db:seed-demo
 */
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

import {
  CAUSALES_DEMERITO,
  OPCIONES_REDENCION,
  TIPOS_RECONOCIMIENTO,
} from './catalog-texts.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local') })

const DEMO_EMAIL = 'demo.reportes@clases.edu.sv'
const ANIO = 2026

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function ensureCatalogs() {
  for (const [letra, descripcion] of CAUSALES_DEMERITO) {
    await client.query(
      `INSERT INTO causales_demerito (letra, descripcion, activo) VALUES ($1, $2, true)
       ON CONFLICT (letra) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true`,
      [letra, descripcion]
    )
  }
  for (const [letra, descripcion] of OPCIONES_REDENCION) {
    await client.query(
      `INSERT INTO opciones_redencion (letra, descripcion, activo) VALUES ($1, $2, true)
       ON CONFLICT (letra) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true`,
      [letra, descripcion]
    )
  }
  for (const [letra, descripcion] of TIPOS_RECONOCIMIENTO) {
    await client.query(
      `INSERT INTO tipos_reconocimiento (letra, descripcion, activo) VALUES ($1, $2, true)
       ON CONFLICT (letra) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true`,
      [letra, descripcion]
    )
  }
}

async function ensureMaestro() {
  let res = await client.query(
    `SELECT maestro_id FROM maestros WHERE activo = true ORDER BY maestro_id LIMIT 1`
  )
  if (res.rows[0]?.maestro_id) return res.rows[0].maestro_id

  await client.query(`INSERT INTO roles (rol_id, nombre, activo) VALUES (3,'docente',true) ON CONFLICT DO NOTHING`).catch(() => {})
  const rol = await client.query(`SELECT rol_id FROM roles ORDER BY rol_id LIMIT 1`)
  const hash = await bcrypt.hash('demo2026', 12)
  res = await client.query(
    `INSERT INTO maestros (nombre, email, contrasena, rol_id, turno_id, activo)
     VALUES ('Docente Demo Reportes', $1, $2, $3, 1, true)
     RETURNING maestro_id`,
    [DEMO_EMAIL, hash, rol.rows[0]?.rol_id || 3]
  )
  return res.rows[0].maestro_id
}

async function main() {
  await client.connect()
  console.log('[seed-demo] Conectado.')

  await ensureCatalogs()

  const { rows: causales } = await client.query(`SELECT id_causal, letra FROM causales_demerito`)
  const { rows: opciones } = await client.query(`SELECT id_opcion, letra FROM opciones_redencion`)
  const { rows: tipos } = await client.query(`SELECT id_tipo, letra FROM tipos_reconocimiento`)

  const { rows: alumnos } = await client.query(
    `
    SELECT nie, nombre_completo, grado_id
    FROM estudiantes
    WHERE estado = true AND (anio_escolar = ${ANIO} OR anio_escolar IS NULL)
    ORDER BY RANDOM()
    LIMIT 20
    `
  )

  if (alumnos.length < 5) {
    console.error('[seed-demo] Pocos alumnos en BD. Importe alumnos INSAL primero.')
    process.exit(1)
  }

  const maestroId = await ensureMaestro()
  console.log(`[seed-demo] Maestro id=${maestroId}, alumnos=${alumnos.length}`)

  const meses = [
    { mes: 1, dia: 12 },
    { mes: 1, dia: 20 },
    { mes: 2, dia: 5 },
    { mes: 2, dia: 18 },
    { mes: 3, dia: 8 },
    { mes: 3, dia: 22 },
    { mes: 4, dia: 10 },
    { mes: 4, dia: 25 },
    { mes: 5, dia: 7 },
    { mes: 5, dia: 19 },
  ]

  const demeritoIds = []
  let demCount = 0

  for (let i = 0; i < 14; i++) {
    const alumno = alumnos[i % alumnos.length]
    const causal = pick(causales)
    const fecha = meses[i % meses.length]
    const sexo = i % 3 === 0 ? 'M' : 'H'
    const ins = await client.query(
      `
      INSERT INTO demeritos (nie, id_causal, causal_letra, id_maestro, fecha, observacion, sexo_alumno, alumno_firmo, redimido)
      VALUES ($1, $2, $3, $4, make_date(2026, $5, $6), $7, $8, $9, false)
      RETURNING id_demerito
      `,
      [
        alumno.nie,
        causal.id_causal,
        causal.letra,
        maestroId,
        fecha.mes,
        fecha.dia,
        `Demérito de prueba #${i + 1} — ${alumno.nombre_completo}`,
        sexo,
        i % 2 === 0,
      ]
    )
    demeritoIds.push(ins.rows[0].id_demerito)
    demCount++
  }

  let recCount = 0
  for (let i = 0; i < 4; i++) {
    const alumno = alumnos[(i + 5) % alumnos.length]
    const tipo = pick(tipos)
    const fecha = meses[(i + 2) % meses.length]
    const sexo = i % 2 === 0 ? 'M' : 'H'
    await client.query(
      `
      INSERT INTO reconocimientos (nie, id_tipo, tipo_letra, id_maestro, fecha, observacion, sexo_alumno)
      VALUES ($1, $2, $3, $4, make_date(2026, $5, $6), $7, $8)
      `,
      [
        alumno.nie,
        tipo.id_tipo,
        tipo.letra,
        maestroId,
        fecha.mes,
        fecha.dia,
        `Reconocimiento de prueba — buen comportamiento`,
        sexo,
      ]
    )
    recCount++
  }

  let redCount = 0
  for (let i = 0; i < 3; i++) {
    const alumno = alumnos[(i + 10) % alumnos.length]
    const opcion = pick(opciones)
    const idDem = demeritoIds[i]
    const fecha = meses[(i + 4) % meses.length]
    await client.query(
      `
      INSERT INTO movimientos_redencion (nie, id_demerito, id_opcion, opcion_letra, id_maestro, observacion, fecha_hora)
      VALUES ($1, $2, $3, $4, $5, $6, make_timestamp(2026, $7, $8, 10, 30, 0))
      `,
      [
        alumno.nie,
        idDem,
        opcion.id_opcion,
        opcion.letra,
        maestroId,
        'Redención de prueba completada',
        fecha.mes,
        fecha.dia,
      ]
    )
    await client.query(`UPDATE demeritos SET redimido = true WHERE id_demerito = $1`, [idDem])
    redCount++
  }

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM demeritos) AS demeritos,
      (SELECT COUNT(*)::int FROM reconocimientos) AS reconocimientos,
      (SELECT COUNT(*)::int FROM movimientos_redencion) AS redenciones
  `)

  console.log('[seed-demo] Insertados en esta ejecución:')
  console.log(`  deméritos: ${demCount}`)
  console.log(`  reconocimientos: ${recCount}`)
  console.log(`  redenciones: ${redCount}`)
  console.log('[seed-demo] Totales en BD:', counts.rows[0])
  console.log('[seed-demo] Listo. Abra Reportes y cargue un reporte mensual o anual 2026.')
}

main()
  .catch((e) => {
    console.error('[seed-demo] Error:', e.message)
    process.exit(1)
  })
  .finally(() => client.end())
