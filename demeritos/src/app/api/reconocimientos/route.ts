import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createRoutePool } from '@/lib/db'
import { normalizeNie } from '@/lib/nie'

export async function GET(req: NextRequest) {
  const pool = createRoutePool()
  const { searchParams } = new URL(req.url)
  const nieRaw = searchParams.get('nie')
  const nie = nieRaw ? normalizeNie(nieRaw) : null
  try {
    const result = await pool.query(`
      SELECT r.*, t.descripcion as tipo_desc, m.nombre as maestro_nombre,
        e.nombre_completo as alumno_nombre
      FROM reconocimientos r
      LEFT JOIN tipos_reconocimiento t ON t.id_tipo=r.id_tipo
      LEFT JOIN maestros m ON m.maestro_id=r.id_maestro
      LEFT JOIN estudiantes e ON e.nie=r.nie
      ${nie ? "WHERE REPLACE(TRIM(r.nie), ' ', '')=$1" : ''}
      ORDER BY r.creado_en DESC LIMIT 100
    `, nie ? [nie] : [])
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.slice(7)
  const payload = verifyToken(auth || '') as any
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const pool = createRoutePool()
  try {
    const { nie, id_tipo, tipo_letra, observacion, sexo_alumno } = await req.json()
    const result = await pool.query(`
      INSERT INTO reconocimientos (nie, id_tipo, tipo_letra, id_maestro, observacion, sexo_alumno)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [nie, id_tipo, tipo_letra, payload.maestro_id, observacion, sexo_alumno])

    const estResult = await pool.query(`SELECT nombre_completo FROM estudiantes WHERE nie=$1`, [nie])
    const nombre = estResult.rows[0]?.nombre_completo || nie

    await pool.query(`
      INSERT INTO notificaciones (nie, tipo, nivel_alerta, titulo, mensaje)
      VALUES ($1,'reconocimiento',0,$2,$3)
    `, [nie, 'Nuevo Reconocimiento', `${nombre} | Tipo ${tipo_letra} | Por: ${payload.nombre}`])

    return NextResponse.json(result.rows[0])
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
