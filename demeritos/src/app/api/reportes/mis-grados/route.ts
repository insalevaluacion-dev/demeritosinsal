import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'
import { getRequestAuth } from '@/lib/api-auth'
import { fetchGradosMaestro } from '@/lib/instrumento-002-queries'
import { isInstitucionalRole } from '@/lib/report-permissions'

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const pool = createRoutePool()
  try {
    if (isInstitucionalRole(auth.rol_sesion)) {
      const all = await pool.query(
        `SELECT grado_id, nivel, nivel_nombre, especialidad, seccion_letra
         FROM grados WHERE activo = true ORDER BY nivel, especialidad, seccion_letra`
      )
      return NextResponse.json({ grados: all.rows, institucional: true })
    }

    const grados = await fetchGradosMaestro(pool, auth.maestro_id)
    return NextResponse.json({ grados, institucional: false })
  } catch (e) {
    console.error('[mis-grados]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
