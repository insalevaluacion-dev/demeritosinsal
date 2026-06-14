import { query } from '@/lib/db'
import { ensureContrasenaPlanaColumn } from '@/lib/ensure-contrasena-plana'
import { ensureRolSesionColumn, fetchRolSesion } from '@/lib/maestro-rol-sesion'

export type MaestroRow = Record<string, unknown>

/** Busca maestro por correo en principal.maestros (fuente real de contraseñas). */
export async function fetchMaestroByEmail(email: string): Promise<MaestroRow | undefined> {
  await ensureRolSesionColumn()
  await ensureContrasenaPlanaColumn()

  const result = await query(
    `
    SELECT pm.maestro_id, pm.nombre, pm.email, pm.contrasena, pm.contrasena_plana,
      pm.rol_id, pm.activo, pm.rol_sesion,
      r.nombre AS rol_nombre, t.nombre AS turno_nombre, mat.nombre_materia AS materia_nombre
    FROM principal.maestros pm
    LEFT JOIN roles r ON r.rol_id = pm.rol_id
    LEFT JOIN turno t ON t.turno_id = pm.turno_id
    LEFT JOIN principal.materia mat ON mat.materia_id = pm.materia_id
    WHERE LOWER(TRIM(pm.email)) = LOWER(TRIM($1)) AND pm.activo = true
  `,
    [email]
  )

  const row = result.rows[0] as MaestroRow | undefined
  if (!row?.maestro_id) return undefined

  if (row.rol_sesion == null) {
    const saved = await fetchRolSesion(Number(row.maestro_id))
    if (saved) row.rol_sesion = saved
  }

  return row
}
