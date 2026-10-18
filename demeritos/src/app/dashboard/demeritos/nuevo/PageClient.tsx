'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { ESPECIALIDADES, labelGradoOpcion } from '@/lib/utils'
import Link from 'next/link'
import AppIcon, { type AppIconName } from '@/components/AppIcon'
import PageHero from '@/components/PageHero'
import { expedientePath, normalizeNie } from '@/lib/nie'
import { nivelAlertaDemeritos, textoProximoDemerito } from '@/lib/alerta-demerito'

export default function NuevoDemeritoPage({ preNie = '' }: { preNie?: string }) {
  const { authFetch, user } = useAuth()
  const router = useRouter()

  const [busqueda, setBusqueda] = useState(preNie)
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [estudianteSelected, setEstudianteSelected] = useState<any>(null)
  const [causales, setCausales] = useState<any[]>([])
  const [causalId, setCausalId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [alumnoFirmo, setAlumnoFirmo] = useState(false)
  const [sexoAlumno, setSexoAlumno] = useState<'M' | 'H'>('H')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [activos, setActivos] = useState<number | null>(null)
  const [contando, setContando] = useState(false)
  const [pedirConfirmacion, setPedirConfirmacion] = useState(false)

  useEffect(() => {
    authFetch('/api/causales')
      .then(r => r.json())
      .then(d => setCausales(d.causales || []))
      .catch(() => setCausales([]))
    if (preNie) {
      authFetch(`/api/estudiantes/${encodeURIComponent(preNie)}`)
        .then(r => r.json())
        .then(e => { if (!e.error) setEstudianteSelected(e) })
        .catch(() => {})
    }
  }, [authFetch, preNie])

  useEffect(() => {
    const nie = estudianteSelected?.nie
    if (!nie) {
      setActivos(null)
      setContando(false)
      setPedirConfirmacion(false)
      return
    }
    let cancel = false
    setContando(true)
    setActivos(null)
    setPedirConfirmacion(false)
    authFetch(`/api/demeritos?nie=${encodeURIComponent(normalizeNie(nie))}&limit=1`)
      .then(async (r) => {
        const data = await r.json()
        if (cancel) return
        setActivos(r.ok && typeof data.activos === 'number' ? data.activos : null)
      })
      .catch(() => {
        if (!cancel) setActivos(null)
      })
      .finally(() => {
        if (!cancel) setContando(false)
      })
    return () => { cancel = true }
  }, [estudianteSelected?.nie, authFetch])

  const proyectado = activos == null ? null : activos + 1
  const nivelProximo = proyectado == null ? 0 : nivelAlertaDemeritos(proyectado)

  const searchEstudiantes = async () => {
    if (!busqueda.trim()) return
    setSearching(true)
    setSearchError('')
    try {
      const params = new URLSearchParams({ q: busqueda.trim(), limit: '10' })
      const res = await authFetch(`/api/estudiantes?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setEstudiantes([])
        setSearchError(data.error || 'No se pudo buscar. Cierra sesión y vuelve a entrar.')
        return
      }
      setEstudiantes(data.estudiantes || [])
      if (!data.estudiantes?.length) {
        setSearchError('No se encontraron alumnos. Prueba con el NIE completo (ej. 12345678-1) o solo el nombre.')
      }
    } catch (e) {
      setEstudiantes([])
      setSearchError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setSearching(false)
    }
  }

  const registrar = async () => {
    if (!estudianteSelected || !causalId) return
    setPedirConfirmacion(false)
    setLoading(true)
    setSubmitError('')
    const causal = causales.find((c: any) => c.id_causal == causalId)
    try {
      const res = await authFetch('/api/demeritos', {
        method: 'POST',
        body: JSON.stringify({
          nie: normalizeNie(estudianteSelected.nie),
          id_causal: parseInt(causalId),
          causal_letra: causal?.letra,
          observacion,
          sexo_alumno: sexoAlumno,
          alumno_firmo: alumnoFirmo,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.error || 'No se pudo guardar el demérito en la base de datos.'
        setSubmitError(msg)
        return
      }
      setResult(data)
    } catch {
      alert('Error de conexión. Verifica que el servidor esté activo.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!estudianteSelected || !causalId || contando) return
    if (nivelProximo >= 1) {
      setPedirConfirmacion(true)
      return
    }
    void registrar()
  }

  if (result) {
    const resultIcon: AppIconName = result.nivel_alerta >= 3 ? 'alert' : result.nivel_alerta >= 2 ? 'demerito' : 'checkCircle'
    const resultBg = result.nivel_alerta >= 3 ? '#ffeaea' : result.nivel_alerta >= 2 ? 'var(--naranja-bg)' : '#e8f9ef'
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: resultBg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AppIcon name={resultIcon} size={36} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, color: 'var(--txt)' }}>
            Demérito Registrado
          </h2>
          {result.es_externo && (
            <div style={{ background: 'var(--naranja-bg)', border: '1px solid var(--naranja)', borderRadius: 10, padding: 12, margin: '12px 0', fontSize: 13, color: 'var(--naranja-drk)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="zap" size={14} /> Demérito agregado por docente externo a la sección</span>
            </div>
          )}
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 14 }}>
            <p><strong>Deméritos activos:</strong> {result.total_activos}</p>
            <p style={{ marginTop: 8 }}>
              <strong>Firma del alumno:</strong>{' '}
              {result.demerito?.alumno_firmo ? 'Sí, ya firmó' : 'No ha firmado aún'}
            </p>
            {result.nivel_alerta >= 3 && <p style={{ color: 'var(--rojo)', fontWeight: 700, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><AppIcon name="alert" size={14} /> No puede ser promovido de grado</p>}
            {result.nivel_alerta === 2 && <p style={{ color: 'var(--naranja-drk)', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><AppIcon name="demerito" size={14} /> Suspensión de privilegios</p>}
            {result.nivel_alerta === 1 && <p style={{ color: 'var(--naranja-drk)', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><AppIcon name="phone" size={14} /> Comunicar a familia</p>}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => { setResult(null); setEstudianteSelected(null); setBusqueda(''); setObservacion(''); setCausalId(''); setAlumnoFirmo(false) }} className="btn-primary">
              + Nuevo Demérito
            </button>
            <Link
              href={expedientePath(estudianteSelected?.nie || '')}
              className="btn-outline"
              style={{ textDecoration: 'none' }}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem('demeritos_refresh_expediente', String(Date.now()))
                }
              }}
            >
              Ver Expediente
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHero
        title="Registrar demérito"
        subtitle="Instrumento No. 001 — MINED El Salvador"
        hint="Elige al estudiante, la causal y guarda. Con 6 activos se avisa a la familia, con 10 hay suspensión y con 15 el alumno no puede ser promovido."
      />

      {/* Student search */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>1. Seleccionar Estudiante</h3>
        {estudianteSelected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--azul-lite)', borderRadius: 10, padding: '12px 16px' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{estudianteSelected.nombre_completo}</div>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>NIE: {estudianteSelected.nie} · {labelGradoOpcion(estudianteSelected.grado || {})}</div>
            </div>
            <button onClick={() => setEstudianteSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--soft)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Quitar estudiante"><AppIcon name="x" size={18} /></button>
          </div>
        ) : (
          <>
            <div className="search-row">
              <input
                placeholder="Buscar por nombre o NIE..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchEstudiantes()}
              />
              <button onClick={searchEstudiantes} className="btn-primary" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {searching ? '...' : <><AppIcon name="search" size={16} /> Buscar</>}
              </button>
            </div>
            {searchError && (
              <p style={{ marginTop: 8, fontSize: 13, color: 'var(--rojo)', background: '#ffeaea', padding: '10px 12px', borderRadius: 8 }}>
                {searchError}
              </p>
            )}
            {estudiantes.length > 0 && (
              <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {estudiantes.map((e: any) => (
                  <div
                    key={e.estudiante_id}
                    onClick={() => { setEstudianteSelected(e); setEstudiantes([]) }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={el => (el.currentTarget.style.background = 'var(--azul-lite)')}
                    onMouseLeave={el => (el.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.nombre_completo}</div>
                    <div style={{ fontSize: 11, color: 'var(--soft)' }}>NIE: {e.nie} · {labelGradoOpcion(e.grado || {})}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {estudianteSelected && (
          <p className={`aviso-demerito aviso-demerito--${contando ? 0 : nivelProximo}`}>
            {contando
              ? 'Revisando cuántos deméritos activos tiene…'
              : activos == null
                ? 'No se pudo contar el historial. Al guardar igual se revisa el límite.'
                : textoProximoDemerito(activos)}
          </p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>2. Seleccionar Causal (Art. 3)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {causales.map((c: any) => (
              <label
                key={c.id_causal}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  border: `2px solid ${causalId == c.id_causal ? 'var(--rojo)' : 'var(--border)'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: causalId == c.id_causal ? '#ffeaea' : '#fff',
                  transition: 'all 0.15s'
                }}
              >
                <input
                  type="radio"
                  name="causal"
                  value={c.id_causal}
                  checked={causalId == c.id_causal}
                  onChange={e => setCausalId(e.target.value)}
                  style={{ width: 'auto', marginTop: 2 }}
                />
                <div>
                  <strong style={{ color: 'var(--rojo)', fontSize: 13 }}>Causal {c.letra}</strong>
                  <div style={{ fontSize: 13, color: 'var(--txt)', marginTop: 2 }}>{c.descripcion}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>3. Sexo del alumno</h3>
          <p style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 10 }}>
            M = Mujer · H = Hombre (se usa en los reportes oficiales)
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="sexoAlumno"
                checked={sexoAlumno === 'M'}
                onChange={() => setSexoAlumno('M')}
              />
              Mujer (M)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="sexoAlumno"
                checked={sexoAlumno === 'H'}
                onChange={() => setSexoAlumno('H')}
              />
              Hombre (H)
            </label>
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>4. Firma del alumno</h3>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 16px',
              border: `2px solid ${alumnoFirmo ? 'var(--verde)' : 'var(--border)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              background: alumnoFirmo ? '#e8f9ef' : '#fff',
            }}
          >
            <input
              type="checkbox"
              checked={alumnoFirmo}
              onChange={e => setAlumnoFirmo(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--verde)' }}
            />
            <div>
              <strong style={{ fontSize: 13, color: 'var(--txt)' }}>El alumno ya firmó el documento del demérito</strong>
              <div style={{ fontSize: 12, color: 'var(--soft)', marginTop: 4 }}>
                Marca esta casilla solo si el estudiante ya firmó. Si no está marcada, el demérito quedará registrado como <strong>sin firma</strong>.
              </div>
            </div>
          </label>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>5. Observación (Opcional)</h3>
          <textarea
            rows={3}
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            placeholder="Describir la situación con detalle..."
          />
        </div>

        {submitError && (
          <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--rojo)', background: '#ffeaea', padding: '10px 12px', borderRadius: 8 }}>
            {submitError}
          </p>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn-danger"
            disabled={!estudianteSelected || !causalId || loading || contando}
            style={{ flex: 1, justifyContent: 'center', padding: 14, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {loading ? 'Registrando...' : contando ? 'Revisando…' : <><AppIcon name="demerito" size={16} /> Registrar Demérito</>}
          </button>
          <Link href="/dashboard/estudiantes" className="btn-outline" style={{ textDecoration: 'none', padding: '14px 20px' }}>
            Cancelar
          </Link>
        </div>
      </form>

      {pedirConfirmacion && proyectado != null && (
        <div className="modal-overlay" onClick={() => setPedirConfirmacion(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, marginBottom: 8, fontSize: 16 }}>
              {nivelProximo >= 3 ? 'No puede ser promovido' : nivelProximo === 2 ? 'Suspensión de privilegios' : 'Avisar a la familia'}
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.45, marginBottom: 8 }}>
              {estudianteSelected?.nombre_completo} pasará de {activos} a {proyectado} deméritos activos.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--soft)', marginBottom: 20 }}>
              {textoProximoDemerito(activos ?? 0)}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-danger" onClick={() => void registrar()} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Registrando...' : 'Registrar de todos modos'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setPedirConfirmacion(false)}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
