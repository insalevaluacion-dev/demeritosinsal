import { query } from '@/lib/db'
import type { SessionRoleId } from '@/lib/session-roles'
import { isSessionRoleId } from '@/lib/session-roles'

let columnReady: Promise<void> | null = null

/** Columna donde queda guardada la elección única de rol (select-role). */
export async function ensureRolSesionColumn(): Promise<void> {
  if (!columnReady) {
    columnReady = (async () => {
      await query(`
        ALTER TABLE principal.maestros
        ADD COLUMN IF NOT EXISTS rol_sesion VARCHAR(20)
      `).catch(async () => {
        await query(`
          ALTER TABLE maestros ADD COLUMN IF NOT EXISTS rol_sesion VARCHAR(20)
        `).catch(() => {})
      })
    })()
  }
  await columnReady
}

export async function saveMaestroRolSesion(
  maestroId: number,
  sessionRole: SessionRoleId
): Promise<void> {
  await ensureRolSesionColumn()
  const updated = await query(
    `
    UPDATE principal.maestros
    SET rol_sesion = $1, actualizado_en = NOW()
    WHERE maestro_id = $2 AND (rol_sesion IS NULL OR TRIM(rol_sesion) = '')
    RETURNING maestro_id
    `,
    [sessionRole, maestroId]
  ).catch(() => ({ rows: [] as { maestro_id: number }[] }))

  if (updated.rows[0]?.maestro_id) return

  await query(
    `
    UPDATE maestros
    SET rol_sesion = $1
    WHERE maestro_id = $2 AND (rol_sesion IS NULL OR TRIM(rol_sesion) = '')
    RETURNING maestro_id
    `,
    [sessionRole, maestroId]
  )
}

export async function fetchRolSesion(maestroId: number): Promise<SessionRoleId | null> {
  await ensureRolSesionColumn()
  let res = await query(`SELECT rol_sesion FROM principal.maestros WHERE maestro_id = $1`, [maestroId]).catch(
    () => ({ rows: [] as { rol_sesion: string | null }[] })
  )
  if (!res.rows[0]) {
    res = await query(`SELECT rol_sesion FROM maestros WHERE maestro_id = $1`, [maestroId]).catch(
      () => ({ rows: [] as { rol_sesion: string | null }[] })
    )
  }
  const raw = res.rows[0]?.rol_sesion?.trim()
  return raw && isSessionRoleId(raw) ? raw : null
}
