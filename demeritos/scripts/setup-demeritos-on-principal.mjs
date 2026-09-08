/**
 * Crea el esquema demeritos en una Postgres que ya tiene principal.
 * No toca evaluaciones ni datos del plantel. Idempotente.
 *
 *   node scripts/setup-demeritos-on-principal.mjs --railway
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { pgClientOptions } from './pg-config.mjs'
import { APP_SCHEMA, ensureAppSchema } from './db-schema.mjs'
import {
  CAUSALES_DEMERITO,
  OPCIONES_REDENCION,
  TIPOS_RECONOCIMIENTO,
} from './catalog-texts.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = process.argv.includes('--local') ? '.env.local' : '.env.railway'
dotenv.config({ path: path.join(root, envFile), override: true })

const url = process.env.DATABASE_URL
if (!url) {
  console.error(`[setup-principal] Falta DATABASE_URL en ${envFile}`)
  process.exit(1)
}

const S = APP_SCHEMA
const client = new pg.Client(pgClientOptions(url))

async function snapshotEvaluaciones() {
  const exists = await client.query(`SELECT to_regclass('evaluaciones.evaluaciones') AS t`)
  if (!exists.rows[0]?.t) return null
  const r = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM evaluaciones.criterios) AS criterios,
      (SELECT COUNT(*)::int FROM evaluaciones.estudiantes) AS estudiantes,
      (SELECT COUNT(*)::int FROM evaluaciones.evaluaciones) AS evaluaciones,
      (SELECT COUNT(*)::int FROM evaluaciones.evaluadores) AS evaluadores,
      (SELECT COUNT(*)::int FROM evaluaciones.proyectos) AS proyectos
  `)
  return r.rows[0]
}

async function tableColumns(schema, table) {
  const r = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
  `,
    [schema, table]
  )
  return new Set(r.rows.map((row) => row.column_name))
}

async function upsertCatalog(table, col, rows) {
  for (const [letra, descripcion] of rows) {
    await client.query(
      `INSERT INTO ${S}.${table} (${col}, descripcion, activo) VALUES ($1, $2, true)
       ON CONFLICT (${col}) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true`,
      [letra, descripcion]
    )
  }
  console.log(`[setup-principal] Catálogo ${table} listo`)
}

async function addFk(name, sql) {
  const exists = await client.query(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [name])
  if (exists.rows.length) {
    console.log(`[setup-principal] FK ya existe: ${name}`)
    return
  }
  await client.query(sql)
  console.log(`[setup-principal] FK OK: ${name}`)
}

async function createAppTables() {
  await client.query(`
    DO $$ BEGIN CREATE TYPE ${S}.tipo_notif_enum AS ENUM ('demerito','reconocimiento','redencion');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE ${S}.causal_letra_enum AS ENUM ('A','B','C','D');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE ${S}.opcion_letra_enum AS ENUM ('A','B','C');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE ${S}.tipo_rc_enum AS ENUM ('A','B');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${S}.causales_demerito (
      id_causal   SERIAL PRIMARY KEY,
      letra       ${S}.causal_letra_enum NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      activo      BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS ${S}.opciones_redencion (
      id_opcion   SERIAL PRIMARY KEY,
      letra       ${S}.opcion_letra_enum NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      activo      BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS ${S}.tipos_reconocimiento (
      id_tipo     SERIAL PRIMARY KEY,
      letra       ${S}.tipo_rc_enum NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      activo      BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS ${S}.demeritos (
      id_demerito      BIGSERIAL PRIMARY KEY,
      nie              VARCHAR(20) NOT NULL,
      id_causal        INTEGER NOT NULL REFERENCES ${S}.causales_demerito(id_causal),
      causal_letra     ${S}.causal_letra_enum NOT NULL,
      id_maestro       INTEGER NOT NULL,
      fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
      observacion      TEXT,
      sexo_alumno      CHAR(1) CHECK (sexo_alumno IN ('M','H')),
      redimido         BOOLEAN NOT NULL DEFAULT FALSE,
      alumno_firmo     BOOLEAN NOT NULL DEFAULT FALSE,
      fecha_redencion  TIMESTAMPTZ,
      id_mov_redencion BIGINT,
      creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ${S}.reconocimientos (
      id_reconocimiento BIGSERIAL PRIMARY KEY,
      nie               VARCHAR(20) NOT NULL,
      id_tipo           INTEGER NOT NULL REFERENCES ${S}.tipos_reconocimiento(id_tipo),
      tipo_letra        ${S}.tipo_rc_enum NOT NULL,
      id_maestro        INTEGER NOT NULL,
      fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
      observacion       TEXT,
      sexo_alumno       CHAR(1),
      creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ${S}.movimientos_redencion (
      id_mov       BIGSERIAL PRIMARY KEY,
      nie          VARCHAR(20) NOT NULL,
      id_demerito  BIGINT NOT NULL REFERENCES ${S}.demeritos(id_demerito) ON DELETE CASCADE,
      id_opcion    INTEGER NOT NULL REFERENCES ${S}.opciones_redencion(id_opcion),
      opcion_letra ${S}.opcion_letra_enum NOT NULL,
      id_maestro   INTEGER NOT NULL,
      observacion  TEXT,
      fecha_hora   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ${S}.notificaciones (
      id_notif     BIGSERIAL PRIMARY KEY,
      nie          VARCHAR(20) NOT NULL,
      tipo         ${S}.tipo_notif_enum NOT NULL,
      nivel_alerta SMALLINT NOT NULL DEFAULT 0 CHECK (nivel_alerta BETWEEN 0 AND 3),
      titulo       VARCHAR(255) NOT NULL,
      mensaje      TEXT NOT NULL,
      leida        BOOLEAN NOT NULL DEFAULT FALSE,
      fecha_hora   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_dem_nie ON ${S}.demeritos(nie);
    CREATE INDEX IF NOT EXISTS idx_dem_fecha ON ${S}.demeritos(fecha);
    CREATE INDEX IF NOT EXISTS idx_dem_redimido ON ${S}.demeritos(redimido);
    CREATE INDEX IF NOT EXISTS idx_rc_nie ON ${S}.reconocimientos(nie);
    CREATE INDEX IF NOT EXISTS idx_notif_nie ON ${S}.notificaciones(nie);
    CREATE INDEX IF NOT EXISTS idx_notif_leida ON ${S}.notificaciones(leida);
    CREATE INDEX IF NOT EXISTS idx_notif_hora ON ${S}.notificaciones(fecha_hora DESC);
  `)
  console.log(`[setup-principal] Tablas de ${S} creadas`)
}

async function createPrincipalAliases() {
  const materias = await client.query(`SELECT to_regclass('principal.materias') AS t`)
  const materia = await client.query(`SELECT to_regclass('principal.materia') AS t`)
  if (materias.rows[0]?.t && !materia.rows[0]?.t) {
    await client.query(`
      CREATE VIEW principal.materia AS
      SELECT materia_id, nombre_materia, nombre_materia AS nombre
      FROM principal.materias
    `)
    console.log('[setup-principal] Vista principal.materia → materias')
  }

  const turnos = await client.query(`SELECT to_regclass('principal.turnos') AS t`)
  const turno = await client.query(`SELECT to_regclass('principal.turno') AS t`)
  if (turnos.rows[0]?.t && !turno.rows[0]?.t) {
    await client.query(`
      CREATE VIEW principal.turno AS
      SELECT turno_id, nombre FROM principal.turnos
    `)
    console.log('[setup-principal] Vista principal.turno → turnos')
  }
}

async function createAppViews() {
  const estCols = await tableColumns('principal', 'estudiantes')
  const fechaNac = estCols.has('fecha_nacimiento')
    ? 'e.fecha_nacimiento'
    : estCols.has('fecha_de_nacimiento')
      ? 'e.fecha_de_nacimiento'
      : 'NULL::date'
  const telefono = estCols.has('telefono_movil')
    ? "COALESCE(e.telefono_movil, '')"
    : estCols.has('telefono')
      ? "COALESCE(e.telefono, '')"
      : "''::text"
  const direccion = estCols.has('direccion') ? "COALESCE(e.direccion, '')" : "''::text"

  const materiaFrom = (await client.query(`SELECT to_regclass('principal.materias') AS t`)).rows[0]?.t
    ? 'principal.materias'
    : 'principal.materia'
  const turnoFrom = (await client.query(`SELECT to_regclass('principal.turnos') AS t`)).rows[0]?.t
    ? 'principal.turnos'
    : 'principal.turno'

  await client.query(`
    CREATE OR REPLACE VIEW ${S}.grados AS
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
    SELECT materia_id, nombre_materia, nombre_materia AS nombre
    FROM ${materiaFrom};

    CREATE OR REPLACE VIEW ${S}.roles AS
    SELECT rol_id, nombre, estado AS activo FROM principal.roles;

    CREATE OR REPLACE VIEW ${S}.turno AS
    SELECT turno_id, nombre FROM ${turnoFrom};

    CREATE OR REPLACE VIEW ${S}.seccion AS
    SELECT DISTINCT ON (s.seccion_id)
      s.seccion_id,
      g.grado_id,
      COALESCE(g.turno_id, (SELECT MIN(turno_id) FROM ${turnoFrom})) AS turno_id,
      s.letra AS nombre
    FROM principal.secciones s
    LEFT JOIN principal.grados g ON g.seccion_id = s.seccion_id
    ORDER BY s.seccion_id, g.grado_id NULLS LAST;

    CREATE OR REPLACE VIEW ${S}.estudiantes AS
    SELECT
      e.estudiante_id,
      e.nombre_completo,
      e.nie,
      ${fechaNac} AS fecha_de_nacimiento,
      ${telefono} AS telefono,
      ${direccion} AS direccion,
      ''::text AS responsable,
      ''::text AS telefono_responsable,
      e.grado_id,
      g.seccion_id,
      e.anio_escolar,
      e.estado
    FROM principal.estudiantes e
    LEFT JOIN principal.grados g ON g.grado_id = e.grado_id;

    CREATE OR REPLACE VIEW ${S}.orientador AS
    SELECT orientador_id, maestro_id, grado_id, anio_escolar, activo
    FROM principal.orientadores;

    CREATE OR REPLACE VIEW ${S}.maestros AS
    SELECT maestro_id, nombre, email, contrasena, contrasena_plana,
      materia_id, turno_id, rol_id, activo, creado_en, actualizado_en, rol_sesion
    FROM principal.maestros;
  `)
  console.log(`[setup-principal] Vistas ${S}.* → principal`)
}

async function linkForeignKeys() {
  const dups = await client.query(`
    SELECT nie, COUNT(*)::int AS n
    FROM principal.estudiantes
    WHERE nie IS NOT NULL AND TRIM(nie) <> ''
    GROUP BY nie
    HAVING COUNT(*) > 1
    LIMIT 5
  `)
  if (dups.rows.length) {
    console.warn('[setup-principal] NIE duplicados: se omiten FK hacia estudiantes')
    return
  }

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_principal_estudiantes_nie
    ON principal.estudiantes (nie)
  `)

  await addFk(
    'fk_demeritos_nie',
    `ALTER TABLE ${S}.demeritos
     ADD CONSTRAINT fk_demeritos_nie
     FOREIGN KEY (nie) REFERENCES principal.estudiantes(nie)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )
  await addFk(
    'fk_demeritos_maestro',
    `ALTER TABLE ${S}.demeritos
     ADD CONSTRAINT fk_demeritos_maestro
     FOREIGN KEY (id_maestro) REFERENCES principal.maestros(maestro_id)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )
  await addFk(
    'fk_demeritos_mov_redencion',
    `ALTER TABLE ${S}.demeritos
     ADD CONSTRAINT fk_demeritos_mov_redencion
     FOREIGN KEY (id_mov_redencion) REFERENCES ${S}.movimientos_redencion(id_mov)
     ON DELETE SET NULL`
  )
  await addFk(
    'fk_reconocimientos_nie',
    `ALTER TABLE ${S}.reconocimientos
     ADD CONSTRAINT fk_reconocimientos_nie
     FOREIGN KEY (nie) REFERENCES principal.estudiantes(nie)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )
  await addFk(
    'fk_reconocimientos_maestro',
    `ALTER TABLE ${S}.reconocimientos
     ADD CONSTRAINT fk_reconocimientos_maestro
     FOREIGN KEY (id_maestro) REFERENCES principal.maestros(maestro_id)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )
  await addFk(
    'fk_movimientos_redencion_nie',
    `ALTER TABLE ${S}.movimientos_redencion
     ADD CONSTRAINT fk_movimientos_redencion_nie
     FOREIGN KEY (nie) REFERENCES principal.estudiantes(nie)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )
  await addFk(
    'fk_movimientos_redencion_maestro',
    `ALTER TABLE ${S}.movimientos_redencion
     ADD CONSTRAINT fk_movimientos_redencion_maestro
     FOREIGN KEY (id_maestro) REFERENCES principal.maestros(maestro_id)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )
  await addFk(
    'fk_notificaciones_nie',
    `ALTER TABLE ${S}.notificaciones
     ADD CONSTRAINT fk_notificaciones_nie
     FOREIGN KEY (nie) REFERENCES principal.estudiantes(nie)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )
}

async function verify() {
  const checks = [
    `${S}.estudiantes`,
    `${S}.maestros`,
    `${S}.grados`,
    `${S}.materia`,
    `${S}.turno`,
    `${S}.demeritos`,
    `${S}.causales_demerito`,
    `${S}.reconocimientos`,
    `${S}.notificaciones`,
    'principal.materia',
    'principal.turno',
  ]
  for (const q of checks) {
    const r = await client.query('SELECT to_regclass($1) AS t', [q])
    if (!r.rows[0]?.t) throw new Error(`Falta ${q}`)
    console.log(`[setup-principal] OK ${q}`)
  }

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM ${S}.estudiantes) AS estudiantes,
      (SELECT COUNT(*)::int FROM ${S}.maestros) AS maestros,
      (SELECT COUNT(*)::int FROM ${S}.causales_demerito) AS causales,
      (SELECT COUNT(*)::int FROM ${S}.demeritos) AS demeritos
  `)
  console.log('[setup-principal] Conteos', counts.rows[0])

  await client.query(`
    SELECT pm.email, mat.nombre_materia, t.nombre
    FROM principal.maestros pm
    LEFT JOIN ${S}.materia mat ON mat.materia_id = pm.materia_id
    LEFT JOIN ${S}.turno t ON t.turno_id = pm.turno_id
    WHERE pm.activo = true
    LIMIT 1
  `)
  console.log('[setup-principal] Consulta de login OK')
}

async function main() {
  await client.connect()
  const before = await snapshotEvaluaciones()
  if (before) console.log('[setup-principal] evaluaciones (antes)', before)

  await ensureAppSchema(client)
  await createAppTables()
  await upsertCatalog('causales_demerito', 'letra', CAUSALES_DEMERITO)
  await upsertCatalog('opciones_redencion', 'letra', OPCIONES_REDENCION)
  await upsertCatalog('tipos_reconocimiento', 'letra', TIPOS_RECONOCIMIENTO)
  await createPrincipalAliases()
  await createAppViews()
  await linkForeignKeys()
  await verify()

  const after = await snapshotEvaluaciones()
  if (before && after) {
    const same = JSON.stringify(before) === JSON.stringify(after)
    if (!same) throw new Error('evaluaciones cambió; abortando verificación')
    console.log('[setup-principal] evaluaciones intacto', after)
  }

  const anios = await client.query(`
    SELECT anio_escolar, COUNT(*)::int AS n
    FROM principal.estudiantes
    GROUP BY anio_escolar
    ORDER BY anio_escolar
  `)
  console.log('[setup-principal] Años escolares en principal', anios.rows)
  console.log('[setup-principal] Listo.')
}

main()
  .catch((e) => {
    console.error('[setup-principal]', e.message || e)
    process.exitCode = 1
  })
  .finally(() => client.end().catch(() => {}))
