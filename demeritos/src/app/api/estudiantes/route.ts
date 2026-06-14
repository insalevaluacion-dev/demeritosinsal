import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'
import { buildEstudianteSearchCondition } from '@/lib/search'
import { getRequestAuth } from '@/lib/api-auth'
import { fetchGradosOrientador } from '@/lib/orientador-maestro'

export async function GET(req: NextRequest) {
  const pool = createRoutePool()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const grado_id = searchParams.get('grado_id')
  const nivel = searchParams.get('nivel')
  const especialidad = searchParams.get('especialidad')
  const scope = searchParams.get('scope')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))
  const offset = (page - 1) * limit

  try {
    const auth = await getRequestAuth(req)
    const misGradosOnly = scope === 'mis' && auth?.rol_sesion === 'docente'

    const conditions = [
      '(e.anio_escolar >= 2026 OR e.anio_escolar IS NULL)',
      'COALESCE(e.estado, true) = true',
    ]
    const params: any[] = []

    if (misGradosOnly && auth) {
      const gradosOrientador = await fetchGradosOrientador(pool, auth.maestro_id)
      const gradoIds = gradosOrientador.map((g) => g.grado_id)
      if (gradoIds.length === 0) {
        return NextResponse.json({
          estudiantes: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
        })
      }
      params.push(gradoIds)
      conditions.push(`e.grado_id = ANY($${params.length}::int[])`)
    }
    const searchCondition = buildEstudianteSearchCondition(q, params)
    if (searchCondition) conditions.push(`(${searchCondition})`)
    if (grado_id) { params.push(parseInt(grado_id)); conditions.push(`e.grado_id=$${params.length}`) }
    if (nivel && ['1', '2', '3'].includes(nivel)) {
      params.push(parseInt(nivel))
      conditions.push(`g.nivel::int=$${params.length}`)
    }
    if (especialidad) { params.push(especialidad); conditions.push(`g.especialidad=$${params.length}`) }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const dataParams = [...params, limit, offset]

    const [dataResult, countResult] = await Promise.all([
      pool.query(`
        SELECT e.*, g.nivel::int AS nivel, g.especialidad, g.seccion_letra, g.grado_id,
          CASE g.nivel::int WHEN 1 THEN '1 Año' WHEN 2 THEN '2 Año' WHEN 3 THEN '3 Año' END AS nivel_nombre,
          t.nombre as turno_nombre
        FROM estudiantes e
        LEFT JOIN grados g ON g.grado_id=e.grado_id
        LEFT JOIN seccion s ON s.seccion_id=e.seccion_id
        LEFT JOIN turno t ON t.turno_id=s.turno_id
        ${where}
        ORDER BY e.nombre_completo
        LIMIT $${params.length+1} OFFSET $${params.length+2}
      `, dataParams),
      pool.query(`SELECT COUNT(*) FROM estudiantes e LEFT JOIN grados g ON g.grado_id=e.grado_id ${where}`, params)
    ])

    const estudiantes = dataResult.rows.map((e: any) => ({
      ...e,
      grado: {
        grado_id: e.grado_id,
        nivel: e.nivel,
        nivel_nombre: e.nivel_nombre,
        especialidad: e.especialidad,
        seccion_letra: e.seccion_letra,
      },
      seccion: { seccion_id: e.seccion_id, turno: { nombre: e.turno_nombre } }
    }))

    const total = Number(countResult.rows[0]?.count ?? 0)
    return NextResponse.json({
      estudiantes,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
