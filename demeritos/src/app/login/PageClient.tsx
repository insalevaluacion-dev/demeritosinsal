'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { isLoginEmail } from '@/lib/auth-email'
import {
  getRememberedCredentials,
  hasRememberedCredentials,
  saveRememberedCredentials,
} from '@/lib/localSession'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { login, setSessionRole, user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    router.prefetch('/dashboard')
    router.prefetch('/select-role')
    const saved = getRememberedCredentials()
    if (saved.email) setEmail(saved.email)
    if (saved.password) setPassword(saved.password)
  }, [])

  useEffect(() => {
    if (!authLoading && user) router.replace('/select-role')
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isLoginEmail(email)) {
      setError('Use un correo institucional válido (por ejemplo @clases.edu.sv).')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      let data: { error?: string; token?: string; user?: any } = {}
      try {
        data = await res.json()
      } catch {
        setError('El servidor no respondió correctamente. Recarga la página e intenta de nuevo.')
        return
      }

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }

      if (!data.token || !data.user) {
        setError('Respuesta incompleta del servidor.')
        return
      }

      const prev = getRememberedCredentials()
      saveRememberedCredentials(email, password, prev.nombre)
      login(data.user, data.token)
      if (data.user?.rol_sesion) {
        setSessionRole(data.user.rol_sesion)
        router.replace('/dashboard')
      } else {
        router.replace('/select-role')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      const looksOffline =
        msg.includes('fetch') || msg.includes('Failed') || msg.includes('NetworkError')
      setError(
        looksOffline
          ? 'No se pudo conectar con el servidor. Verifica internet y que la app esté activa.'
          : 'Error de conexión. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || authLoading) return null

  return (
    <div className="auth-shell-page">
      <div className="auth-shell-inner">
        <div className="glass-card glass-card--auth">
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="logo-ring">
              <img src="/insal-logo.png" alt="Logo INSAL" width={96} height={96} />
            </div>
            <h1 style={{ color: '#fff', textAlign: 'center', letterSpacing: '1.8px', lineHeight: 1.05, fontSize: 22, fontWeight: 700 }}>
              INSTITUTO NACIONAL
              <br />
              SAN LUIS
            </h1>
            <p style={{ color: '#f4b24d', fontWeight: 600, textAlign: 'center', marginTop: 8, letterSpacing: '0.6px', fontSize: 12 }}>
              INSAL · SOYAPANGO · 1993
            </p>
          </div>

          <div style={{ marginBottom: 18, textAlign: 'center' }}>
            <h2 style={{ color: '#fff', marginBottom: 8, fontSize: 20, fontWeight: 700 }}>
              Iniciar sesión
            </h2>
            <p style={{ color: 'rgba(232,241,255,.86)', fontSize: 14 }}>
              Usa tu correo del sistema principal. La primera vez creas tu contraseña; la próxima
              vez entra con esa misma.
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="on">
            <div style={{ marginBottom: 14 }}>
              <label className="auth-field-label">Correo electrónico</label>
              <input
                className="auth-input"
                type="email"
                name="email"
                placeholder="El mismo correo del sistema principal"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username email"
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="auth-field-label">Contraseña</label>
              <input
                className="auth-input"
                type="password"
                name="password"
                placeholder="La primera vez, la que tú elijas"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button type="submit" className="btn-glass-submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>

          {hasRememberedCredentials() && (
            <p style={{ textAlign: 'center', marginTop: 20, color: 'rgba(200,220,255,.55)', fontSize: 11 }}>
              Tus credenciales quedan guardadas en este equipo. Solo tú debes usar este navegador.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
