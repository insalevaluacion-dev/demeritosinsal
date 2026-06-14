'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ESPECIALIDADES, labelGradoOpcion } from '@/lib/utils'
import Link from 'next/link'
import AppIcon, { type AppIconName } from '@/components/AppIcon'

export default function NotificacionesPage() {
  const { authFetch } = useAuth()
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/notificaciones').then(r => r.json()).then(d => {
      setNotifs(d || [])
      setLoading(false)
    })
  }, [])

  const markRead = async (id: number) => {
    await authFetch('/api/notificaciones', { method: 'PATCH', body: JSON.stringify({ id_notif: id }) })
    setNotifs(prev => prev.map(n => n.id_notif === id ? { ...n, leida: true } : n))
  }

  const markAllRead = async () => {
    for (const n of notifs.filter(n => !n.leida)) await markRead(n.id_notif)
  }

  const LEVEL_STYLES: { bg: string; border: string; icon: AppIconName; color: string }[] = [
    { bg: 'var(--azul-lite)', border: 'var(--azul)', icon: 'clipboard', color: 'var(--azul)' },
    { bg: 'var(--naranja-bg)', border: 'var(--naranja)', icon: 'phone', color: 'var(--naranja-drk)' },
    { bg: '#ffeaea', border: 'var(--rojo)', icon: 'demerito', color: 'var(--rojo)' },
    { bg: '#ffeaea', border: 'var(--rojo)', icon: 'alert', color: 'var(--rojo)' },
  ]

  const TIPO_STYLES: Record<string, { icon: AppIconName; label: string }> = {
    demerito: { icon: 'demerito', label: 'Demérito' },
    reconocimiento: { icon: 'reconocimiento', label: 'Reconocimiento' },
    redencion: { icon: 'redencion', label: 'Redención' },
  }

  const unread = notifs.filter(n => !n.leida).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="notificaciones" size={20} /> Notificaciones
          </h1>
          <p style={{ color: 'var(--soft)', fontSize: 13, marginTop: 2 }}>{unread} sin leer de {notifs.length} notificaciones</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="check" size={16} /> Marcar todas como leídas
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--soft)' }}>Cargando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifs.map((n: any) => {
            const lvl = LEVEL_STYLES[Math.min(n.nivel_alerta, 3)]
            const tipo = TIPO_STYLES[n.tipo] || { icon: 'clipboard' as AppIconName, label: n.tipo }
            return (
              <div
                key={n.id_notif}
                style={{
                  background: n.leida ? '#fff' : lvl.bg,
                  border: `1.5px solid ${n.leida ? 'var(--border)' : lvl.border}`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  gap: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: n.leida ? 0.7 : 1,
                }}
                onClick={() => !n.leida && markRead(n.id_notif)}
              >
                <div style={{ width: 40, height: 40, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AppIcon name={tipo.icon} size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: n.leida ? 'var(--txt)' : lvl.color }}>{n.titulo}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <span className={`badge ${n.tipo === 'reconocimiento' ? 'badge-green' : n.tipo === 'redencion' ? 'badge-blue' : 'badge-red'}`}>{tipo.label}</span>
                      {!n.leida && <span className="notif-dot" style={{ marginTop: 4 }}></span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--soft)', marginTop: 4, whiteSpace: 'pre-line' }}>{n.mensaje}</div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--soft)', flexWrap: 'wrap', alignItems: 'center' }}>
                    {n.alumno_nombre && (
                      <Link href={`/dashboard/estudiantes/${n.nie}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--azul)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AppIcon name="user" size={12} /> {n.alumno_nombre}
                      </Link>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AppIcon name="calendar" size={12} /> {new Date(n.fecha_hora).toLocaleString('es-SV')}
                    </span>
                    {n.nivel && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AppIcon name="graduationCap" size={12} /> {labelGradoOpcion(n)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {notifs.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <AppIcon name="bellOff" size={32} />
              </div>
              <p style={{ color: 'var(--soft)', fontSize: 15 }}>No hay notificaciones</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
