'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import AppIcon, { type AppIconName } from '@/components/AppIcon'
import { ROLES_DISPLAY } from '@/lib/utils'

export default function AdminPage() {
  const { user, sessionRole, authFetch } = useAuth()
  const [maestros, setMaestros] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview'|'usuarios'>('overview')

  useEffect(() => {
    if (sessionRole !== 'director' && sessionRole !== 'subdirector') return
    Promise.all([authFetch('/api/maestros'), authFetch('/api/dashboard')])
      .then(async ([maestrosRes, dashRes]) => {
        const m = await maestrosRes.json()
        const d = await dashRes.json()
        setMaestros(maestrosRes.ok && Array.isArray(m) ? m : [])
        setStats(dashRes.ok && d?.stats ? d.stats : {})
        setLoading(false)
      })
      .catch(() => {
        setMaestros([])
        setLoading(false)
      })
  }, [sessionRole, authFetch])

  if (sessionRole !== 'director' && sessionRole !== 'subdirector') {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 400, margin: '60px auto' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><AppIcon name="lock" size={48} /></div>
        <h2 style={{ fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--soft)', fontSize: 13 }}>Solo el Director/a o Subdirector/a puede acceder a esta sección.</p>
        <Link href="/dashboard" className="btn-primary" style={{ display: 'inline-flex', marginTop: 20, textDecoration: 'none' }}>← Volver al Dashboard</Link>
      </div>
    )
  }

  const maestroList = Array.isArray(maestros) ? maestros : []

  const sections: { icon: AppIconName; title: string; desc: string; href: string; color: string }[] = [
    { icon: 'estudiantes', title: 'Gestión de Estudiantes', desc: 'Ver, buscar y administrar todos los estudiantes inscritos', href: '/dashboard/estudiantes', color: 'var(--azul)' },
    { icon: 'maestros', title: 'Personal Docente', desc: 'Lista completa de maestros y coordinadores', href: '/dashboard/maestros', color: 'var(--verde)' },
    { icon: 'demerito', title: 'Historial Deméritos', desc: 'Auditoría completa de todos los deméritos registrados', href: '/dashboard/demeritos', color: 'var(--rojo)' },
    { icon: 'reconocimiento', title: 'Reconocimientos', desc: 'Historial de méritos y reconocimientos del ciclo', href: '/dashboard/reconocimientos', color: 'var(--naranja-drk)' },
    { icon: 'reportes', title: 'Reportes Avanzados', desc: 'Estadísticas, gráficas comparativas y exportaciones', href: '/dashboard/reportes', color: 'var(--azul-med)' },
    { icon: 'notificaciones', title: 'Notificaciones', desc: 'Centro de alertas y notificaciones del sistema', href: '/dashboard/notificaciones', color: 'var(--dorado)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon name="admin" size={20} /> Panel de Administración
        </h1>
        <p style={{ color: 'var(--soft)', fontSize: 13, marginTop: 2 }}>{ROLES_DISPLAY[sessionRole||'']} — {user?.nombre}</p>
      </div>

      {/* Institutional banner */}
      <div style={{ background: 'linear-gradient(135deg,var(--azul-dark) 0%,var(--azul) 100%)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, color: '#fff', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <img src="/insal-logo.png" alt="INSAL" width={64} height={64} style={{ borderRadius: '50%', border: '2px solid var(--naranja)' }} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Instituto Nacional San Luis</h2>
          <p style={{ opacity: 0.8, fontSize: 13, marginTop: 3 }}>Sistema de méritos, deméritos y redenciones — INSAL</p>
          <p style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>Ministerio de Educación de El Salvador | Bachillerato 1°–3° año</p>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Estudiantes', value: stats.totalEstudiantes||0 },
            { label: 'Dem. Activos', value: stats.totalDemeritosActivos||0 },
            { label: 'Docentes', value: maestroList.length },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {(['overview','usuarios'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`tab-btn${tab === t ? ' active' : ''}`}>
            {t === 'overview' ? 'Módulos del Sistema' : 'Usuarios Registrados'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 16 }}>
          {sections.map(s => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer', transition: 'all 0.2s', border: '2px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = s.color; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AppIcon name={s.icon} size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: s.color, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--soft)', lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--soft)' }}>Cargando usuarios...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Docente</th><th>Correo Institucional</th><th>Materia</th><th>Turno</th><th>Rol</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {maestroList.map((m: any) => (
                    <tr key={m.maestro_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, background: m.rol_nombre==='director' ? 'var(--azul-dark)' : m.rol_nombre==='administrador' ? 'var(--verde)' : 'var(--azul)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {m.nombre.charAt(0)}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.nombre}</div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--soft)' }}>{m.email || '—'}</td>
                      <td style={{ fontSize: 13 }}>{m.materia_nombre || '—'}</td>
                      <td style={{ fontSize: 13 }}>{m.turno_nombre || '—'}</td>
                      <td>
                        <span className={`badge ${m.rol_nombre==='director' ? 'badge-orange' : m.rol_nombre==='administrador' ? 'badge-blue' : 'badge-gray'}`}>
                          {ROLES_DISPLAY[m.rol_nombre] || m.rol_nombre}
                        </span>
                      </td>
                      <td><span className={`badge ${m.activo ? 'badge-green' : 'badge-gray'}`}>{m.activo ? 'Activo' : 'Inactivo'}</span></td>
                    </tr>
                  ))}
                  {maestroList.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--soft)', padding: 24 }}>No hay usuarios</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

