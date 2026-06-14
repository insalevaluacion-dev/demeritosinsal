'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import AppIcon, { type AppIconName } from '@/components/AppIcon'
import {
  allowedSessionRoles,
  needsRoleSelection,
  SESSION_ROLE_LABELS,
  type SessionRoleId,
} from '@/lib/session-roles'

const ROLES: { id: SessionRoleId; label: string; desc: string; icon: AppIconName; color: string }[] = [
  { id: 'docente', label: 'Maestro/a', desc: 'Registrar deméritos, méritos y redenciones de estudiantes', icon: 'graduationCap', color: 'var(--azul)' },
  { id: 'coordinador', label: 'Coordinador/a', desc: 'Dashboard completo con estadísticas y reportes', icon: 'coordinador', color: 'var(--verde)' },
  { id: 'subdirector', label: 'Subdirector/a', desc: 'Acceso administrativo y control del sistema', icon: 'building', color: 'var(--naranja-drk)' },
  { id: 'director', label: 'Director/a', desc: 'Acceso total: auditoría, usuarios y reportes generales', icon: 'director', color: 'var(--azul-dark)' },
]

export default function SelectRolePage() {
  const { user, confirmSessionRole, logout, sessionRole, setSessionRole } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const firstTime = useMemo(() => needsRoleSelection(user), [user])
  const permitted = useMemo(() => allowedSessionRoles(user), [user])
  const visibleRoles = useMemo(() => ROLES.filter(r => permitted.includes(r.id)), [permitted])
  const lockedRole = user?.rol_sesion as SessionRoleId | undefined

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  useEffect(() => {
    if (!user || firstTime || !lockedRole) return
    if (sessionRole !== lockedRole) setSessionRole(lockedRole)
    router.replace('/dashboard')
  }, [user, firstTime, lockedRole, sessionRole, setSessionRole, router])

  const handleRole = async (roleId: SessionRoleId) => {
    setError('')
    setSaving(true)
    try {
      const ok = await confirmSessionRole(roleId)
      if (!ok) {
        setError(
          user?.rol_sesion
            ? 'Este rol ya quedó asignado a tu cuenta y no se puede cambiar.'
            : 'No se pudo guardar el rol. Intenta de nuevo.'
        )
        return
      }
      if (roleId === 'docente') {
        router.push('/select-grado')
      } else {
        router.push('/dashboard')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  if (!firstTime && lockedRole) {
    return (
      <div className="auth-shell-light">
        <p style={{ color: 'var(--soft)', marginTop: 40 }}>Ingresando como {SESSION_ROLE_LABELS[lockedRole]}…</p>
      </div>
    )
  }

  return (
    <div className="auth-shell-light">
      <div className="glass-card glass-card--light" style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: 'var(--sh-sm)' }}>
            <AppIcon name="building" size={32} />
          </div>
          <h2 className="page-title">Bienvenido/a, {user?.nombre?.split(' ')[0]}</h2>
          <p className="page-subtitle" style={{ marginTop: 6 }}>
            {firstTime
              ? 'Primera vez: elige el rol con el que usarás el sistema. Esta elección es permanente.'
              : 'Selecciona tu rol para esta sesión'}
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="role-grid">
          {visibleRoles.map(r => (
            <button
              key={r.id}
              type="button"
              disabled={saving}
              onClick={() => handleRole(r.id)}
              className="role-btn"
              style={{ borderColor: r.color }}
            >
              <div style={{ width: 52, height: 52, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, border: '1px solid var(--border)' }}>
                <AppIcon name={r.icon} size={28} />
              </div>
              <p style={{ fontWeight: 600, color: r.color, marginBottom: 6 }}>{r.label}</p>
              <p style={{ color: 'var(--soft)', fontSize: 12, lineHeight: 1.4 }}>{r.desc}</p>
              {firstTime && (
                <p style={{ marginTop: 8, color: 'var(--soft)', fontSize: 11 }}>Solo podrás elegir una vez</p>
              )}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--azul)', textDecoration: 'underline' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
