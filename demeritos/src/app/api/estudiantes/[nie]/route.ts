import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'
import { decodeNieParam } from '@/lib/nie'

export async function GET(req: NextRequest, { params }: { params: Promise<{ nie: string }> }) {
  const pool = createRoutePool()
  try {
    const { nie: raw } = await params
    const nie = decodeNieParam(raw)
    const result = await pool.query(`
      SELECT e.*, g.nivel::int AS nivel, g.especialidad, g.seccion_letra,
        CASE g.nivel::int WHEN 1 THEN '1 Año' WHEN 2 THEN '2 Año' WHEN 3 THEN '3 Año' END AS nivel_nombre,
        t.nombre as turno_nombre
      FROM estudiantes e
      LEFT JOIN grados g ON g.grado_id=e.grado_id
      LEFT JOIN seccion s ON s.seccion_id=e.seccion_id
      LEFT JOIN turno t ON t.turno_id=s.turno_id
      WHERE REPLACE(TRIM(e.nie), ' ', '') = $1
    `, [nie])
    if (!result.rows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    const e = result.rows[0]
    return NextResponse.json({
      ...e,
      grado: {
        grado_id: e.grado_id,
        nivel: e.nivel,
        nivel_nombre: e.nivel_nombre,
        especialidad: e.especialidad,
        seccion_letra: e.seccion_letra,
      },
      seccion: { seccion_id: e.seccion_id, turno: { nombre: e.turno_nombre } }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
