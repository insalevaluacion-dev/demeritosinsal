'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ESPECIALIDADES, labelGradoOpcion, labelNivel } from '@/lib/utils'
import Link from 'next/link'
import AppIcon from '@/components/AppIcon'
import { expedientePath, nuevoDemeritoPath } from '@/lib/nie'

export default function EstudiantesPage() {
  const { authFetch, downloadExcel, sessionRole } = useAuth()
  const esDocente = sessionRole === 'docente'
  const puedeExportarInstitucional = ['director', 'coordinador', 'subdirector'].includes(sessionRole ?? '')
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const [grados, setGrados] = useState<any[]>([])
  const [gradoFiltro, setGradoFiltro] = useState('')
  const [espFiltro, setEspFiltro] = useState('')
  const [appliedGrado, setAppliedGrado] = useState('')
  const [appliedEsp, setAppliedEsp] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [gradoOrientadorLabel, setGradoOrientadorLabel] = useState('')

  const LIMIT = 20
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchEstudiantes = useCallback(async (targetPage: number) => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      page: String(targetPage),
      limit: String(LIMIT),
    })
    if (esDocente) params.set('scope', 'mis')
    if (appliedQ.trim()) params.set('q', appliedQ.trim())
    if (appliedGrado) params.set('grado_id', appliedGrado)
    if (appliedEsp) params.set('especialidad', appliedEsp)
    try {
      const res = await authFetch(`/api/estudiantes?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setEstudiantes([])
        setTotal(0)
        setError(data.error || 'No se pudo cargar la lista de estudiantes')
        return
      }
      const list = data.estudiantes || []
      const count = Number(data.total) || 0
      const maxPage = Math.max(1, Math.ceil(count / LIMIT))
      if (targetPage > maxPage) {
        setPage(maxPage)
        return
      }
      setEstudiantes(list)
      setTotal(count)
    } catch {
      setEstudiantes([])
      setTotal(0)
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }, [appliedQ, appliedGrado, appliedEsp, authFetch, esDocente])

  useEffect(() => {
    fetchEstudiantes(page)
  }, [page, appliedQ, appliedGrado, appliedEsp, fetchEstudiantes])
  useEffect(() => {
    const url = esDocente ? '/api/reportes/mis-grados' : '/api/grados'
    authFetch(url)
      .then(async (r) => {
        const data = await r.json()
        const list = esDocente
          ? (r.ok && Array.isArray(data.grados) ? data.grados : [])
          : (r.ok && Array.isArray(data) ? data : [])
        setGrados(list)
        if (esDocente && list.length === 1) {
          const id = String(list[0].grado_id)
          setGradoFiltro(id)
          setAppliedGrado(id)
          setGradoOrientadorLabel(labelGradoOpcion(list[0]))
        } else if (esDocente && list.length > 0) {
          setGradoOrientadorLabel(list.map((g: any) => labelGradoOpcion(g)).join(', '))
        }
      })
      .catch(() => setGrados([]))
  }, [authFetch, esDocente])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedQ(q)
    setAppliedGrado(gradoFiltro)
    setAppliedEsp(espFiltro)
    setPage(1)
  }

  const goToPage = (next: number) => {
    const p = Math.min(Math.max(1, next), totalPages)
    if (p !== page) setPage(p)
    else fetchEstudiantes(p)
  }

  const exportExcel = () => {
    const params = new URLSearchParams({ reporte: 'estudiantes' })
    if (gradoFiltro) params.set('grado_id', gradoFiltro)
    downloadExcel(`/api/export/excel?${params}`)
  }

  const gradoList = Array.isArray(grados) ? grados : []
  const especialidades = [...new Set(gradoList.map((g: any) => g.especialidad).filter(Boolean))]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="estudiantes" size={20} /> {esDocente ? 'Mis Estudiantes' : 'Estudiantes'}
          </h1>
          <p style={{ color: 'var(--soft)', fontSize: 13, marginTop: 2 }}>
            {total} estudiante{total === 1 ? '' : 's'}
            {esDocente && gradoOrientadorLabel ? ` — ${gradoOrientadorLabel}` : ' — 1°, 2° y 3° año'}
          </p>
        </div>
        {puedeExportarInstitucional && (
          <button type="button" onClick={exportExcel} className="btn-primary" style={{ background: 'var(--verde)' }}>
            Exportar Excel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <form onSubmit={handleSearch} className="filter-form">
          <div className="filter-field">
            <label>Buscar por nombre o NIE</label>
            <input placeholder="Ej: Carlos López o 12345678-9" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {!esDocente && (
            <div className="filter-field filter-field--sm">
              <label>Especialidad</label>
              <select value={espFiltro} onChange={e => setEspFiltro(e.target.value)}>
                <option value="">Todas</option>
                {especialidades.map(e => <option key={e} value={e}>{ESPECIALIDADES[e] || e}</option>)}
              </select>
            </div>
          )}
          {(!esDocente || gradoList.length > 1) && (
            <div className="filter-field filter-field--sm">
              <label>Grado</label>
              <select value={gradoFiltro} onChange={e => setGradoFiltro(e.target.value)}>
                {!esDocente && <option value="">Todos</option>}
                {gradoList.map((g: any) => (
                  <option key={g.grado_id} value={g.grado_id}>{labelGradoOpcion(g)}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary">Buscar</button>
        </form>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#ffeaea', border: '1px solid var(--rojo)', borderRadius: 10, color: 'var(--rojo)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Table */}
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
                  <th>Año / Especialidad</th>
                  <th>Sección</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {estudiantes.map((e: any) => (
                  <tr key={e.estudiante_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: 'var(--azul-lite)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--azul)', fontSize: 13, flexShrink: 0 }}>
                          {e.nombre_completo?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.nombre_completo}</div>
                          <div style={{ fontSize: 11, color: 'var(--soft)' }}>{e.responsable}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{e.nie}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{labelNivel(e.grado) || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--soft)' }}>{ESPECIALIDADES[e.grado?.especialidad] || e.grado?.especialidad}</div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{e.grado?.seccion_letra}</span>
                    </td>
                    <td>
                      <span className={`badge ${e.estado ? 'badge-green' : 'badge-gray'}`}>{e.estado ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link href={expedientePath(e.nie)} className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}>
                          Ver Expediente
                        </Link>
                        <Link href={nuevoDemeritoPath(e.nie)} className="btn-danger" style={{ padding: '5px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', borderRadius: 8 }}>
                          <AppIcon name="demerito" size={14} /> Demérito
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {estudiantes.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--soft)', padding: 30 }}>No se encontraron estudiantes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="pagination-bar">
            <span style={{ fontSize: 13, color: 'var(--soft)' }}>
              Mostrando {total === 0 ? 0 : (page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
              {totalPages > 1 && ` · Página ${page} de ${totalPages}`}
            </span>
            <div className="pagination-actions">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: 13, opacity: page <= 1 ? 0.45 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: 13, opacity: page >= totalPages ? 0.45 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
