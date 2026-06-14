import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'
import { getRequestAuth } from '@/lib/api-auth'
import { ensureContrasenaPlanaColumn } from '@/lib/ensure-contrasena-plana'
import { isInstitucionalRole } from '@/lib/report-permissions'

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const verContrasenas = isInstitucionalRole(auth.rol_sesion)

  const pool = createRoutePool()
  try {
    await ensureContrasenaPlanaColumn()
    const result = await pool.query(`
      SELECT m.maestro_id, m.nombre, m.email, m.contrasena_plana, m.activo,
        r.nombre as rol_nombre, t.nombre as turno_nombre, mat.nombre_materia as materia_nombre,
        m.rol_sesion
      FROM maestros m
      LEFT JOIN roles r ON r.rol_id=m.rol_id
      LEFT JOIN turno t ON t.turno_id=m.turno_id
      LEFT JOIN principal.materia mat ON mat.materia_id=m.materia_id
      WHERE m.activo=true ORDER BY m.nombre
    `)
    return NextResponse.json(result.rows.map((m: Record<string, unknown>) => ({
      maestro_id: m.maestro_id,
      nombre: m.nombre,
      email: m.email,
      activo: m.activo,
      rol_sesion: m.rol_sesion,
      contrasena_plana: verContrasenas ? (m.contrasena_plana || null) : undefined,
      rol: { nombre: m.rol_nombre },
      turno: { nombre: m.turno_nombre },
      materia: { nombre: m.materia_nombre },
    })))
  } catch (e) {
    console.error('[maestros]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
