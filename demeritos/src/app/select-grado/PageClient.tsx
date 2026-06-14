'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState } from 'react'
import AppIcon from '@/components/AppIcon'
import { labelGradoOpcion } from '@/lib/utils'

export default function SelectGradoPage() {
  const { user, token, logout, sessionRole, authFetch } = useAuth()
  const router = useRouter()
  const [grados, setGrados] = useState<any[]>([])
  const [gradoId, setGradoId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (sessionRole !== 'docente' && user.rol_sesion !== 'docente') {
      router.replace('/dashboard')
      return
    }

    const check = async () => {
      try {
        const res = await fetch('/api/auth/orientador', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok && data.tieneOrientador) {
          router.replace('/dashboard')
          return
        }
      } catch { /* continuar */ }

      try {
        const res = await authFetch('/api/grados')
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'No se pudieron cargar los grados')
          setGrados([])
        } else {
          setGrados(Array.isArray(data) ? data : [])
        }
      } catch {
        setError('Error de conexión al cargar los grados')
        setGrados([])
      } finally {
        setLoading(false)
      }
    }

    if (token) check()
    else setLoading(false)
  }, [user, token, sessionRole, router, authFetch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gradoId) {
      setError('Selecciona el grado del que eres orientador')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/auth/orientador', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grado_id: parseInt(gradoId, 10) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="auth-shell-light">
      <div className="glass-card glass-card--light" style={{ maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: 'var(--sh-sm)' }}>
            <AppIcon name="graduationCap" size={32} />
          </div>
          <h2 className="page-title">Grado de orientación</h2>
          <p className="page-subtitle" style={{ marginTop: 8, lineHeight: 1.5 }}>
            Indica de qué grado eres orientador/a. En <strong>Mis estudiantes</strong> verás solo
            los alumnos de ese grado.
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="loading-root" style={{ padding: 24 }}>
            <div className="spinner" aria-hidden />
            <span>Cargando grados...</span>
          </div>
        ) : grados.length === 0 ? (
          <div className="alert-error">No hay grados disponibles. Contacta al administrador.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
              ¿De qué grado eres orientador/a?
            </label>
            <select
              value={gradoId}
              onChange={e => setGradoId(e.target.value)}
              style={{ marginBottom: 20 }}
            >
              <option value="">— Selecciona un grado —</option>
              {grados.map((g: any) => (
                <option key={g.grado_id} value={String(g.grado_id)}>
                  {labelGradoOpcion(g)}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Guardando...' : 'Continuar al sistema'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--azul)', textDecoration: 'underline' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
