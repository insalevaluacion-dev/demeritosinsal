import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const pool = createRoutePool()
  try {
    const result = await pool.query(`
      SELECT n.*, e.nombre_completo as alumno_nombre, g.nivel, g.especialidad, g.seccion_letra
      FROM notificaciones n
      LEFT JOIN estudiantes e ON e.nie=n.nie
      LEFT JOIN grados g ON g.grado_id=e.grado_id
      ORDER BY n.fecha_hora DESC LIMIT 50
    `)
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}

export async function PATCH(req: NextRequest) {
  const pool = createRoutePool()
  try {
    const { id_notif } = await req.json()
    await pool.query(`UPDATE notificaciones SET leida=true WHERE id_notif=$1`, [id_notif])
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
