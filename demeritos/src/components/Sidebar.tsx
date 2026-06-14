'use client'

import { useAuth } from '@/context/AuthContext'
import { canSwitchSessionRole } from '@/lib/session-roles'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ArrowLeftRight } from 'lucide-react'
import AppIcon, { type AppIconName } from '@/components/AppIcon'

interface SidebarProps { isOpen: boolean; onClose: () => void }

type NavItem = { href: string; label: string; icon: AppIconName }

const NAV: Record<string, NavItem[]> = {
  docente: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/dashboard/estudiantes', label: 'Mis Estudiantes', icon: 'estudiantes' },
    { href: '/dashboard/demeritos/nuevo', label: 'Nuevo Demérito', icon: 'demeritoNuevo' },
    { href: '/dashboard/reconocimientos/nuevo', label: 'Nuevo Reconocimiento', icon: 'reconocimientoNuevo' },
    { href: '/dashboard/demeritos', label: 'Historial Deméritos', icon: 'historial' },
    { href: '/dashboard/reconocimientos', label: 'Reconocimientos', icon: 'reconocimiento' },
    { href: '/dashboard/reportes', label: 'Mis Reportes', icon: 'reportes' },
    { href: '/dashboard/notificaciones', label: 'Notificaciones', icon: 'notificaciones' },
  ],
  coordinador: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: 'estudiantes' },
    { href: '/dashboard/demeritos', label: 'Deméritos', icon: 'demerito' },
    { href: '/dashboard/reconocimientos', label: 'Reconocimientos', icon: 'reconocimiento' },
    { href: '/dashboard/reportes', label: 'Reportes', icon: 'reportes' },
    { href: '/dashboard/notificaciones', label: 'Notificaciones', icon: 'notificaciones' },
  ],
  subdirector: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: 'estudiantes' },
    { href: '/dashboard/demeritos', label: 'Deméritos', icon: 'demerito' },
    { href: '/dashboard/reconocimientos', label: 'Reconocimientos', icon: 'reconocimiento' },
    { href: '/dashboard/reportes', label: 'Reportes', icon: 'reportes' },
    { href: '/dashboard/maestros', label: 'Maestros', icon: 'maestros' },
    { href: '/dashboard/admin', label: 'Administración', icon: 'admin' },
    { href: '/dashboard/notificaciones', label: 'Notificaciones', icon: 'notificaciones' },
  ],
  director: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: 'estudiantes' },
    { href: '/dashboard/demeritos', label: 'Deméritos', icon: 'demerito' },
    { href: '/dashboard/reconocimientos', label: 'Reconocimientos', icon: 'reconocimiento' },
    { href: '/dashboard/reportes', label: 'Reportes', icon: 'reportes' },
    { href: '/dashboard/maestros', label: 'Maestros', icon: 'maestros' },
    { href: '/dashboard/admin', label: 'Administración', icon: 'admin' },
    { href: '/dashboard/notificaciones', label: 'Notificaciones', icon: 'notificaciones' },
  ],
}

const ROLE_LABEL: Record<string, string> = {
  docente: 'Maestro/a',
  coordinador: 'Coordinador/a',
  subdirector: 'Subdirector/a',
  director: 'Director/a',
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, sessionRole, logout } = useAuth()
  const showRoleSwitch = canSwitchSessionRole(user)
  const pathname = usePathname()
  const items = NAV[sessionRole ?? 'docente'] ?? NAV.docente

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    const matches = items.filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    const best = matches.sort((a, b) => b.href.length - a.href.length)[0]
    return best?.href === href
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden />}

      <aside className={`app-sidebar${isOpen ? ' open' : ''}`}>
        <div className="app-sidebar__layer app-sidebar__layer--back" aria-hidden />
        <div className="app-sidebar__layer app-sidebar__layer--mid" aria-hidden />
        <div className="app-sidebar__panel">
        <div className="app-sidebar-brand">
          <div className="logo-ring logo-ring--sidebar">
            <img src="/insal-logo.png" alt="Logo Instituto Nacional San Luis" width={56} height={56} />
          </div>
          <div>
            <div className="brand-title">INSAL</div>
            <div className="brand-sub">Sistema de deméritos</div>
          </div>
        </div>

        <div className="app-sidebar-user">
          <p className="sidebar-user-label">Sesión activa</p>
          <p className="sidebar-user-name">{user?.nombre?.split(' ').slice(0, 3).join(' ')}</p>
          <span className="sidebar-role-badge">
            <span className="sidebar-role-dot" />
            {ROLE_LABEL[sessionRole ?? 'docente']}
          </span>
        </div>

        <nav className="app-sidebar-nav">
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`sidebar-link${isActive(item.href) ? ' active' : ''}`}
            >
              <span className="sidebar-icon-wrap">
                <AppIcon name={item.icon} size={17} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          {showRoleSwitch && (
            <Link href="/select-role" className="sidebar-link" onClick={onClose}>
              <span className="sidebar-icon-wrap">
                <ArrowLeftRight size={17} color="var(--azul)" />
              </span>
              <span>Cambiar Rol</span>
            </Link>
          )}
          <button type="button" onClick={logout} className="sidebar-link sidebar-logout">
            <span className="sidebar-icon-wrap">
              <LogOut size={17} />
            </span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
        </div>
      </aside>
    </>
  )
}
