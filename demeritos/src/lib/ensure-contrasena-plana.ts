import { query } from '@/lib/db'
import { qualify } from '@/lib/db-schema'

/** Columna para ver la contraseña en texto (solo uso administrativo INSAL). */
export async function ensureContrasenaPlanaColumn(): Promise<void> {
  await query(`
    ALTER TABLE principal.maestros
    ADD COLUMN IF NOT EXISTS contrasena_plana VARCHAR(255)
  `).catch(async () => {
    await query(`
      ALTER TABLE maestros ADD COLUMN IF NOT EXISTS contrasena_plana VARCHAR(255)
    `)
  })

  await query(`
    ALTER TABLE principal.maestros
    ADD COLUMN IF NOT EXISTS rol_sesion VARCHAR(20)
  `).catch(() => {})

  await query(`
    CREATE OR REPLACE VIEW ${qualify('maestros')} AS
    SELECT maestro_id, nombre, email, contrasena, contrasena_plana,
      materia_id, turno_id, rol_id, activo, creado_en, actualizado_en, rol_sesion
    FROM principal.maestros
  `).catch(async () => {
    await query(`
      CREATE OR REPLACE VIEW ${qualify('maestros')} AS
      SELECT maestro_id, nombre, email, contrasena, contrasena_plana,
        materia_id, turno_id, rol_id, activo,
        NULL::timestamptz AS creado_en,
        NULL::timestamptz AS actualizado_en,
        NULL::varchar AS rol_sesion
      FROM maestros
    `)
  })
}

export async function saveContrasenaPlana(maestroId: number, password: string): Promise<void> {
  await ensureContrasenaPlanaColumn()
  const plain = String(password).slice(0, 255)
  await query(
    `UPDATE principal.maestros SET contrasena_plana = $1 WHERE maestro_id = $2`,
    [plain, maestroId]
  ).catch(() =>
    query(`UPDATE maestros SET contrasena_plana = $1 WHERE maestro_id = $2`, [plain, maestroId])
  )
}
