import { NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'

export async function GET() {
  const pool = createRoutePool()
  try {
    const [causales, opciones, tipos] = await Promise.all([
      pool.query('SELECT * FROM causales_demerito WHERE activo=true ORDER BY letra'),
      pool.query('SELECT * FROM opciones_redencion WHERE activo=true ORDER BY letra'),
      pool.query('SELECT * FROM tipos_reconocimiento WHERE activo=true ORDER BY letra'),
    ])
    return NextResponse.json({ causales: causales.rows, opciones: opciones.rows, tipos: tipos.rows })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
