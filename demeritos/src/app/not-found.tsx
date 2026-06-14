'use client'

import Link from 'next/link'
import AppIcon from '@/components/AppIcon'

export default function NotFound() {
  return (
    <div className="auth-shell-light" style={{ alignItems: 'center' }}>
      <div className="glass-card glass-card--light" style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.9)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: 'var(--sh-sm)' }}>
          <AppIcon name="search" size={40} />
        </div>
        <h2 className="page-title" style={{ marginBottom: 8 }}>Página no encontrada</h2>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>La ruta solicitada no existe en el sistema.</p>
        <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>
          ← Ir al Dashboard
        </Link>
      </div>
    </div>
  )
}
