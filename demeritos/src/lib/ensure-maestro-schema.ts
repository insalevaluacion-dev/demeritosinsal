import { query } from '@/lib/db'

type IdColumnMeta = {
  is_identity: string
  column_default: string | null
}

/** Sincroniza secuencia de una columna ID/SERIAL sin tocar columnas IDENTITY (Railway). */
async function syncIdColumn(
  schema: string,
  table: string,
  column: string,
  fallbackSeqName: string
): Promise<void> {
  const fullTable = `${schema}.${table}`

  const col = await query<IdColumnMeta>(
    `
    SELECT is_identity, column_default
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
  `,
    [schema, table, column]
  )

  const isIdentity = col.rows[0]?.is_identity === 'YES'

  const seqRes = await query<{ name: string | null }>(
    `SELECT pg_get_serial_sequence($1, $2) AS name`,
    [fullTable, column]
  )
  const pgSeq = seqRes.rows[0]?.name

  if (isIdentity || pgSeq) {
    if (pgSeq) {
      await query(
        `SELECT setval($1::regclass, GREATEST(COALESCE((SELECT MAX(${column}) FROM ${schema}.${table}), 0)::bigint, 1))`,
        [pgSeq]
      )
    }
    return
  }

  const defaultVal = col.rows[0]?.column_default ?? ''
  if (defaultVal.includes('nextval')) {
    return
  }

  await query(`CREATE SEQUENCE IF NOT EXISTS ${schema}.${fallbackSeqName}`)
  await query(`
    SELECT setval(
      '${schema}.${fallbackSeqName}',
      GREATEST(COALESCE((SELECT MAX(${column}) FROM ${schema}.${table}), 0), 1)
    )
  `)
  await query(`
    ALTER TABLE ${schema}.${table}
    ALTER COLUMN ${column} SET DEFAULT nextval('${schema}.${fallbackSeqName}')
  `)
  await query(`
    ALTER SEQUENCE ${schema}.${fallbackSeqName} OWNED BY ${schema}.${table}.${column}
  `).catch(() => {})
}

/** Asegura que principal.maestros.maestro_id auto-incremente (p. ej. tras import local). */
export async function ensureMaestroIdSequence(): Promise<void> {
  await syncIdColumn('principal', 'maestros', 'maestro_id', 'maestros_maestro_id_seq')

  await query(`
    DO $$ BEGIN
      ALTER TABLE principal.maestros ADD CONSTRAINT maestros_pkey PRIMARY KEY (maestro_id);
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `).catch(() => {})
}

/** Secuencia orientador_id (misma causa de fallo en BD local importada). */
export async function ensureOrientadorIdSequence(): Promise<void> {
  await syncIdColumn(
    'principal',
    'orientadores',
    'orientador_id',
    'orientadores_orientador_id_seq'
  )
}

/** Columna para maestros que no son orientadores (evita volver a pedir grado). */
export async function ensureOrientadorDeclinadoColumn(): Promise<void> {
  await query(`
    ALTER TABLE principal.maestros
    ADD COLUMN IF NOT EXISTS orientador_declinado BOOLEAN NOT NULL DEFAULT FALSE
  `)
}

export async function ensurePrincipalMaestroSchema(): Promise<void> {
  await ensureMaestroIdSequence()
  await ensureOrientadorIdSequence()
  await ensureOrientadorDeclinadoColumn()
}
