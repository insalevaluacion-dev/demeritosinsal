'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { labelGradoOpcion } from '@/lib/utils'
import { ANIO_ESCOLAR } from '@/lib/anio-escolar'
import { MESES_NOMBRE } from '@/lib/report-queries'
import type { Instrumento002Header, Instrumento002Payload } from '@/lib/instrumento-002-types'
import AppIcon from '@/components/AppIcon'

const INSTITUCIONAL = new Set(['director', 'coordinador', 'subdirector'])
const MESES_OPTS = MESES_NOMBRE.map((label, i) => ({ value: i + 1, label }))
const ANIOS_OPTS = [ANIO_ESCOLAR - 1, ANIO_ESCOLAR, ANIO_ESCOLAR + 1]

const HEADER_FIELDS: { key: keyof Instrumento002Header; label: string }[] = [
  { key: 'centroEducativo', label: 'Centro Educativo' },
  { key: 'codigoCE', label: 'Código C.E.' },
  { key: 'departamento', label: 'Departamento' },
  { key: 'municipio', label: 'Municipio' },
  { key: 'distrito', label: 'Distrito' },
  { key: 'docente', label: 'Nombre del Docente' },
  { key: 'mesAnio', label: 'Mes/Año' },
  { key: 'grado', label: 'Grado' },
  { key: 'seccion', label: 'Sección' },
  { key: 'turno', label: 'Turno' },
]

