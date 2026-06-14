/**
 * 1) Elimina schema demeritos (sistema viejo)
 * 2) Enlaza tablas public.* entre sí y con principal (FK)
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { pgPoolOptions } from './pg-config.mjs'
import { APP_SCHEMA, ensureAppSchema, isLegacyDemeritosSchema } from './db-schema.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local') })

const url = process.env.DATABASE_URL
if (!url) {
  console.error('[migrate-fks] DATABASE_URL requerido')
  process.exit(1)
}

const pool = new pg.Pool(pgPoolOptions(url))

async function constraintExists(client, name) {
  const r = await client.query(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [name])
  return r.rows.length > 0
}

async function addFk(client, name, sql) {
  if (await constraintExists(client, name)) {
    console.log(`[migrate-fks] Ya existe: ${name}`)
    return
  }
  await client.query(sql)
  console.log(`[migrate-fks] OK: ${name}`)
}

const client = await pool.connect()
try {
  await ensureAppSchema(client)

  if (await isLegacyDemeritosSchema(client)) {
    console.log('[migrate-fks] 1/4 DROP SCHEMA demeritos (sistema viejo, tabla demerito)…')
    await client.query(`DROP SCHEMA IF EXISTS demeritos CASCADE`)
    await ensureAppSchema(client)
  } else {
    console.log(`[migrate-fks] 1/4 Omitido DROP SCHEMA — ${APP_SCHEMA} es el esquema de la app`)
  }

  console.log('[migrate-fks] 2/4 UNIQUE en principal.estudiantes(nie)…')
  const dups = await client.query(`
    SELECT nie, COUNT(*)::int AS n
    FROM principal.estudiantes
    WHERE nie IS NOT NULL AND TRIM(nie) <> ''
    GROUP BY nie
    HAVING COUNT(*) > 1
    LIMIT 5
  `)
  if (dups.rows.length) {
    throw new Error(
      `Hay NIE duplicados en principal.estudiantes (ej. ${dups.rows[0].nie}). Corrija antes de migrar.`
    )
  }
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_principal_estudiantes_nie
    ON principal.estudiantes (nie)
  `)

  console.log(`[migrate-fks] 3/4 Limpiar huérfanos en ${APP_SCHEMA}…`)
  for (const [table, nieCol, maestroCol] of [
    ['demeritos', 'nie', 'id_maestro'],
    ['reconocimientos', 'nie', 'id_maestro'],
    ['movimientos_redencion', 'nie', 'id_maestro'],
    ['notificaciones', 'nie', null],
  ]) {
    const delNie = await client.query(`
      DELETE FROM ${table} t
      WHERE NOT EXISTS (
        SELECT 1 FROM principal.estudiantes e
        WHERE REPLACE(TRIM(e.nie), ' ', '') = REPLACE(TRIM(t.${nieCol}), ' ', '')
      )
    `)
    if (delNie.rowCount) console.log(`  ${table}: ${delNie.rowCount} filas NIE huérfanas eliminadas`)
    if (maestroCol) {
      const delM = await client.query(`
        DELETE FROM ${table} t
        WHERE NOT EXISTS (SELECT 1 FROM principal.maestros m WHERE m.maestro_id = t.${maestroCol})
      `)
      if (delM.rowCount) console.log(`  ${table}: ${delM.rowCount} filas maestro huérfanas eliminadas`)
    }
  }
  await client.query(`
    UPDATE demeritos d SET id_mov_redencion = NULL
    WHERE id_mov_redencion IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM movimientos_redencion m WHERE m.id_mov = d.id_mov_redencion)
  `)

  console.log(`[migrate-fks] 4/4 Foreign keys ${APP_SCHEMA} ↔ principal…`)

  await addFk(
    client,
    'fk_demeritos_nie',
    `ALTER TABLE demeritos
     ADD CONSTRAINT fk_demeritos_nie
     FOREIGN KEY (nie) REFERENCES principal.estudiantes(nie)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )

  await addFk(
    client,
    'fk_demeritos_maestro',
    `ALTER TABLE demeritos
     ADD CONSTRAINT fk_demeritos_maestro
     FOREIGN KEY (id_maestro) REFERENCES principal.maestros(maestro_id)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )

  await addFk(
    client,
    'fk_demeritos_mov_redencion',
    `ALTER TABLE demeritos
     ADD CONSTRAINT fk_demeritos_mov_redencion
     FOREIGN KEY (id_mov_redencion) REFERENCES movimientos_redencion(id_mov)
     ON DELETE SET NULL`
  )

  await addFk(
    client,
    'fk_reconocimientos_nie',
    `ALTER TABLE reconocimientos
     ADD CONSTRAINT fk_reconocimientos_nie
     FOREIGN KEY (nie) REFERENCES principal.estudiantes(nie)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )

  await addFk(
    client,
    'fk_reconocimientos_maestro',
    `ALTER TABLE reconocimientos
     ADD CONSTRAINT fk_reconocimientos_maestro
     FOREIGN KEY (id_maestro) REFERENCES principal.maestros(maestro_id)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )

  await addFk(
    client,
    'fk_movimientos_redencion_nie',
    `ALTER TABLE movimientos_redencion
     ADD CONSTRAINT fk_movimientos_redencion_nie
     FOREIGN KEY (nie) REFERENCES principal.estudiantes(nie)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )

  await addFk(
    client,
    'fk_movimientos_redencion_maestro',
    `ALTER TABLE movimientos_redencion
     ADD CONSTRAINT fk_movimientos_redencion_maestro
     FOREIGN KEY (id_maestro) REFERENCES principal.maestros(maestro_id)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )

  await addFk(
    client,
    'fk_notificaciones_nie',
    `ALTER TABLE notificaciones
     ADD CONSTRAINT fk_notificaciones_nie
     FOREIGN KEY (nie) REFERENCES principal.estudiantes(nie)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  )

  const fks = await client.query(`
    SELECT tc.table_name, tc.constraint_name, ccu.table_schema || '.' || ccu.table_name AS ref
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = $1 AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name
  `, [APP_SCHEMA])
  console.log(`\n[migrate-fks] FK en ${APP_SCHEMA}:`)
  for (const r of fks.rows) {
    console.log(`  ${r.table_name}.${r.constraint_name} → ${r.ref}`)
  }

  const legacy = await client.query(`SELECT to_regclass('demeritos.demerito') AS t`)
  console.log(
    legacy.rows[0]?.t
      ? '\n[migrate-fks] AVISO: queda schema demeritos viejo (tabla demerito)'
      : `\n[migrate-fks] Esquema app ${APP_SCHEMA} intacto.`
  )
  console.log('[migrate-fks] Completado.')
} catch (e) {
  console.error('[migrate-fks]', e.message || e)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
