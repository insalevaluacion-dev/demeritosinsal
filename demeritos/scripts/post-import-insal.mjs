/**

 * Vistas en APP_SCHEMA (demeritos en Railway) compatibles con dbInsal.sql (principal INSAL).

 */

import path from 'path'

import { fileURLToPath } from 'url'

import dotenv from 'dotenv'

import pg from 'pg'

import bcrypt from 'bcryptjs'

import { pgPoolOptions } from './pg-config.mjs'

import { APP_SCHEMA, ensureAppSchema } from './db-schema.mjs'



const __dirname = path.dirname(fileURLToPath(import.meta.url))

const root = path.join(__dirname, '..')

const S = APP_SCHEMA



dotenv.config({ path: path.join(root, '.env.local') })



const dbUrl = process.env.DATABASE_URL

if (!dbUrl) throw new Error('DATABASE_URL no definido')



const pool = new pg.Pool(pgPoolOptions(dbUrl))

const skipDemo = process.env.SKIP_DEMO_STUDENTS === '1'

const skipEmails = process.env.SKIP_MAESTRO_EMAILS === '1'

async function run() {

  const client = await pool.connect()

  try {

    await ensureAppSchema(client)



    const { rows: hasPrincipal } = await client.query(

      `SELECT to_regclass('principal.estudiantes') AS t`

    )

    if (!hasPrincipal[0]?.t) {

      console.log('[post-import] No existe principal.estudiantes — importe dbInsal.sql primero.')

      return

    }



    console.log(`[post-import] Creando vistas de compatibilidad en ${S}…`)

    await client.query(`

      DROP VIEW IF EXISTS ${S}.estudiantes CASCADE;

      DROP VIEW IF EXISTS ${S}.maestros CASCADE;

      DROP VIEW IF EXISTS ${S}.grados CASCADE;

      DROP VIEW IF EXISTS ${S}.materia CASCADE;

      DROP VIEW IF EXISTS ${S}.roles CASCADE;

      DROP VIEW IF EXISTS ${S}.turno CASCADE;

      DROP VIEW IF EXISTS ${S}.seccion CASCADE;

      DROP VIEW IF EXISTS ${S}.orientador CASCADE;



      DROP TABLE IF EXISTS ${S}.estudiantes CASCADE;

      DROP TABLE IF EXISTS ${S}.maestros CASCADE;

      DROP TABLE IF EXISTS ${S}.orientador CASCADE;

      DROP TABLE IF EXISTS ${S}.seccion CASCADE;

      DROP TABLE IF EXISTS ${S}.grados CASCADE;

      DROP TABLE IF EXISTS ${S}.materia CASCADE;

      DROP TABLE IF EXISTS ${S}.roles CASCADE;

      DROP TABLE IF EXISTS ${S}.turno CASCADE;



      DROP VIEW IF EXISTS ${S}.grados CASCADE;

      CREATE VIEW ${S}.grados AS

        SELECT

          g.grado_id,

          g.niveles_estudio_id AS nivel,

          ne.nombre AS nivel_nombre,

          COALESCE(b.nombre, 'General') AS especialidad,

          COALESCE(sec.letra, 'A') AS seccion_letra,

          true AS activo,

          g.anio AS anio_escolar

        FROM principal.grados g

        LEFT JOIN principal.niveles_estudios ne ON ne.niveles_estudios_id = g.niveles_estudio_id

        LEFT JOIN principal.bachilleratos b ON b.bachillerato_id = g.bachillerato_id

        LEFT JOIN principal.secciones sec ON sec.seccion_id = g.seccion_id;



      CREATE OR REPLACE VIEW ${S}.materia AS

        SELECT materia_id, nombre_materia AS nombre FROM principal.materia;



      CREATE OR REPLACE VIEW ${S}.roles AS

        SELECT rol_id, nombre, estado AS activo FROM principal.roles;



      CREATE OR REPLACE VIEW ${S}.turno AS SELECT * FROM principal.turno;



      CREATE OR REPLACE VIEW ${S}.seccion AS

        SELECT seccion_id, seccion_id AS grado_id, 1 AS turno_id, letra AS nombre

        FROM principal.secciones;



      CREATE OR REPLACE VIEW ${S}.estudiantes AS

        SELECT

          e.estudiante_id,

          e.nombre_completo,

          e.nie,

          NULL::date AS fecha_de_nacimiento,

          ''::text AS telefono,

          ''::text AS direccion,

          ''::text AS responsable,

          ''::text AS telefono_responsable,

          e.grado_id,

          g.seccion_id,

          e.anio_escolar,

          e.estado

        FROM principal.estudiantes e

        LEFT JOIN principal.grados g ON g.grado_id = e.grado_id;



      CREATE OR REPLACE VIEW ${S}.orientador AS

        SELECT orientador_id, maestro_id, grado_id, anio_escolar AS anio_escolar, activo

        FROM principal.orientadores;

    `)



    await client.query(`

      ALTER TABLE principal.estudiantes ALTER COLUMN nie TYPE VARCHAR(20);

      ALTER TABLE principal.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_nie_check;

    `).catch(() => {})



    await client.query(`

      INSERT INTO principal.roles (rol_id, nombre, estado)

      OVERRIDING SYSTEM VALUE VALUES (3, 'docente', true)

      ON CONFLICT (rol_id) DO NOTHING

    `).catch(() => {})



    await client.query(`

      ALTER TABLE principal.maestros ADD COLUMN IF NOT EXISTS email VARCHAR(255);

      ALTER TABLE principal.maestros ADD COLUMN IF NOT EXISTS contrasena_plana VARCHAR(255);

      ALTER TABLE principal.maestros ADD COLUMN IF NOT EXISTS rol_sesion VARCHAR(20);

    `)



    if (!skipEmails) {

      const hash = await bcrypt.hash('insal2026', 12)

      const { rows: maestros } = await client.query(

        `SELECT maestro_id, nombre, email, contrasena FROM principal.maestros WHERE activo = true`

      )

      const used = new Set()

      for (const m of maestros) {

        let email = m.email

        if (!email) {

          const parts = m.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/).filter(Boolean)

          email = parts.length >= 2 ? `${parts[0]}.${parts[1]}@insal.edu.sv` : `${parts[0] || 'usuario'}@insal.edu.sv`

          let n = 2

          while (used.has(email.toLowerCase())) {

            email = email.replace('@', `${n}@`)

            n++

          }

          used.add(email.toLowerCase())

        }

        const pwd =

          !m.contrasena || m.contrasena === 'hash_pendiente' || !String(m.contrasena).startsWith('$2')

            ? hash

            : m.contrasena

        await client.query(`UPDATE principal.maestros SET email = $1, contrasena = $2 WHERE maestro_id = $3`, [

          email,

          pwd,

          m.maestro_id,

        ])

      }

    }



    await client.query(`

      CREATE OR REPLACE VIEW ${S}.maestros AS

        SELECT maestro_id, nombre, email, contrasena, contrasena_plana,

          materia_id, turno_id, rol_id, activo, creado_en, actualizado_en, rol_sesion

        FROM principal.maestros;

    `)



    const { rows: ec } = await client.query(`SELECT COUNT(*)::int AS n FROM principal.estudiantes`)

    if (ec[0].n === 0 && !skipDemo) {

      console.log('[post-import] Sin alumnos — omitido demo (use import-insal-students).')

    }



    const { rows: mc } = await client.query(`SELECT COUNT(*)::int AS n FROM principal.maestros`)

    const { rows: sc } = await client.query(`SELECT COUNT(*)::int AS n FROM estudiantes`)

    console.log(`[post-import] Listo (${S}): ${mc[0].n} maestros, ${sc[0].n} estudiantes visibles en la app.`)

  } finally {

    client.release()

    await pool.end()

  }

}



run().catch((e) => {

  console.error('[post-import]', e.message || e)

  process.exit(1)

})


