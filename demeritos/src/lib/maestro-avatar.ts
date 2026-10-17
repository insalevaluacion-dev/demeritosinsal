import { query } from '@/lib/db'

let columnReady: Promise<boolean> | null = null

export async function ensureAvatarSexoColumn(): Promise<boolean> {
  if (!columnReady) {
    columnReady = (async () => {
      try {
        await query(`
          ALTER TABLE principal.maestros
          ADD COLUMN IF NOT EXISTS avatar_sexo CHAR(1)
        `)
        return true
      } catch {
        try {
          await query(`ALTER TABLE maestros ADD COLUMN IF NOT EXISTS avatar_sexo CHAR(1)`)
          return true
        } catch {
          return false
        }
      }
    })()
  }
  return columnReady
}

export async function saveAvatarSexo(maestroId: number, sexo: 'M' | 'H'): Promise<void> {
  await ensureAvatarSexoColumn()
  const updated = await query(
    `UPDATE principal.maestros SET avatar_sexo = $1 WHERE maestro_id = $2 RETURNING maestro_id`,
    [sexo, maestroId]
  ).catch(() => ({ rows: [] as { maestro_id: number }[] }))
  if (updated.rows[0]?.maestro_id) return
  await query(`UPDATE maestros SET avatar_sexo = $1 WHERE maestro_id = $2`, [sexo, maestroId])
}
