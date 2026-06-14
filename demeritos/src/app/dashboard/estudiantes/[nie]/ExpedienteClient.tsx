'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ESPECIALIDADES, formatDate, formatDateTime } from '@/lib/utils'
import { expedientePath, normalizeNie, nuevoDemeritoPath, nuevoReconocimientoPath } from '@/lib/nie'
import Link from 'next/link'
import AppIcon from '@/components/AppIcon'

type Tab = 'demeritos' | 'reconocimientos' | 'redenciones'

export default function ExpedienteClient({ nie }: { nie: string }) {
  const { authFetch } = useAuth()
  const searchParams = useSearchParams()
  const refreshKey = searchParams.get('t') || ''
  const [sessionRefresh, setSessionRefresh] = useState('')
  const [estudiante, setEstudiante] = useState<any>(null)
  const [demeritos, setDemeritos] = useState<any[]>([])
  const [reconocimientos, setReconocimientos] = useState<any[]>([])
  const [redenciones, setRedenciones] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('demeritos')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showRedencion, setShowRedencion] = useState<any>(null)
  const [opciones, setOpciones] = useState<any[]>([])
  const [obsRedencion, setObsRedencion] = useState('')
  const [opcionSelected, setOpcionSelected] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchOpts = { cache: 'no-store' as RequestCache }

  const loadExpediente = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const nieParam = normalizeNie(nie)
    try {
      const estRes = await authFetch(
        `/api/estudiantes/${encodeURIComponent(nieParam)}`,
        fetchOpts
      )
      const est = await estRes.json()
      if (!estRes.ok || est.error) {
        setEstudiante(est)
        setDemeritos([])
        setReconocimientos([])
        setRedenciones([])
        setLoadError(est.error || 'No se pudo cargar el estudiante')
        return
      }

      setEstudiante(est)
      const canonicalNie = normalizeNie(est.nie || nieParam)
      const q = encodeURIComponent(canonicalNie)

      const [demRes, recRes, redRes, catRes] = await Promise.all([
        authFetch(`/api/demeritos?nie=${q}&limit=100`, fetchOpts),
        authFetch(`/api/reconocimientos?nie=${q}`, fetchOpts),
        authFetch(`/api/redenciones?nie=${q}`, fetchOpts),
        authFetch('/api/causales', fetchOpts),
      ])

      const dem = await demRes.json()
      const rec = await recRes.json()
      const red = await redRes.json()
      const cat = await catRes.json()

      if (!demRes.ok) {
        setLoadError(dem.error || 'No se pudieron cargar los deméritos')
        setDemeritos([])
      } else {
        setDemeritos(dem.demeritos || [])
      }

      setReconocimientos(recRes.ok && Array.isArray(rec) ? rec : [])
      setRedenciones(redRes.ok && Array.isArray(red) ? red : [])
      setOpciones(cat.opciones || [])
    } catch {
      setLoadError('Error de conexión al cargar el expediente')
    } finally {
      setLoading(false)
    }
  }, [nie, authFetch])

  useEffect(() => {
    const flag = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('demeritos_refresh_expediente') || ''
      : ''
    setSessionRefresh(flag)
    if (flag) window.sessionStorage.removeItem('demeritos_refresh_expediente')
  }, [])

  useEffect(() => {
    loadExpediente()
  }, [loadExpediente, refreshKey, sessionRefresh])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadExpediente()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadExpediente])

  const handleRedimir = async () => {
    if (!opcionSelected || !showRedencion) return
    setSaving(true)
    const opcion = opciones.find((o: any) => o.id_opcion == opcionSelected)
    try {
      const res = await authFetch('/api/redenciones', {
        method: 'POST',
        body: JSON.stringify({
          nie: normalizeNie(estudiante?.nie || nie),
          id_demerito: showRedencion.id_demerito,
          id_opcion: parseInt(opcionSelected),
          opcion_letra: opcion?.letra,
          observacion: obsRedencion
        })
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'No se pudo guardar la redención.')
        return
      }
      setShowRedencion(null)
      setObsRedencion('')
      setOpcionSelected('')
      const canonicalNie = encodeURIComponent(normalizeNie(estudiante?.nie || nie))
      const [demRes, redRes] = await Promise.all([
        authFetch(`/api/demeritos?nie=${canonicalNie}&limit=100`, fetchOpts),
        authFetch(`/api/redenciones?nie=${canonicalNie}`, fetchOpts),
      ])
      const demData = await demRes.json()
      const redData = await redRes.json()
      setDemeritos(demData.demeritos || [])
      setRedenciones(Array.isArray(redData) ? redData : [])
    } catch {
      alert('Error de conexión al guardar la redención.')
    } finally {
      setSaving(false)
    }
  }

  const demeritosActivos = demeritos.filter(d => !d.redimido).length

  const studentNie = estudiante?.nie ? normalizeNie(estudiante.nie) : normalizeNie(nie)

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--soft)' }}>Cargando expediente...</div>
  if (!estudiante || estudiante.error) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p>{loadError || 'Estudiante no encontrado'}</p>
        <button type="button" className="btn-outline" onClick={loadExpediente} style={{ marginTop: 12 }}>
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="expediente-header">
        <Link href="/dashboard/estudiantes" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: 'var(--soft)', textDecoration: 'none' }}>
          ← Volver
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon name="user" size={18} /> Expediente del Estudiante
        </h1>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, background: 'var(--azul)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 800, flexShrink: 0 }}>
            {estudiante.nombre_completo?.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', marginBottom: 4 }}>{estudiante.nombre_completo}</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="badge badge-blue">NIE: {estudiante.nie}</span>
              <span className="badge badge-blue">{estudiante.grado?.nivel_nombre || (estudiante.grado?.nivel ? `${estudiante.grado.nivel} Año` : '—')}</span>
              <span className="badge badge-blue">{ESPECIALIDADES[estudiante.grado?.especialidad] || estudiante.grado?.especialidad}</span>
              <span className="badge badge-blue">Sección {estudiante.grado?.seccion_letra}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--soft)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AppIcon name="phone" size={14} /> {estudiante.telefono}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AppIcon name="user" size={14} /> Responsable: {estudiante.responsable}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 20px', background: demeritosActivos >= 15 ? '#ffeaea' : demeritosActivos >= 10 ? 'var(--naranja-bg)' : demeritosActivos >= 3 ? 'var(--azul-lite)' : '#e8f9ef', borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: demeritosActivos >= 15 ? 'var(--rojo)' : demeritosActivos >= 10 ? 'var(--naranja-drk)' : demeritosActivos >= 3 ? 'var(--azul)' : 'var(--verde)' }}>
              {demeritosActivos}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--soft)' }}>Deméritos Activos</div>
          </div>
        </div>

        {demeritosActivos >= 15 && (
          <div style={{ marginTop: 16, background: '#ffeaea', border: '1px solid var(--rojo)', borderRadius: 10, padding: '10px 16px', color: 'var(--rojo)', fontWeight: 700, fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="alert" size={14} /> CRÍTICO: Este alumno NO puede ser promovido de grado (≥15 deméritos activos)</span>
          </div>
        )}
        {demeritosActivos >= 10 && demeritosActivos < 15 && (
          <div style={{ marginTop: 16, background: 'var(--naranja-bg)', border: '1px solid var(--naranja)', borderRadius: 10, padding: '10px 16px', color: 'var(--naranja-drk)', fontWeight: 600, fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="demerito" size={14} /> Suspensión de privilegios — {demeritosActivos} deméritos activos</span>
          </div>
        )}

        {loadError && (
          <div style={{ marginTop: 12, background: '#ffeaea', border: '1px solid var(--rojo)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--rojo)' }}>
            {loadError}{' '}
            <button type="button" onClick={loadExpediente} style={{ background: 'none', border: 'none', color: 'var(--rojo)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              Actualizar
            </button>
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={nuevoDemeritoPath(studentNie)} className="btn-danger" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="demerito" size={16} /> Agregar Demérito
          </Link>
          <Link href={nuevoReconocimientoPath(studentNie)} className="btn-success" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="reconocimiento" size={16} /> Agregar Reconocimiento
          </Link>
        </div>
      </div>

      <div className="tab-bar">
        {([
          { id: 'demeritos' as Tab, icon: 'demerito' as const, label: `Deméritos (${demeritos.length})` },
          { id: 'reconocimientos' as Tab, icon: 'reconocimiento' as const, label: `Reconocimientos (${reconocimientos.length})` },
          { id: 'redenciones' as Tab, icon: 'redencion' as const, label: `Redenciones (${redenciones.length})` },
        ]).map(tabItem => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`tab-btn${tab === tabItem.id ? ' active' : ''}`}
          >
            <AppIcon name={tabItem.icon} size={14} /> {tabItem.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden' }}>
        {tab === 'demeritos' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Causal</th>
                  <th>Descripción</th>
                  <th>Observación</th>
                  <th>Registrado por</th>
                  <th>Firma</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {demeritos.map(d => (
                  <tr key={d.id_demerito}>
                    <td style={{ fontSize: 12 }}>{formatDate(d.fecha)}</td>
                    <td><span className="badge badge-red">Causal {d.causal_letra}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 220 }}>{d.causal_desc}</td>
                    <td style={{ fontSize: 12, color: 'var(--soft)' }}>{d.observacion || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      {d.maestro_nombre}
                      {d.es_externo && <div style={{ fontSize: 10, color: 'var(--naranja-drk)', fontWeight: 600 }}>Docente externo</div>}
                    </td>
                    <td>
                      <span className={`badge ${d.alumno_firmo ? 'badge-green' : 'badge-gray'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {d.alumno_firmo ? <><AppIcon name="checkCircle" size={12} /> Firmó</> : 'Sin firmar'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${d.redimido ? 'badge-green' : 'badge-red'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{d.redimido ? <><AppIcon name="checkCircle" size={12} /> Redimido</> : <><AppIcon name="alert" size={12} /> Activo</>}</span>
                    </td>
                    <td>
                      {!d.redimido && (
                        <button onClick={() => setShowRedencion(d)} className="btn-success" style={{ padding: '4px 10px', fontSize: 11 }}>
                          Redimir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {demeritos.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--soft)', padding: 20 }}>Sin deméritos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'reconocimientos' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Observación</th><th>Por</th></tr>
              </thead>
              <tbody>
                {reconocimientos.map((r: any) => (
                  <tr key={r.id_reconocimiento}>
                    <td style={{ fontSize: 12 }}>{formatDate(r.fecha)}</td>
                    <td><span className="badge badge-orange">Tipo {r.tipo_letra}</span></td>
                    <td style={{ fontSize: 12 }}>{r.tipo_desc}</td>
                    <td style={{ fontSize: 12, color: 'var(--soft)' }}>{r.observacion || '—'}</td>
                    <td style={{ fontSize: 12 }}>{r.maestro_nombre}</td>
                  </tr>
                ))}
                {reconocimientos.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--soft)', padding: 20 }}>Sin reconocimientos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'redenciones' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Causal redimido</th><th>Opción</th><th>Observación</th><th>Por</th></tr>
              </thead>
              <tbody>
                {redenciones.map((r: any) => (
                  <tr key={r.id_mov}>
                    <td style={{ fontSize: 12 }}>{formatDateTime(r.fecha_hora)}</td>
                    <td>
                      <span className="badge badge-red">Causal {r.causal_letra}</span>
                      <div style={{ fontSize: 12, marginTop: 4 }}>{r.causal_desc}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <span className="badge badge-green">Opción {r.opcion_letra}</span>
                      <div style={{ marginTop: 4 }}>{r.opcion_desc}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--soft)' }}>{r.observacion || '—'}</td>
                    <td style={{ fontSize: 12 }}>{r.maestro_nombre}</td>
                  </tr>
                ))}
                {redenciones.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--soft)', padding: 20 }}>Sin redenciones registradas</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRedencion && (
        <div className="modal-overlay" onClick={() => setShowRedencion(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, marginBottom: 4, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><AppIcon name="redencion" size={18} /> Redimir Demérito</h3>
            <p style={{ color: 'var(--soft)', fontSize: 13, marginBottom: 20 }}>Causal {showRedencion.causal_letra}: {showRedencion.causal_desc}</p>
            <div style={{ marginBottom: 16 }}>
              <label>Opción de Redención (Art. 6)</label>
              <select value={opcionSelected} onChange={e => setOpcionSelected(e.target.value)}>
                <option value="">Seleccionar opción...</option>
                {opciones.map((o: any) => <option key={o.id_opcion} value={o.id_opcion}>Opción {o.letra}: {o.descripcion}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Observación adicional</label>
              <textarea rows={3} value={obsRedencion} onChange={e => setObsRedencion(e.target.value)} placeholder="Observaciones sobre la redención..." />
            </div>
            <div className="modal-actions">
              <button className="btn-success" onClick={handleRedimir} disabled={saving || !opcionSelected} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? 'Guardando...' : <><AppIcon name="checkCircle" size={16} /> Confirmar Redención</>}
              </button>
              <button className="btn-outline" onClick={() => setShowRedencion(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
