'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { allowedSessionRoles, needsRoleSelection, type SessionRoleId } from '@/lib/session-roles'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import { LoadingSpinnerInline } from '@/components/ui/LoadingSpinner'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, sessionRole, loading, setSessionRole, token } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loadTimedOut, setLoadTimedOut] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen)
    return () => document.body.classList.remove('sidebar-open')
  }, [sidebarOpen])

  useEffect(() => {
    if (!mounted || loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (needsRoleSelection(user)) {
      router.push('/select-role')
      return
    }
    const allowed = allowedSessionRoles(user)
    if (!sessionRole) {
      if (user.rol_sesion) setSessionRole(user.rol_sesion)
      else router.push('/select-role')
      return
    }
    if (!allowed.includes(sessionRole as SessionRoleId)) {
      setSessionRole(allowed[0])
    }
  }, [mounted, user, sessionRole, loading, router, setSessionRole])

  useEffect(() => {
    if (!mounted || loading || !user || !token || !sessionRole) return
    if (sessionRole !== 'docente') return

    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)

    fetch('/api/auth/orientador', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (res.ok && !data.tieneOrientador) {
          router.replace('/select-grado')
          return
        }
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(timeout))

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [mounted, loading, user, token, sessionRole, router])

  useEffect(() => {
    if (!mounted || loading || !user || !sessionRole) return
    const t = window.setTimeout(() => setLoadTimedOut(true), 15000)
    return () => window.clearTimeout(t)
  }, [mounted, loading, user, sessionRole])

  if (!mounted || loading || !user || !sessionRole) {
    return (
      <div className="loading-root loading-fullscreen">
        <LoadingSpinnerInline label="Cargando sistema..." />
        {loadTimedOut && (
          <div style={{ marginTop: 20, textAlign: 'center', maxWidth: 280 }}>
            <p style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 12 }}>
              La conexión está tardando. Comprueba la misma red Wi‑Fi que el PC.
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
        <Navbar onMenuToggle={() => setSidebarOpen(p => !p)} />
        <main className="dashboard-main">{children}</main>
        <footer className="dashboard-footer">
          © 2026 Instituto Nacional San Luis — MINED El Salvador · Sistema de deméritos
        </footer>
      </div>
    </div>
  )
}
