/** Claves de sesión en localStorage; migración desde prefijo legacy `meps_`. */

const KEY_USER = 'demeritos_user'
const KEY_TOKEN = 'demeritos_token'
const KEY_ROLE = 'demeritos_session_role'
const KEY_LAST_EMAIL = 'demeritos_last_email'
const KEY_REMEMBERED = 'demeritos_remembered'

const LEGACY_USER = 'meps_user'
const LEGACY_TOKEN = 'meps_token'
const LEGACY_ROLE = 'meps_session_role'

export const LOCAL_SESSION_KEYS = {
  user: KEY_USER,
  token: KEY_TOKEN,
  role: KEY_ROLE,
  lastEmail: KEY_LAST_EMAIL,
} as const

type RememberedCredentials = {
  email: string
  password: string
  nombre?: string
}

function encodeLocalSecret(value: string): string {
  try {
    return btoa(encodeURIComponent(value))
  } catch {
    return ''
  }
}

function decodeLocalSecret(encoded: string): string {
  if (!encoded) return ''
  try {
    return decodeURIComponent(atob(encoded))
  } catch {
    return ''
  }
}

/** Guarda correo y contraseña en este equipo (no se borran al cerrar sesión). */
export function saveRememberedCredentials(
  email: string,
  password: string,
  nombre?: string
): void {
  if (typeof window === 'undefined') return
  const normalizedEmail = email.trim().toLowerCase()
  const payload = {
    email: normalizedEmail,
    p: encodeLocalSecret(password),
    nombre: nombre?.trim() || undefined,
  }
  localStorage.setItem(KEY_REMEMBERED, JSON.stringify(payload))
  localStorage.setItem(KEY_LAST_EMAIL, normalizedEmail)
}

export function getRememberedCredentials(): RememberedCredentials {
  if (typeof window === 'undefined') return { email: '', password: '' }

  const raw = localStorage.getItem(KEY_REMEMBERED)
  if (raw) {
    try {
      const data = JSON.parse(raw) as { email?: string; p?: string; nombre?: string }
      return {
        email: data.email?.trim() || '',
        password: decodeLocalSecret(data.p || ''),
        nombre: data.nombre?.trim() || undefined,
      }
    } catch {
      localStorage.removeItem(KEY_REMEMBERED)
    }
  }

  const legacyEmail = localStorage.getItem(KEY_LAST_EMAIL) || ''
  return { email: legacyEmail, password: '' }
}

export function saveLastLoginEmail(email: string): void {
  const { password, nombre } = getRememberedCredentials()
  saveRememberedCredentials(email, password, nombre)
}

export function getLastLoginEmail(): string {
  return getRememberedCredentials().email
}

export function hasRememberedCredentials(): boolean {
  const { email, password } = getRememberedCredentials()
  return Boolean(email && password)
}

export function migrateLegacyLocalSession(): void {
  if (typeof window === 'undefined') return
  const ls = localStorage
  if (ls.getItem(KEY_USER) && ls.getItem(KEY_TOKEN)) {
    ls.removeItem(LEGACY_USER)
    ls.removeItem(LEGACY_TOKEN)
    ls.removeItem(LEGACY_ROLE)
    return
  }
  const u = ls.getItem(LEGACY_USER)
  const t = ls.getItem(LEGACY_TOKEN)
  const r = ls.getItem(LEGACY_ROLE)
  if (u && t) {
    ls.setItem(KEY_USER, u)
    ls.setItem(KEY_TOKEN, t)
    if (r) ls.setItem(KEY_ROLE, r)
  }
  ls.removeItem(LEGACY_USER)
  ls.removeItem(LEGACY_TOKEN)
  ls.removeItem(LEGACY_ROLE)
}

export function clearLocalSession(): void {
  if (typeof window === 'undefined') return
  const ls = localStorage
  for (const k of [KEY_USER, KEY_TOKEN, KEY_ROLE, LEGACY_USER, LEGACY_TOKEN, LEGACY_ROLE]) {
    ls.removeItem(k)
  }
  for (let i = ls.length - 1; i >= 0; i--) {
    const k = ls.key(i)
    if (k?.startsWith('demeritos_orientador_')) ls.removeItem(k)
  }
}

const ORIENTADOR_CACHE_PREFIX = 'demeritos_orientador_'

export function setOrientadorSessionCache(maestroId: number, value: 'ok' | 'none'): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${ORIENTADOR_CACHE_PREFIX}${maestroId}`, value)
  } catch { /* ignore */ }
}

export function getOrientadorSessionCache(maestroId: number): 'ok' | 'none' | null {
  if (typeof window === 'undefined') return null
  try {
    const v = sessionStorage.getItem(`${ORIENTADOR_CACHE_PREFIX}${maestroId}`)
    if (v === 'ok' || v === 'none') return v
  } catch { /* ignore */ }
  return null
}
