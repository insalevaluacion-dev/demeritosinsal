'use client'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ROLES_DISPLAY } from '@/lib/utils'
import { ALL_SESSION_ROLES, isSessionRoleId, SESSION_ROLE_LABELS, type SessionRoleId } from '@/lib/session-roles'
import { inferirSexoDesdeNombre } from '@/lib/sexo-alumno'
import PageHero from '@/components/PageHero'
import PerfilAvatar from '@/components/PerfilAvatar'

type Catalogo = {
  materias: { materia_id: number; nombre_materia: string }[]
  turnos: { turno_id: number; nombre: string }[]
}

type FormAlta = {
  nombre: string
  email: string
  password: string
  rol_sesion: SessionRoleId
  materia_id: string
  turno_id: string
  avatar_sexo: 'M' | 'H'
}

const FORM_VACIO: FormAlta = {
  nombre: '',
  email: '',
  password: '',
  rol_sesion: 'docente',
  materia_id: '',
  turno_id: '',
  avatar_sexo: 'H',
}

function rolIcono(m: { rol_sesion?: string | null; rol?: { nombre?: string } }) {
  if (m.rol_sesion && isSessionRoleId(m.rol_sesion)) return m.rol_sesion
  const raw = String(m.rol?.nombre || '').toLowerCase()
  if (raw === 'director') return 'director'
  if (raw === 'administrador') return 'coordinador'
  return 'docente'
}

function etiquetaRol(m: { rol_sesion?: string | null; rol?: { nombre?: string } }) {
  if (m.rol_sesion && isSessionRoleId(m.rol_sesion)) return SESSION_ROLE_LABELS[m.rol_sesion]
  const raw = String(m.rol?.nombre || '').toLowerCase()
  return ROLES_DISPLAY[raw] || m.rol?.nombre || '—'
}

