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
    const result = await pool.query(
      `
      SELECT m.*, o.descripcion as opcion_desc, d.causal_letra, c.descripcion as causal_desc,
        ma.nombre as maestro_nombre, e.nombre_completo as alumno_nombre
      FROM movimientos_redencion m
      LEFT JOIN opciones_redencion o ON o.id_opcion = m.id_opcion
      LEFT JOIN demeritos d ON d.id_demerito = m.id_demerito
      LEFT JOIN causales_demerito c ON c.id_causal = d.id_causal
      LEFT JOIN maestros ma ON ma.maestro_id = m.id_maestro
      LEFT JOIN estudiantes e ON e.nie = m.nie
      ${nie ? "WHERE REPLACE(TRIM(m.nie), ' ', '') = $1" : ''}
      ORDER BY m.fecha_hora DESC
      LIMIT 100
      `,
      nie ? [nie] : []
    )
    return NextResponse.json(result.rows)
  } catch (e) {
    console.error(e)
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
  const client = await pool.connect()
  try {
    const { nie, id_demerito, id_opcion, opcion_letra, observacion } = await req.json()
    await client.query('BEGIN')
    const movResult = await client.query(`
      INSERT INTO movimientos_redencion (nie, id_demerito, id_opcion, opcion_letra, id_maestro, observacion)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [nie, id_demerito, id_opcion, opcion_letra, payload.maestro_id, observacion])

    await client.query(`
      UPDATE demeritos SET redimido=true, fecha_redencion=NOW(), id_mov_redencion=$1
      WHERE id_demerito=$2
    `, [movResult.rows[0].id_mov, id_demerito])

    const estResult = await client.query(`SELECT nombre_completo FROM estudiantes WHERE nie=$1`, [nie])
    const nombre = estResult.rows[0]?.nombre_completo || nie

    await client.query(`
      INSERT INTO notificaciones (nie, tipo, nivel_alerta, titulo, mensaje)
      VALUES ($1,'redencion',0,$2,$3)
    `, [nie, 'Demérito Redimido', `${nombre} | Opción ${opcion_letra} | Por: ${payload.nombre}`])

    await client.query('COMMIT')
    return NextResponse.json(movResult.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
  }
}
