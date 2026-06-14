import { comparePassword, hashPassword } from '@/lib/auth'
import { query } from '@/lib/db'

/** Hash bcrypt válido. */
function isBcryptHash(stored: string): boolean {
  return stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')
}

/**
 * Valida la contraseña: primero bcrypt en `contrasena`, luego la guardada al registrarse (`contrasena_plana`).
 */
export async function verifyMaestroPassword(
  password: string,
  contrasena: string | null | undefined,
  contrasenaPlana: string | null | undefined
): Promise<boolean> {
  const hash = String(contrasena ?? '').trim()
  const plain = String(contrasenaPlana ?? '').trim()

  if (hash && isBcryptHash(hash)) {
    if (await comparePassword(password, hash)) return true
  }

  if (plain && plain === password) return true

  if (hash && !isBcryptHash(hash) && hash === password) return true

  return false
}

/** Si entró con texto plano, guarda hash bcrypt para el siguiente inicio de sesión. */
export async function upgradePasswordHashIfNeeded(
  maestroId: number,
  password: string,
  contrasena: string | null | undefined
): Promise<void> {
  const hash = String(contrasena ?? '').trim()
  if (hash && isBcryptHash(hash)) return

  const newHash = await hashPassword(password)
  await query(`UPDATE principal.maestros SET contrasena = $1 WHERE maestro_id = $2`, [
    newHash,
    maestroId,
  ]).catch(() =>
    query(`UPDATE maestros SET contrasena = $1 WHERE maestro_id = $2`, [newHash, maestroId])
  )
}
