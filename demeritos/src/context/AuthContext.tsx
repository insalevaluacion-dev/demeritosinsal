'use client'
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import type { SessionRoleId } from '@/lib/session-roles'
import { LOCAL_SESSION_KEYS, migrateLegacyLocalSession, clearLocalSession } from '@/lib/localSession'

interface AuthContextType {
  user: User | null
  token: string | null
  sessionRole: string | null
  loading: boolean
  hydrated: boolean
  login: (u: User, t: string) => void
  setSessionRole: (role: string) => void
  confirmSessionRole: (role: SessionRoleId) => Promise<boolean>
  updateUser: (u: User) => void
  logout: () => void
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  downloadExcel: (url: string, filename?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [sessionRole, setSessionRoleState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    migrateLegacyLocalSession()
    try {
      const stored = localStorage.getItem(LOCAL_SESSION_KEYS.user)
      const storedToken = localStorage.getItem(LOCAL_SESSION_KEYS.token)
      const storedRole = localStorage.getItem(LOCAL_SESSION_KEYS.role)
      if (stored && storedToken) {
        const u = JSON.parse(stored) as User
        const role = u.rol_sesion?.trim() || storedRole?.trim() || null
        setUser(u)
        setToken(storedToken)
        if (role) setSessionRoleState(role)
      }
    } catch {
      clearLocalSession()
    }
    setHydrated(true)
    setLoading(false)
  }, [])

  const login = (u: User, t: string) => {
    setUser(u)
    setToken(t)
    localStorage.setItem(LOCAL_SESSION_KEYS.user, JSON.stringify(u))
    localStorage.setItem(LOCAL_SESSION_KEYS.token, t)
  }

  const setSessionRole = (role: string) => {
    setSessionRoleState(role)
    localStorage.setItem(LOCAL_SESSION_KEYS.role, role)
  }

  const updateUser = (u: User) => {
    setUser(u)
    localStorage.setItem(LOCAL_SESSION_KEYS.user, JSON.stringify(u))
  }

  const confirmSessionRole = async (role: SessionRoleId): Promise<boolean> => {
    if (!token || !user) return false

    const locked = user.rol_sesion?.trim()
    if (locked) {
      if (locked !== role) return false
      setSessionRole(role)
      return true
    }

    try {
      const res = await fetch('/api/auth/rol-sesion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionRole: role }),
      })
      const data = await res.json()
      if (!res.ok) return false

      const updated: User = {
        ...user,
        rol_sesion: data.rol_sesion,
        needsRoleSelection: false,
      }
      updateUser(updated)
      setSessionRole(data.rol_sesion)
      if (data.token) {
        setToken(data.token)
        localStorage.setItem(LOCAL_SESSION_KEYS.token, data.token)
      }
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    setUser(null); setToken(null); setSessionRoleState(null)
    clearLocalSession()
    router.push('/login')
  }

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('Sesión no iniciada. Vuelve a iniciar sesión.')
    }
    const headers = new Headers(options.headers)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    headers.set('Authorization', `Bearer ${token}`)
    const role = sessionRole || user?.rol_sesion
    if (role) headers.set('X-Session-Role', role)

    const res = await fetch(url, { ...options, headers })

    if (res.status === 401 && typeof window !== 'undefined') {
      clearLocalSession()
      setUser(null)
      setToken(null)
      setSessionRoleState(null)
      router.push('/login')
    }

    return res
  }, [token, router, sessionRole, user?.rol_sesion])

  const downloadExcel = useCallback(async (url: string, filename?: string) => {
    const res = await authFetch(url)
    if (!res.ok) {
      let msg = 'No se pudo generar el archivo Excel'
      try {
        const data = await res.json()
        if (data?.error) msg = data.error
      } catch { /* ignore */ }
      throw new Error(msg)
    }
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?([^";]+)"?/)
    const name = filename || match?.[1] || 'reporte_INSAL.xlsx'
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  }, [authFetch])

  return (
    <AuthContext.Provider value={{ user, token, sessionRole, loading, hydrated, login, setSessionRole, confirmSessionRole, updateUser, logout, authFetch, downloadExcel }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
