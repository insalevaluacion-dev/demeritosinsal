import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createRoutePool } from '@/lib/db'
import {
  asignarGradoOrientador,
  declinarOrientador,
  fetchGradosOrientador,
  maestroRespondioOrientador,
  maestroTieneOrientador,
} from '@/lib/orientador-maestro'
import { fetchRolSesion } from '@/lib/maestro-rol-sesion'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')?.slice(7) || ''
  const payload = verifyToken(auth) as { maestro_id?: number } | null
  if (!payload?.maestro_id) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  const pool = createRoutePool()
  try {
    const grados = await fetchGradosOrientador(pool, payload.maestro_id)
    const orientadorRespondido = await maestroRespondioOrientador(pool, payload.maestro_id)
    return NextResponse.json({
      tieneOrientador: grados.length > 0,
      orientadorRespondido,
      grados,
    })
  } catch (e) {
    console.error('[auth/orientador GET]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')?.slice(7) || ''
    const payload = verifyToken(auth) as { maestro_id?: number } | null
    if (!payload?.maestro_id) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const rolSesion = await fetchRolSesion(payload.maestro_id)
    if (rolSesion !== 'docente') {
      return NextResponse.json({ error: 'Solo los maestros deben elegir grado de orientación' }, { status: 403 })
    }

    const body = await req.json()

    if (body.no_soy === true || body.declinar === true) {
      const result = await declinarOrientador(payload.maestro_id)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 409 })
      }
      return NextResponse.json({ ok: true, declinado: true })
    }

    const grado_id = parseInt(String(body.grado_id ?? ''), 10)
    if (!grado_id || Number.isNaN(grado_id)) {
      return NextResponse.json({ error: 'Selecciona un grado válido' }, { status: 400 })
    }

    const result = await asignarGradoOrientador(payload.maestro_id, grado_id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    const pool = createRoutePool()
    try {
      await queryDeclinarReset(pool, payload.maestro_id)
    } finally {
      await pool.end()
    }

    return NextResponse.json({ ok: true, grado_id })
  } catch (e) {
    console.error('[auth/orientador POST]', e)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}

async function queryDeclinarReset(pool: ReturnType<typeof createRoutePool>, maestro_id: number) {
  await pool.query(
    `UPDATE principal.maestros SET orientador_declinado = FALSE WHERE maestro_id = $1`,
    [maestro_id]
  )
}
