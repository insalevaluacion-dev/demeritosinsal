'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ESPECIALIDADES, formatDate } from '@/lib/utils'
import Link from 'next/link'
import AppIcon from '@/components/AppIcon'

export default function ReconocimientosPage() {
  const { authFetch } = useAuth()
  const [reconocimientos, setReconocimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/reconocimientos')
      .then(async (r) => {
        const d = await r.json()
        setReconocimientos(r.ok && Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => {
        setReconocimientos([])
        setLoading(false)
      })
  }, [authFetch])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-heading"><AppIcon name="reconocimiento" size={20} /> Reconocimientos</h1>
          <p className="page-heading-sub">{reconocimientos.length} registros</p>
        </div>
        <div className="page-header-actions">
          <Link href="/dashboard/reconocimientos/nuevo" className="btn-success" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="reconocimientoNuevo" size={16} /> Nuevo Reconocimiento</Link>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--soft)' }}>Cargando...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Estudiante</th><th>NIE</th><th>Tipo</th><th>Descripción</th><th>Observación</th><th>Registrado por</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {reconocimientos.map((r: any) => (
                  <tr key={r.id_reconocimiento}>
                    <td>
                      <Link href={`/dashboard/estudiantes/${r.nie}`} style={{ fontWeight: 600, color: 'var(--azul)', textDecoration: 'none', fontSize: 13 }}>
                        {r.alumno_nombre || r.nie}
                      </Link>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.nie}</td>
                    <td><span className="badge badge-orange">Tipo {r.tipo_letra}</span></td>
                    <td style={{ fontSize: 12 }}>{r.tipo_desc}</td>
                    <td style={{ fontSize: 12, color: 'var(--soft)' }}>{r.observacion || '—'}</td>
                    <td style={{ fontSize: 12 }}>{r.maestro_nombre}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(r.fecha)}</td>
                  </tr>
                ))}
                {reconocimientos.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--soft)', padding: 30 }}>No hay reconocimientos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
