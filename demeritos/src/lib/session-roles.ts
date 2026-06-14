/** Rol de sesión en la app (select-role / sidebar). */
export type SessionRoleId = 'docente' | 'coordinador' | 'subdirector' | 'director'

export const ALL_SESSION_ROLES: SessionRoleId[] = [
  'docente',
  'coordinador',
  'subdirector',
  'director',
]

const VALID_SESSION_ROLES = new Set<string>(ALL_SESSION_ROLES)

export function isSessionRoleId(value: string): value is SessionRoleId {
  return VALID_SESSION_ROLES.has(value)
}

export type UserRoleState = {
  rol_sesion?: string | null
  needsRoleSelection?: boolean
}

/** Primera vez: aún no eligió rol en select-role. */
export function needsRoleSelection(user?: UserRoleState | null): boolean {
  if (!user) return false
  if (user.needsRoleSelection === true) return true
  const saved = user.rol_sesion?.trim()
  return !saved || !isSessionRoleId(saved)
}

/** Roles que puede elegir o usar en esta sesión. */
export function allowedSessionRoles(user?: UserRoleState | null): SessionRoleId[] {
  if (needsRoleSelection(user)) return [...ALL_SESSION_ROLES]
  const saved = user?.rol_sesion?.trim()
  if (saved && isSessionRoleId(saved)) return [saved]
  return [...ALL_SESSION_ROLES]
}

export function canSwitchSessionRole(user?: UserRoleState | null): boolean {
  return needsRoleSelection(user)
}

export const SESSION_ROLE_LABELS: Record<SessionRoleId, string> = {
  docente: 'Maestro/a',
  coordinador: 'Coordinador/a',
  subdirector: 'Subdirector/a',
  director: 'Director/a',
}