export default function MaestrosPage() {
  const { authFetch, sessionRole, user } = useAuth()
  const [maestros, setMaestros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [opciones, setOpciones] = useState<Catalogo>({ materias: [], turnos: [] })
  const [modal, setModal] = useState<null | 'nuevo' | 'editar'>(null)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState<FormAlta>(FORM_VACIO)
  const [sexoManual, setSexoManual] = useState(false)
  const [formError, setFormError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [baja, setBaja] = useState<any>(null)
  const puedeVerContrasenas = sessionRole === 'director' || sessionRole === 'subdirector' || sessionRole === 'coordinador'
  const puedeGestionar = sessionRole === 'director' || sessionRole === 'subdirector'

  const cargar = useCallback(async () => {
    const r = await authFetch('/api/maestros?todos=1')
    const d = await r.json()
    setMaestros(r.ok && Array.isArray(d) ? d : [])
  }, [authFetch])

  useEffect(() => {
    cargar()
      .catch(() => setMaestros([]))
      .finally(() => setLoading(false))
  }, [cargar])

  useEffect(() => {
    if (!puedeGestionar) return
    authFetch('/api/maestros/opciones')
      .then(async (r) => {
        const d = await r.json()
        if (r.ok) setOpciones({ materias: d.materias || [], turnos: d.turnos || [] })
      })
      .catch(() => {})
  }, [authFetch, puedeGestionar])

  const maestroList = Array.isArray(maestros) ? maestros : []
  const activos = maestroList.filter((m) => m.activo).length
  const filtered = maestroList.filter(m =>
    m.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(q.toLowerCase())
  )
  const columnas = (puedeVerContrasenas ? 7 : 6) + (puedeGestionar ? 1 : 0)

  const abrirNuevo = () => {
    setEditando(null)
    setForm(FORM_VACIO)
    setSexoManual(false)
    setFormError('')
    setModal('nuevo')
  }

  const abrirEditar = (m: any) => {
    const rol = m.rol_sesion && isSessionRoleId(m.rol_sesion) ? m.rol_sesion : 'docente'
    setEditando(m)
    setForm({
      nombre: m.nombre || '',
      email: m.email || '',
      password: '',
      rol_sesion: rol,
      materia_id: m.materia_id ? String(m.materia_id) : '',
      turno_id: m.turno_id ? String(m.turno_id) : '',
      avatar_sexo: m.avatar_sexo === 'M' || m.avatar_sexo === 'H' ? m.avatar_sexo : inferirSexoDesdeNombre(m.nombre || ''),
    })
    setSexoManual(true)
    setFormError('')
    setModal('editar')
  }

  const cambiarNombre = (nombre: string) => {
    setForm((f) => ({
      ...f,
      nombre,
      avatar_sexo: sexoManual ? f.avatar_sexo : inferirSexoDesdeNombre(nombre),
    }))
  }

  const guardar = async () => {
    setGuardando(true)
    setFormError('')
    try {
      const comun = {
        nombre: form.nombre,
        rol_sesion: form.rol_sesion,
        materia_id: form.materia_id || null,
        turno_id: form.turno_id || null,
        avatar_sexo: form.avatar_sexo,
      }
      const res = modal === 'nuevo'
        ? await authFetch('/api/maestros', {
            method: 'POST',
            body: JSON.stringify({ ...comun, email: form.email, password: form.password }),
          })
        : await authFetch('/api/maestros', {
            method: 'PATCH',
            body: JSON.stringify({ ...comun, maestro_id: editando?.maestro_id }),
          })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'No se pudo guardar')
        return
      }
      setModal(null)
      await cargar()
    } catch {
      setFormError('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async () => {
    if (!baja) return
    setGuardando(true)
    try {
      const res = await authFetch('/api/maestros', {
        method: 'PATCH',
        body: JSON.stringify({ maestro_id: baja.maestro_id, activo: !baja.activo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'No se pudo cambiar el estado')
        return
      }
      setBaja(null)
      await cargar()
    } catch {
      setFormError('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <PageHero
        title="Personal docente"
        subtitle={loading ? 'Cargando el personal…' : `${activos} activos · ${maestroList.length} en total`}
        hint="Dirección crea el correo, asigna materia y turno, y desactiva a quien ya no está. La contraseña solo la ve dirección."
      >
        {puedeGestionar && (
          <button type="button" className="btn-primary" onClick={abrirNuevo}>Nuevo docente</button>
        )}
      </PageHero>

      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <input placeholder="Buscar por nombre o correo..." value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 340 }} />
        {puedeVerContrasenas && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--soft)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showPasswords} onChange={e => setShowPasswords(e.target.checked)} />
            Mostrar contraseñas
          </label>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--soft)' }}>Cargando...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Correo</th>
                  {puedeVerContrasenas && <th>Contraseña</th>}
                  <th>Materia</th>
                  <th>Turno</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  {puedeGestionar && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any) => {
                  const sexo = m.avatar_sexo === 'M' || m.avatar_sexo === 'H'
                    ? m.avatar_sexo
                    : inferirSexoDesdeNombre(m.nombre || '')
                  const esYo = m.maestro_id === user?.maestro_id
                  return (
                    <tr key={m.maestro_id} style={m.activo ? undefined : { opacity: 0.62 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <PerfilAvatar rol={rolIcono(m)} sexo={sexo} size={34} />
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.nombre}</div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--soft)' }}>{m.email || '—'}</td>
                      {puedeVerContrasenas && (
                        <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--txt)' }}>
                          {showPasswords
                            ? (m.contrasena_plana || '— (inicie sesión una vez para guardarla)')
                            : '••••••••'}
                        </td>
                      )}
                      <td style={{ fontSize: 13 }}>{m.materia?.nombre || '—'}</td>
                      <td style={{ fontSize: 13 }}>{m.turno?.nombre || '—'}</td>
                      <td>
                        <span className={`badge ${rolIcono(m) === 'director' ? 'badge-orange' : rolIcono(m) === 'docente' ? 'badge-gray' : 'badge-blue'}`}>
                          {etiquetaRol(m)}
                        </span>
                      </td>
                      <td><span className={`badge ${m.activo ? 'badge-green' : 'badge-gray'}`}>{m.activo ? 'Activo' : 'Inactivo'}</span></td>
                      {puedeGestionar && (
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="btn-outline" style={{ padding: '6px 10px' }} onClick={() => abrirEditar(m)}>Editar</button>
                            {!esYo && (
                              <button type="button" className="btn-outline" style={{ padding: '6px 10px' }} onClick={() => { setFormError(''); setBaja(m) }}>
                                {m.activo ? 'Desactivar' : 'Activar'}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={columnas} style={{ textAlign: 'center', color: 'var(--soft)', padding: 24 }}>
                      No se encontraron docentes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => !guardando && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, marginBottom: 14, fontSize: 16 }}>
              {modal === 'nuevo' ? 'Nuevo docente' : 'Editar docente'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>Nombre</label>
                <input value={form.nombre} onChange={e => cambiarNombre(e.target.value)} placeholder="Nombre completo" />
              </div>
              {modal === 'nuevo' && (
                <>
                  <div>
                    <label>Correo</label>
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nombre@clases.edu.sv" autoComplete="off" />
                  </div>
                  <div>
                    <label>Contraseña</label>
                    <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="La que usará para entrar" autoComplete="new-password" />
                  </div>
                </>
              )}
              <div>
                <label>Rol</label>
                <select value={form.rol_sesion} onChange={e => setForm({ ...form, rol_sesion: e.target.value as SessionRoleId })}>
                  {ALL_SESSION_ROLES.map((rol) => (
                    <option key={rol} value={rol}>{SESSION_ROLE_LABELS[rol]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Materia</label>
                <select value={form.materia_id} onChange={e => setForm({ ...form, materia_id: e.target.value })}>
                  <option value="">Sin materia</option>
                  {opciones.materias.map((m) => (
                    <option key={m.materia_id} value={m.materia_id}>{m.nombre_materia}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Turno</label>
                <select value={form.turno_id} onChange={e => setForm({ ...form, turno_id: e.target.value })}>
                  <option value="">Sin turno</option>
                  {opciones.turnos.map((t) => (
                    <option key={t.turno_id} value={t.turno_id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Icono de perfil</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  {(['M', 'H'] as const).map((sexo) => (
                    <label key={sexo} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="avatar_sexo"
                        checked={form.avatar_sexo === sexo}
                        onChange={() => { setSexoManual(true); setForm({ ...form, avatar_sexo: sexo }) }}
                      />
                      <PerfilAvatar rol={form.rol_sesion} sexo={sexo} size={32} />
                      {sexo === 'M' ? 'Mujer' : 'Hombre'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {formError && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--rojo)', background: '#ffeaea', padding: '10px 12px', borderRadius: 8 }}>{formError}</p>
            )}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn-primary" onClick={() => void guardar()} disabled={guardando} style={{ flex: 1 }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setModal(null)} disabled={guardando}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {baja && (
        <div className="modal-overlay" onClick={() => !guardando && setBaja(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, marginBottom: 8, fontSize: 16 }}>
              {baja.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.45, marginBottom: 16 }}>
              {baja.activo
                ? `${baja.nombre} ya no podrá iniciar sesión.`
                : `${baja.nombre} podrá volver a entrar con su correo.`}
            </p>
            {formError && (
              <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--rojo)' }}>{formError}</p>
            )}
            <div className="modal-actions">
              <button type="button" className={baja.activo ? 'btn-danger' : 'btn-primary'} onClick={() => void cambiarEstado()} disabled={guardando} style={{ flex: 1 }}>
                {guardando ? 'Guardando...' : baja.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setBaja(null)} disabled={guardando}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
