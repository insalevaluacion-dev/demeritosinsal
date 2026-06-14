import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { fetchRolSesion, saveMaestroRolSesion } from '@/lib/maestro-rol-sesion'
import type { SessionRoleId } from '@/lib/session-roles'
import { isSessionRoleId } from '@/lib/session-roles'

export type RequestAuth = {
  maestro_id: number
  rol_sesion: SessionRoleId
}

export function bearerFromRequest(req: NextRequest): string {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
}

function sessionRoleFromHeader(req: NextRequest): SessionRoleId | null {
  const raw = req.headers.get('x-session-role')?.trim()
  return raw && isSessionRoleId(raw) ? raw : null
}

/** Rol efectivo: JWT → BD → cabecera de sesión (sincroniza a BD si faltaba). */
export async function getRequestAuth(req: NextRequest): Promise<RequestAuth | null> {
  const payload = verifyToken(bearerFromRequest(req)) as {
    maestro_id?: number
    rol_sesion?: string
  } | null
  if (!payload?.maestro_id) return null

  const maestroId = Number(payload.maestro_id)

  if (payload.rol_sesion && isSessionRoleId(payload.rol_sesion)) {
    return { maestro_id: maestroId, rol_sesion: payload.rol_sesion }
  }

  const saved = await fetchRolSesion(maestroId)
  if (saved && isSessionRoleId(saved)) {
    return { maestro_id: maestroId, rol_sesion: saved }
  }

  const headerRole = sessionRoleFromHeader(req)
  if (headerRole) {
    saveMaestroRolSesion(maestroId, headerRole).catch(() => {})
    return { maestro_id: maestroId, rol_sesion: headerRole }
  }

  return { maestro_id: maestroId, rol_sesion: 'docente' }
}
