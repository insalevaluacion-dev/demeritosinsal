'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LOCAL_SESSION_KEYS } from '@/lib/localSession'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

function resolveTargetFromStorage(): string {
  if (typeof window === 'undefined') return '/login'
  const token = localStorage.getItem(LOCAL_SESSION_KEYS.token)
  if (!token) return '/login'
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEYS.user)
    if (!raw) return '/login'
    const user = JSON.parse(raw) as { rol_sesion?: string }
    const role = user.rol_sesion || localStorage.getItem(LOCAL_SESSION_KEYS.role)
    if (!role) return '/select-role'
    return '/dashboard'
  } catch {
    return '/login'
  }
}

export default function Home() {
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const target = resolveTargetFromStorage()
    window.location.replace(target)
    const help = window.setTimeout(() => setShowHelp(true), 1500)
    const force = window.setTimeout(() => {
      if (window.location.pathname === '/') {
        window.location.href = '/login'
      }
    }, 3000)
    return () => {
      window.clearTimeout(help)
      window.clearTimeout(force)
    }
  }, [])

  return (
    <div className="loading-root loading-fullscreen">
      <LoadingSpinner label="Cargando sistema de deméritos..." fullScreen />
      {showHelp && (
        <div style={{ marginTop: 24, textAlign: 'center', padding: '0 20px' }}>
          <p style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 12 }}>
            Si no avanza, toca aquí:
          </p>
          <Link href="/login" className="btn-primary" style={{ textDecoration: 'none' }}>
            Ir a Iniciar Sesión
          </Link>
        </div>
      )}
    </div>
  )
}
