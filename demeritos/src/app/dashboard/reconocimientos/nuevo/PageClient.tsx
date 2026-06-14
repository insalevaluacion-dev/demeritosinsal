'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ESPECIALIDADES, labelGradoOpcion } from '@/lib/utils'
import Link from 'next/link'
import AppIcon from '@/components/AppIcon'

export default function NuevoReconocimientoPage({ preNie = '' }: { preNie?: string }) {
  const { authFetch } = useAuth()

  const [busqueda, setBusqueda] = useState(preNie)
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [estudianteSelected, setEstudianteSelected] = useState<any>(null)
  const [tipos, setTipos] = useState<any[]>([])
  const [tipoId, setTipoId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    authFetch('/api/causales').then(r => r.json()).then(d => setTipos(d.tipos || []))
    if (preNie) {
      authFetch(`/api/estudiantes/${preNie}`).then(r => r.json()).then(e => {
        if (!e.error) setEstudianteSelected(e)
      })
    }
  }, [])

  const searchEstudiantes = async () => {
    if (!busqueda.trim()) return
    setSearching(true)
    const params = new URLSearchParams({ q: busqueda.trim(), limit: '10' })
    const res = await authFetch(`/api/estudiantes?${params}`)
    const data = await res.json()
    setEstudiantes(res.ok ? data.estudiantes || [] : [])
    setSearching(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!estudianteSelected || !tipoId) return
    setLoading(true)
    setError('')
    const tipo = tipos.find((t: any) => t.id_tipo == tipoId)
    try {
      const res = await authFetch('/api/reconocimientos', {
        method: 'POST',
        body: JSON.stringify({
          nie: estudianteSelected.nie,
          id_tipo: parseInt(tipoId),
          tipo_letra: tipo?.letra,
          observacion,
          sexo_alumno: 'H'
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar el reconocimiento.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Error de conexión. Verifica que el servidor esté activo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: '#e8f9ef', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AppIcon name="reconocimiento" size={36} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, color: 'var(--txt)' }}>¡Reconocimiento Registrado!</h2>
          <p style={{ color: 'var(--soft)', marginBottom: 20 }}>El reconocimiento para <strong>{estudianteSelected?.nombre_completo}</strong> fue registrado correctamente.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => { setSuccess(false); setEstudianteSelected(null); setBusqueda(''); setObservacion(''); setTipoId('') }} className="btn-success">+ Nuevo</button>
            <Link href={`/dashboard/estudiantes/${estudianteSelected?.nie}`} className="btn-outline" style={{ textDecoration: 'none' }}>Ver Expediente</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8 }}><AppIcon name="reconocimiento" size={20} /> Registrar Reconocimiento</h1>
        <p style={{ color: 'var(--soft)', fontSize: 13, marginTop: 4 }}>Artículo 7 — Instrumento No. 001 — MINED</p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>1. Seleccionar Estudiante</h3>
        {estudianteSelected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e8f9ef', borderRadius: 10, padding: '12px 16px' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{estudianteSelected.nombre_completo}</div>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>NIE: {estudianteSelected.nie} · {labelGradoOpcion(estudianteSelected.grado || {})}</div>
            </div>
            <button onClick={() => setEstudianteSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--soft)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Quitar estudiante"><AppIcon name="x" size={18} /></button>
          </div>
        ) : (
          <>
            <div className="search-row">
              <input placeholder="Buscar por nombre o NIE..." value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchEstudiantes()} />
              <button onClick={searchEstudiantes} className="btn-success" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{searching ? '...' : <><AppIcon name="search" size={16} /> Buscar</>}</button>
            </div>
            {estudiantes.length > 0 && (
              <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {estudiantes.map((e: any) => (
                  <div key={e.estudiante_id} onClick={() => { setEstudianteSelected(e); setEstudiantes([]) }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={el => (el.currentTarget.style.background = '#e8f9ef')}
                    onMouseLeave={el => (el.currentTarget.style.background = '#fff')}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.nombre_completo}</div>
                    <div style={{ fontSize: 11, color: 'var(--soft)' }}>NIE: {e.nie} · {labelGradoOpcion(e.grado || {})}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>2. Tipo de Reconocimiento</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tipos.map((t: any) => (
              <label key={t.id_tipo} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                border: `2px solid ${tipoId == t.id_tipo ? 'var(--verde)' : 'var(--border)'}`,
                borderRadius: 10, cursor: 'pointer',
                background: tipoId == t.id_tipo ? '#e8f9ef' : '#fff', transition: 'all 0.15s'
              }}>
                <input type="radio" name="tipo" value={t.id_tipo} checked={tipoId == t.id_tipo} onChange={e => setTipoId(e.target.value)} style={{ width: 'auto' }} />
                <div>
                  <strong style={{ color: 'var(--verde)', fontSize: 13 }}>Tipo {t.letra}</strong>
                  <div style={{ fontSize: 13, color: 'var(--txt)', marginTop: 2 }}>{t.descripcion}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>3. Observación</h3>
          <textarea rows={3} value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Descripción del logro o mérito alcanzado..." />
        </div>

        {error && (
          <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--rojo)', background: '#ffeaea', padding: '10px 12px', borderRadius: 8 }}>
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn-success" disabled={!estudianteSelected || !tipoId || loading} style={{ flex: 1, justifyContent: 'center', padding: 14, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {loading ? 'Guardando...' : <><AppIcon name="reconocimiento" size={16} /> Registrar Reconocimiento</>}
          </button>
          <Link href="/dashboard/estudiantes" className="btn-outline" style={{ textDecoration: 'none', padding: '14px 20px' }}>Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
