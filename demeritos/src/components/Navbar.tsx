'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Menu, Bell } from 'lucide-react'

interface NavbarProps {
  onMenuToggle: () => void
  menuOpen?: boolean
}

const ROLE_LABELS: Record<string, string> = {
  docente: 'Maestro/a',
  coordinador: 'Coordinador/a',
  subdirector: 'Subdirector/a',
  director: 'Director/a',
}

const NOTIF_COLORS = ['var(--azul)', 'var(--naranja)', 'var(--rojo)', '#7c3aed']
const NOTIF_BG = ['var(--azul-lite)', 'var(--naranja-bg)', '#ffeaea', '#f3e8ff']

export default function Navbar({ onMenuToggle, menuOpen = false }: NavbarProps) {
  const { user, sessionRole, authFetch } = useAuth()
  const [notifs, setNotifs] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (menuOpen) setNotifOpen(false)
  }, [menuOpen])

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 900px)').matches
    const poll = () => {
      if (document.hidden) return
      loadNotifs()
    }
    poll()
    const interval = setInterval(poll, isMobile ? 60000 : 30000)
    const onVisible = () => {
      if (!document.hidden) loadNotifs()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [notifOpen])

  const loadNotifs = async () => {
    try {
      const res = await authFetch('/api/notificaciones')
      if (res.ok) {
        const data = await res.json()
        setNotifs(data)
        setUnread(data.filter((n: any) => !n.leida).length)
      }
    } catch { /* ignore */ }
  }

  const markRead = async (id: number) => {
    await authFetch('/api/notificaciones', {
      method: 'PATCH',
      body: JSON.stringify({ id_notif: id }),
    })
    setNotifs(prev => prev.map(n => n.id_notif === id ? { ...n, leida: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const initials = user?.nombre?.charAt(0)?.toUpperCase() || 'U'

  return (
    <header className="app-navbar glass-nav">
      <button type="button" className="btn-icon btn-menu-toggle" onClick={onMenuToggle} aria-label="Abrir menú">
        <Menu size={22} />
      </button>

      <div className="navbar-brand">
        <span className="navbar-brand-title">Deméritos</span>
        <span className="navbar-brand-sub">Instituto Nacional San Luis</span>
      </div>

      <div ref={notifRef} className="navbar-notif-wrap">
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            setNotifOpen((o) => {
              if (!o) loadNotifs()
              return !o
            })
          }}
          aria-label="Notificaciones"
          style={{ position: 'relative' }}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="badge-dot">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>

        {notifOpen && (
          <div className="dropdown-glass">
            <div className="dropdown-glass__layer dropdown-glass__layer--back" aria-hidden />
            <div className="dropdown-glass__layer dropdown-glass__layer--mid" aria-hidden />
            <div className="dropdown-glass__panel glass-panel">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 14 }}>
              <span>Notificaciones</span>
              {unread > 0 && <span className="badge badge-red">{unread} nuevas</span>}
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <p style={{ padding: 32, textAlign: 'center', color: 'var(--soft)', fontSize: 13 }}>Sin notificaciones</p>
              ) : (
                notifs.map((n: any) => {
                  const idx = Math.min(n.nivel_alerta, 3)
                  return (
                    <div
                      key={n.id_notif}
                      className="notif-item-row"
                      style={{ background: n.leida ? 'transparent' : NOTIF_BG[idx] }}
                      onClick={() => markRead(n.id_notif)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && markRead(n.id_notif)}
                    >
                      <p style={{ fontWeight: 600, fontSize: 13, color: NOTIF_COLORS[idx] }}>{n.titulo}</p>
                      <p style={{ color: 'var(--soft)', marginTop: 3, fontSize: 13 }}>{n.mensaje}</p>
                      <p style={{ color: 'var(--soft)', marginTop: 4, fontSize: 11 }}>
                        {new Date(n.fecha_hora).toLocaleString('es-SV')}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
            </div>
          </div>
        )}
      </div>

      <div className="navbar-user-chip">
        <span className="avatar-chip">{initials}</span>
        <div className="navbar-user-text">
          <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user?.nombre?.split(' ')[0]}</p>
          <p style={{ fontSize: 11, color: 'var(--soft)' }}>{ROLE_LABELS[sessionRole || '']}</p>
        </div>
      </div>
    </header>
  )
}
