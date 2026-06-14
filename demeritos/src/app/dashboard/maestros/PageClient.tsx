'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ROLES_DISPLAY } from '@/lib/utils'
import AppIcon from '@/components/AppIcon'

export default function MaestrosPage() {
  const { authFetch, sessionRole } = useAuth()
  const [maestros, setMaestros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const puedeVerContrasenas = sessionRole === 'director' || sessionRole === 'subdirector' || sessionRole === 'coordinador'

  useEffect(() => {
    authFetch('/api/maestros')
      .then(async (r) => {
        const d = await r.json()
        setMaestros(r.ok && Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => {
        setMaestros([])
        setLoading(false)
      })
  }, [authFetch])

  const maestroList = Array.isArray(maestros) ? maestros : []
  const filtered = maestroList.filter(m =>
    m.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon name="maestros" size={20} /> Personal Docente
        </h1>
        <p style={{ color: 'var(--soft)', fontSize: 13, marginTop: 2 }}>{maestroList.length} docentes registrados</p>
      </div>

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
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any) => (
                  <tr key={m.maestro_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: 'var(--azul)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {m.nombre.charAt(0)}
                        </div>
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
                      <span className={`badge ${m.rol?.nombre === 'director' ? 'badge-orange' : m.rol?.nombre === 'administrador' ? 'badge-blue' : 'badge-gray'}`}>
                        {ROLES_DISPLAY[m.rol?.nombre] || m.rol?.nombre}
                      </span>
                    </td>
                    <td><span className={`badge ${m.activo ? 'badge-green' : 'badge-gray'}`}>{m.activo ? 'Activo' : 'Inactivo'}</span></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={puedeVerContrasenas ? 7 : 6} style={{ textAlign: 'center', color: 'var(--soft)', padding: 24 }}>
                      No se encontraron docentes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
