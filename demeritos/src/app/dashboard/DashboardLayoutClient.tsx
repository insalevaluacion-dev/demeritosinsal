'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  allowedSessionRoles,
  needsRoleSelection,
  isSessionRoleId,
  type SessionRoleId,
} from '@/lib/session-roles'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import { LoadingSpinnerInline } from '@/components/ui/LoadingSpinner'
import { getOrientadorSessionCache, setOrientadorSessionCache } from '@/lib/localSession'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, sessionRole, loading, hydrated, setSessionRole, token } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadTimedOut, setLoadTimedOut] = useState(false)

  const activeRole = useMemo(() => {
    const r = (sessionRole || user?.rol_sesion || '').trim()
    return isSessionRoleId(r) ? r : null
  }, [sessionRole, user?.rol_sesion])

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen)
    return () => document.body.classList.remove('sidebar-open')
  }, [sidebarOpen])

  useEffect(() => {
    if (!hydrated || loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (needsRoleSelection(user)) {
      router.push('/select-role')
      return
    }
    if (!activeRole) {
      router.push('/select-role')
      return
    }
    if (!sessionRole && user.rol_sesion) {
      setSessionRole(user.rol_sesion)
    }
    const allowed = allowedSessionRoles(user)
    if (!allowed.includes(activeRole)) {
      setSessionRole(allowed[0])
    }
  }, [hydrated, loading, user, activeRole, sessionRole, router, setSessionRole])

  useEffect(() => {
    if (!hydrated || loading || !user || !token || activeRole !== 'docente') return

    const maestroId = user.maestro_id
    const cached = getOrientadorSessionCache(maestroId)
    if (cached === 'ok') return
    if (cached === 'none') {
      router.replace('/select-grado')
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 6000)

    fetch('/api/auth/orientador', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) return
        if (data.tieneOrientador) {
          setOrientadorSessionCache(maestroId, 'ok')
        } else {
          setOrientadorSessionCache(maestroId, 'none')
          router.replace('/select-grado')
        }
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(timeout))

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [hydrated, loading, user, token, activeRole, router])

  useEffect(() => {
    if (!hydrated || loading || !user || !activeRole) return
    const t = window.setTimeout(() => setLoadTimedOut(true), 8000)
    return () => window.clearTimeout(t)
  }, [hydrated, loading, user, activeRole])

  const waitingAuth = !hydrated || loading || !user || !activeRole

  if (waitingAuth) {
    return (
      <div className="loading-root loading-fullscreen">
        <LoadingSpinnerInline label="Cargando sistema..." />
        {loadTimedOut && (
          <div style={{ marginTop: 20, textAlign: 'center', maxWidth: 280 }}>
            <p style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 12 }}>
              La conexión está tardando. Comprueba internet o recarga la página.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setLoadTimedOut(false)
                window.location.reload()
              }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div suppressHydrationWarning className="app-root">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="dashboard-shell">
        <Navbar onMenuToggle={() => setSidebarOpen(p => !p)} menuOpen={sidebarOpen} />
        <main className="dashboard-main">{children}</main>
        <footer className="dashboard-footer">
          © 2026 Instituto Nacional San Luis — MINED El Salvador · Sistema de deméritos
        </footer>
      </div>
    </div>
  )
}
