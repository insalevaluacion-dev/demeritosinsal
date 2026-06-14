import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'

export async function GET(req: NextRequest) {
  const pool = createRoutePool()
  try {
    const result = await pool.query(
      `SELECT grado_id, nivel::int AS nivel,
        CASE nivel::int WHEN 1 THEN '1 Año' WHEN 2 THEN '2 Año' WHEN 3 THEN '3 Año' END AS nivel_nombre,
        especialidad, seccion_letra, activo, anio_escolar
       FROM grados WHERE activo=true ORDER BY nivel, especialidad, seccion_letra`
    )
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
