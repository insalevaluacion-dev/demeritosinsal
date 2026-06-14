'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/context/AuthContext'
import { ESPECIALIDADES, labelNivel } from '@/lib/utils'
import Link from 'next/link'
import AppIcon, { type AppIconName } from '@/components/AppIcon'

const DashboardCharts = dynamic(() => import('./DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid-charts">
      <div className="card chart-skeleton" />
      <div className="card chart-skeleton" />
    </div>
  ),
})

function StatSkeleton() {
  return (
    <div className="stat-card stat-card--skeleton" aria-hidden>
      <div className="stat-card__icon skeleton-block" style={{ width: 48, height: 48, borderRadius: 12 }} />
      <div className="stat-card__body">
        <div className="skeleton-block" style={{ width: 56, height: 22, marginBottom: 6 }} />
        <div className="skeleton-block" style={{ width: 88, height: 12 }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { authFetch, user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    authFetch('/api/dashboard')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'No se pudieron cargar las estadísticas')
        setData(d)
        setError('')
      })
      .catch((e) => {
        setData(null)
        setError(e instanceof Error ? e.message : 'Error al cargar el dashboard')
      })
      .finally(() => setLoading(false))
  }, [authFetch])

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="alert-error" style={{ maxWidth: 480, margin: '0 auto 12px' }}>{error}</div>
        <p style={{ color: 'var(--soft)', fontSize: 13 }}>
          Verifique que PostgreSQL esté en ejecución y recargue la página.
        </p>
      </div>
    )
  }

  const stats = data?.stats || {}
  const recientes = data?.recientes || []
  const topInc = data?.topIncidencias || []
  const porEsp = data?.porEspecialidad || []
  const porMes = data?.porMes || []

  const statCards: { label: string; value: number; icon: AppIconName; color: string; bg: string }[] = [
    { label: 'Estudiantes', value: stats.totalEstudiantes || 0, icon: 'estudiantes', color: 'var(--azul)', bg: 'var(--azul-lite)' },
    { label: 'Deméritos Hoy', value: stats.totalDemeritosHoy || 0, icon: 'demerito', color: 'var(--rojo)', bg: '#ffeaea' },
    { label: 'Deméritos Activos', value: stats.totalDemeritosActivos || 0, icon: 'alert', color: 'var(--naranja-drk)', bg: 'var(--naranja-bg)' },
    { label: 'Reconocimientos', value: stats.totalReconocimientos || 0, icon: 'reconocimiento', color: 'var(--verde)', bg: '#e8f9ef' },
    { label: 'Redenciones', value: stats.totalRedenciones || 0, icon: 'redencion', color: 'var(--azul-med)', bg: 'var(--azul-lite)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="page-title">Buenos días, {user?.nombre?.split(' ')[0]}</h2>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('es-SV', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — Bachillerato (1° a 3° año)
        </p>
      </div>

      <div className="grid-stats">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-card__icon" style={{ background: s.bg }}>
                  <AppIcon name={s.icon} size={22} />
                </div>
                <div className="stat-card__body">
                  <div className="stat-card__value" style={{ color: s.color }}>
                    {s.value.toLocaleString()}
                  </div>
                  <div className="stat-card__label">{s.label}</div>
                </div>
              </div>
            ))}
      </div>

      {!loading && <DashboardCharts porMes={porMes} porEsp={porEsp} />}

      <div className="grid-2">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--txt)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AppIcon name="clipboard" size={18} /> Actividad Reciente
            </h3>
          </div>
          <div className="scroll-panel" style={{ maxHeight: 280 }}>
            {loading ? (
              <p style={{ padding: 20, color: 'var(--soft)', textAlign: 'center', fontSize: 13 }}>Cargando…</p>
            ) : (
              <>
                {recientes.map((r: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <AppIcon name={r.tipo === 'demerito' ? 'demerito' : 'reconocimiento'} size={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)' }}>{r.alumno || r.nie}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--soft)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.descripcion}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--soft)', marginTop: 2 }}>
                        Por: {r.maestro} · {new Date(r.fecha).toLocaleDateString('es-SV')}
                      </div>
                    </div>
                  </div>
                ))}
                {recientes.length === 0 && (
                  <p style={{ padding: 20, color: 'var(--soft)', textAlign: 'center', fontSize: 13 }}>
                    Sin actividad reciente
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--txt)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AppIcon name="alert" size={18} /> Top Incidencias Activas
            </h3>
          </div>
          <div className="scroll-panel" style={{ maxHeight: 280 }}>
            {loading ? (
              <p style={{ padding: 20, color: 'var(--soft)', textAlign: 'center', fontSize: 13 }}>Cargando…</p>
            ) : (
              <>
                {topInc.map((t: any, i: number) => (
                  <Link key={i} href={`/dashboard/estudiantes/${t.nie}`} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)' }}>
                          <span style={{ color: 'var(--soft)', fontSize: 11, marginRight: 6 }}>#{i + 1}</span>
                          {t.nombre}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--soft)', marginTop: 2 }}>
                          {ESPECIALIDADES[t.especialidad] || t.especialidad} — {labelNivel(t) || t.nivel_nombre}{' '}
                          {t.seccion_letra}
                        </div>
                      </div>
                      <div
                        style={{
                          background:
                            t.total >= 15 ? '#ffeaea' : t.total >= 10 ? 'var(--naranja-bg)' : 'var(--azul-lite)',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontWeight: 800,
                          fontSize: 16,
                          color: t.total >= 15 ? 'var(--rojo)' : t.total >= 10 ? 'var(--naranja-drk)' : 'var(--azul)',
                        }}
                      >
                        {t.total}
                      </div>
                    </div>
                  </Link>
                ))}
                {topInc.length === 0 && (
                  <p style={{ padding: 20, color: 'var(--soft)', textAlign: 'center', fontSize: 13 }}>
                    Sin incidencias activas
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