export default function ReportesPage() {
  const { authFetch, user, sessionRole } = useAuth()
  const esInstitucional = INSTITUCIONAL.has(sessionRole ?? '')

  const [grados, setGrados] = useState<any[]>([])
  const [, setInstitucional] = useState(false)
  const [alcance, setAlcance] = useState<'grado' | 'institucion'>('grado')
  const [gradoId, setGradoId] = useState('')
  const [periodo, setPeriodo] = useState<'mensual' | 'anual'>('mensual')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(ANIO_ESCOLAR)
  const [header, setHeader] = useState<Instrumento002Header | null>(null)
  const [reporte, setReporte] = useState<Instrumento002Payload | null>(null)
  const [loadingGrados, setLoadingGrados] = useState(true)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    authFetch('/api/reportes/mis-grados')
      .then(async (r) => {
        const d = await r.json()
        if (r.ok) {
          setGrados(d.grados || [])
          setInstitucional(Boolean(d.institucional))
          if (d.grados?.[0] && !d.institucional) setGradoId(String(d.grados[0].grado_id))
        }
        setLoadingGrados(false)
      })
      .catch(() => setLoadingGrados(false))
  }, [authFetch])

  const cargarReporte = async () => {
    setError('')
    setLoadingReporte(true)
    setReporte(null)
    try {
      const p = new URLSearchParams({
        periodo,
        alcance: esInstitucional && alcance === 'institucion' ? 'institucion' : 'grado',
        mes: String(mes),
        anio: String(anio),
        docente: user?.nombre || 'Docente INSAL',
      })
      if (alcance === 'grado' || !esInstitucional) {
        if (!gradoId) {
          setError('Seleccione un grado')
          setLoadingReporte(false)
          return
        }
        p.set('grado_id', gradoId)
      }
      const res = await authFetch(`/api/reportes/instrumento-002?${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar reporte')
      setReporte(data)
      setHeader(data.header)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoadingReporte(false)
    }
  }

  const confirmarHeader = () => {
    if (reporte && header) {
      setReporte({ ...reporte, header })
    }
  }

  const descargarExcel = async () => {
    if (!reporte || !header) return
    setExporting(true)
    setError('')
    try {
      const res = await authFetch('/api/reportes/instrumento-002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: reporte, header }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al exportar')
      }
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `INSAL_Instrumento002_${periodo}_${anio}.xlsx`
      a.click()
      URL.revokeObjectURL(href)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  if (loadingGrados) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--soft)' }}>
        Cargando opciones de reporte…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon name="reportes" size={22} />
          Instrumento No. 002 — Reportes oficiales
        </h1>
        <p style={{ color: 'var(--soft)', fontSize: 13, marginTop: 4 }}>
          Registro consolidado de deméritos, redenciones y reconocimientos — datos desde la base de datos INSAL
        </p>
      </header>

      {/* Paso 1: Alcance y grado */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>1. {esInstitucional ? 'Alcance del reporte' : 'Grado del maestro'}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          {esInstitucional && (
            <div>
              <label>Alcance</label>
              <select
                value={alcance}
                onChange={(e) => setAlcance(e.target.value as 'grado' | 'institucion')}
                className="filter-select filter-select--md"
              >
                <option value="grado">Grado específico</option>
                <option value="institucion">Toda la institución</option>
              </select>
            </div>
          )}
          {(alcance === 'grado' || !esInstitucional) && (
            <div>
              <label>Grado</label>
              <select value={gradoId} onChange={(e) => setGradoId(e.target.value)} className="filter-select filter-select--lg">
                <option value="">— Seleccione —</option>
                {grados.map((g: any) => (
                  <option key={g.grado_id} value={g.grado_id}>
                    {labelGradoOpcion(g)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Paso 2: Período */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>2. Tipo de reporte</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="radio" checked={periodo === 'mensual'} onChange={() => setPeriodo('mensual')} />
            Mensual
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="radio" checked={periodo === 'anual'} onChange={() => setPeriodo('anual')} />
            Anual
          </label>
          {periodo === 'mensual' && (
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={{ width: 140 }}>
              {MESES_OPTS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ width: 100 }}>
            {ANIOS_OPTS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Paso 3: Cargar */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>3. Cargar reporte</h2>
        <button
          type="button"
          className="btn-primary"
          onClick={cargarReporte}
          disabled={loadingReporte}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <AppIcon name="clipboard" size={16} />
          {loadingReporte ? 'Extrayendo datos…' : 'Cargar datos desde la base de datos'}
        </button>
        <p style={{ fontSize: 12, color: 'var(--soft)', marginTop: 10 }}>
          M = Mujer · H = Hombre. La matrícula muestra el total de alumnos activos del grado (o de toda la institución) divididos por sexo; el total es mujeres + hombres.
        </p>
      </div>

      {error && (
        <div style={{ background: '#ffeaea', color: 'var(--rojo)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {reporte && header && (
        <>
          {/* Paso 4: Cabecera editable + vista previa */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>4. Vista previa — cabecera (editable)</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
                marginBottom: 20,
                background: '#f1f5f9',
                padding: 16,
                borderRadius: 8,
              }}
            >
              {HEADER_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>{label}</label>
                  <input
                    value={header[key]}
                    onChange={(e) => setHeader({ ...header, [key]: e.target.value })}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Tabla consolidada (solo lectura — desde BD)</h3>
            <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Mat. M</th>
                    <th>Mat. H</th>
                    <th>Mat. Total</th>
                    <th>Dem. M</th>
                    <th>Dem. H</th>
                    <th>C.A</th>
                    <th>C.B</th>
                    <th>C.C</th>
                    <th>C.D</th>
                    <th>Red. M</th>
                    <th>Red. H</th>
                    <th>Rec. M</th>
                    <th>Rec. H</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.filas.map((f) => (
                    <tr key={f.mesNum}>
                      <td>{f.mes}</td>
                      <td>{f.matriculaM}</td>
                      <td>{f.matriculaH}</td>
                      <td>{f.matriculaM + f.matriculaH}</td>
                      <td>{f.demeritosM}</td>
                      <td>{f.demeritosH}</td>
                      <td>{f.causalA}</td>
                      <td>{f.causalB}</td>
                      <td>{f.causalC}</td>
                      <td>{f.causalD}</td>
                      <td>{f.redencionM}</td>
                      <td>{f.redencionH}</td>
                      <td>{f.reconocimientoM}</td>
                      <td>{f.reconocimientoH}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 800, background: 'var(--azul-lite)' }}>
                    <td>TOTAL</td>
                    <td>{reporte.totales.matriculaM}</td>
                    <td>{reporte.totales.matriculaH}</td>
                    <td>{reporte.totales.matriculaM + reporte.totales.matriculaH}</td>
                    <td>{reporte.totales.demeritosM}</td>
                    <td>{reporte.totales.demeritosH}</td>
                    <td>{reporte.totales.causalA}</td>
                    <td>{reporte.totales.causalB}</td>
                    <td>{reporte.totales.causalC}</td>
                    <td>{reporte.totales.causalD}</td>
                    <td>{reporte.totales.redencionM}</td>
                    <td>{reporte.totales.redencionH}</td>
                    <td>{reporte.totales.reconocimientoM}</td>
                    <td>{reporte.totales.reconocimientoH}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '20px 0 10px' }}>
              Num. Redenciones por opción elegida
            </h3>
            <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8, maxWidth: 420 }}>
              <table>
                <thead>
                  <tr>
                    <th>Opción A</th>
                    <th>Opción B</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{reporte.resumen.redencionesOpcion.A}</td>
                    <td>{reporte.resumen.redencionesOpcion.B}</td>
                    <td style={{ fontWeight: 800 }}>
                      {reporte.resumen.redencionesOpcion.A + reporte.resumen.redencionesOpcion.B}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
              <strong>Resumen del período</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Alumnos en el grado: {reporte.resumen.alumnosM} mujeres / {reporte.resumen.alumnosH} hombres — Total {reporte.resumen.alumnosTotal}</li>
                <li>Deméritos por causal: A={reporte.resumen.demeritosCausal.A}, B={reporte.resumen.demeritosCausal.B}, C={reporte.resumen.demeritosCausal.C}, D={reporte.resumen.demeritosCausal.D}</li>
                <li>Deméritos por sexo: M={reporte.resumen.demeritosSexo.M}, H={reporte.resumen.demeritosSexo.H}</li>
                <li>Redenciones por opción: A={reporte.resumen.redencionesOpcion.A}, B={reporte.resumen.redencionesOpcion.B}, Total={reporte.resumen.redencionesOpcion.A + reporte.resumen.redencionesOpcion.B}</li>
                <li>Redenciones por sexo: M={reporte.resumen.redencionesSexo.M}, H={reporte.resumen.redencionesSexo.H}</li>
                <li>Reconocimientos: M={reporte.resumen.reconocimientosSexo.M}, H={reporte.resumen.reconocimientosSexo.H}</li>
                <li><strong>Total general: {reporte.resumen.totalGeneral}</strong></li>
              </ul>
            </div>
          </div>

          {/* Paso 5 */}
          <div className="card" style={{ padding: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" style={{ background: 'var(--azul-med)' }} onClick={confirmarHeader}>
              Confirmar cambios de cabecera
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ background: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={descargarExcel}
              disabled={exporting}
            >
              <AppIcon name="download" size={16} />
              {exporting ? 'Generando Excel…' : 'Descargar reporte Excel (.xlsx)'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
