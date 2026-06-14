'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ESPECIALIDADES, formatDate } from '@/lib/utils'
import Link from 'next/link'
import AppIcon from '@/components/AppIcon'

export default function DemeritosPage() {
  const { authFetch, downloadExcel } = useAuth()
  const [demeritos, setDemeritos] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 25

  const fetchDemeritos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch(`/api/demeritos?page=${page}&limit=${LIMIT}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los deméritos')
      const rows = data.demeritos || []
      const seen = new Set<number>()
      const unique = rows.filter((d: { id_demerito: number }) => {
        if (seen.has(d.id_demerito)) return false
        seen.add(d.id_demerito)
        return true
      })
      setDemeritos(unique)
      setTotal(data.total ?? unique.length)
    } catch (e) {
      setDemeritos([])
      setTotal(0)
      setError(e instanceof Error ? e.message : 'Error al cargar deméritos')
    } finally {
      setLoading(false)
    }
  }, [authFetch, page])

  useEffect(() => { fetchDemeritos() }, [fetchDemeritos])

  const exportExcel = () => downloadExcel('/api/export/excel?reporte=demeritos')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8 }}><AppIcon name="demerito" size={20} /> Historial de Deméritos</h1>
          <p style={{ color: 'var(--soft)', fontSize: 13, marginTop: 2 }}>{total} registros totales</p>
        </div>
        <div className="page-header-actions">
          <button onClick={exportExcel} className="btn-primary" style={{ background: 'var(--verde)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="fileSpreadsheet" size={16} /> Exportar Excel</button>
          <Link href="/dashboard/demeritos/nuevo" className="btn-danger" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="demeritoNuevo" size={16} /> Nuevo Demérito</Link>
        </div>
      </div>

      {error && (
        <div style={{ background: '#ffeaea', color: 'var(--rojo)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--soft)' }}>Cargando...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>NIE</th>
                  <th>Grado / Especialidad</th>
                  <th>Causal</th>
                  <th>Registrado por</th>
                  <th>Firma</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {demeritos.map((d: any) => (
                  <tr key={d.id_demerito}>
                    <td>
                      <Link href={`/dashboard/estudiantes/${d.nie}`} style={{ fontWeight: 600, color: 'var(--azul)', textDecoration: 'none', fontSize: 13 }}>
                        {d.alumno_nombre || d.nie}
                      </Link>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.nie}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{d.nivel_nombre || (d.nivel ? `${d.nivel} Año` : '—')}</div>
                      <div style={{ fontSize: 11, color: 'var(--soft)' }}>{ESPECIALIDADES[d.especialidad] || d.especialidad} — {d.seccion_letra}</div>
                    </td>
                    <td>
                      <span className="badge badge-red">Causal {d.causal_letra}</span>
                      <div style={{ fontSize: 11, color: 'var(--soft)', marginTop: 3, maxWidth: 180 }}>{d.causal_desc}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {d.maestro_nombre}
                      {d.es_externo && <div style={{ fontSize: 10, color: 'var(--naranja-drk)', fontWeight: 600 }}>Docente externo</div>}
                    </td>
                    <td>
                      <span className={`badge ${d.alumno_firmo ? 'badge-green' : 'badge-gray'}`}>
                        {d.alumno_firmo ? 'Firmó' : 'Sin firmar'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{formatDate(d.fecha)}</td>
                    <td><span className={`badge ${d.redimido ? 'badge-green' : 'badge-red'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{d.redimido ? <><AppIcon name="checkCircle" size={12} /> Redimido</> : <><AppIcon name="alert" size={12} /> Activo</>}</span></td>
                  </tr>
                ))}
                {demeritos.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--soft)', padding: 30 }}>No hay deméritos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {total > LIMIT && (
          <div className="pagination-bar">
            <span style={{ fontSize: 13, color: 'var(--soft)' }}>Mostrando {(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} de {total}</span>
            <div className="pagination-actions">
              <button onClick={() => setPage(p => p-1)} disabled={page===1} className="btn-outline" style={{ padding: '6px 14px', fontSize: 13 }}>← Anterior</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*LIMIT >= total} className="btn-outline" style={{ padding: '6px 14px', fontSize: 13 }}>Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
