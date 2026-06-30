'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  getRememberedCredentials,
  hasRememberedCredentials,
  saveRememberedCredentials,
} from '@/lib/localSession'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    if (saved.nombre) setNombre(saved.nombre)
  }, [])

  useEffect(() => {
    if (!authLoading && user) router.replace('/select-role')
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          nombre: mode === 'register' ? nombre : undefined,
          confirmPassword: mode === 'register' ? confirmPassword : undefined,
          register: mode === 'register',
        }),
      })
      let data: { error?: string; needsRegistration?: boolean; token?: string; user?: any } = {}
      try {
        data = await res.json()
      } catch {
        setError('El servidor no respondió correctamente. Recarga la página e intenta de nuevo.')
        return
      }

      if (res.status === 404 && data.needsRegistration) {
        setMode('register')
        setError('Primera vez con este correo: crea tu contraseña personal abajo.')
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

      {
        const prev = getRememberedCredentials()
        saveRememberedCredentials(
          email,
          password,
          mode === 'register' ? nombre : prev.nombre
        )
      }
      login(data.user, data.token)
      if (data.user?.rol_sesion) {
        setSessionRole(data.user.rol_sesion)
        router.replace('/dashboard')
      } else {
        router.replace('/select-role')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg.includes('fetch') || msg.includes('Failed')
          ? 'No se pudo conectar con el servidor. Abre http://localhost:3000 y verifica que npm run dev esté activo.'
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
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <p style={{ color: 'rgba(232,241,255,.86)', fontSize: 14 }}>
              {mode === 'login'
                ? 'Usa tu correo @clases.edu.sv y la contraseña que creaste'
                : 'Registra tu correo @clases.edu.sv con una contraseña privada'}
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="on">
            {mode === 'register' && (
              <div style={{ marginBottom: 14 }}>
                <label className="auth-field-label">Nombre completo</label>
                <input
                  className="auth-input"
                  type="text"
                  name="nombre"
                  placeholder="Ej. María García López"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label className="auth-field-label">Correo electrónico</label>
              <input
                className="auth-input"
                type="email"
                name="email"
                placeholder="nombre.apellido@clases.edu.sv"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username email"
              />
            </div>

            <div style={{ marginBottom: mode === 'register' ? 14 : 18 }}>
              <label className="auth-field-label">
                {mode === 'register' ? 'Crear contraseña' : 'Contraseña'}
              </label>
              <input
                className="auth-input"
                type="password"
                name="password"
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'La misma que creó al registrarse'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            {mode === 'register' && (
              <div style={{ marginBottom: 18 }}>
                <label className="auth-field-label">Confirmar contraseña</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && <div className="alert-error">{error}</div>}

            <button type="submit" className="btn-glass-submit" disabled={loading}>
              {loading
                ? 'Verificando...'
                : mode === 'login'
                  ? 'Ingresar'
                  : 'Crear cuenta e ingresar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, color: 'rgba(232,241,255,.75)', fontSize: 13 }}>
            {mode === 'login' ? (
              <>
                ¿Primera vez?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError('') }}
                  style={{ color: '#f4b24d', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Crear cuenta con @clases.edu.sv
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError('') }}
                  style={{ color: '#f4b24d', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </p>

          {hasRememberedCredentials() && mode === 'login' && (
            <p style={{ textAlign: 'center', marginTop: 10, color: 'rgba(200,220,255,.55)', fontSize: 11 }}>
              Tus credenciales quedan guardadas en este equipo. Solo tú debes usar este navegador.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
