import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'
import { getRequestAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (auth.rol_sesion !== 'director' && auth.rol_sesion !== 'subdirector') {
    return NextResponse.json({ error: 'Solo dirección' }, { status: 403 })
  }

  const pool = createRoutePool()
  try {
    const [materias, turnos] = await Promise.all([
      pool.query(`SELECT materia_id, nombre_materia FROM principal.materias ORDER BY nombre_materia`),
      pool.query(`SELECT turno_id, nombre FROM principal.turnos ORDER BY turno_id`),
    ])
    return NextResponse.json({ materias: materias.rows, turnos: turnos.rows })
  } catch (e) {
    console.error('[maestros opciones]', e)
    return NextResponse.json({ error: 'No se pudieron cargar materia y turno' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
