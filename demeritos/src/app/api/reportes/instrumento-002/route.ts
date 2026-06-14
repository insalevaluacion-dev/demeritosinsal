import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'
import { getRequestAuth } from '@/lib/api-auth'
import { isInstitucionalRole } from '@/lib/report-permissions'
import { buildInstrumento002Excel } from '@/lib/instrumento-002-excel'
import { buildInstrumento002 } from '@/lib/instrumento-002-queries'
import type { Instrumento002Header, Instrumento002Payload } from '@/lib/instrumento-002-types'

function parseMes(v: string | null): number {
  const m = Number(v)
  return m >= 1 && m <= 12 ? m : new Date().getMonth() + 1
}

function parseAnio(v: string | null): number {
  const y = Number(v)
  return y >= 2020 && y <= 2035 ? y : new Date().getFullYear()
}

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') === 'anual' ? 'anual' : 'mensual'
  const alcanceParam = searchParams.get('alcance')
  const gradoIdRaw = searchParams.get('grado_id')
  const mes = parseMes(searchParams.get('mes'))
  const anio = parseAnio(searchParams.get('anio'))
  const docenteNombre = searchParams.get('docente') || 'Docente INSAL'

  const esInstitucional = isInstitucionalRole(auth.rol_sesion)

  if (!esInstitucional && alcanceParam === 'institucion') {
    return NextResponse.json({ error: 'Solo roles institucionales pueden ver toda la institución' }, { status: 403 })
  }

  const alcance = esInstitucional && alcanceParam === 'institucion' ? 'institucion' : 'grado'
  const grado_id = alcance === 'institucion' ? null : Number(gradoIdRaw)

  if (alcance === 'grado' && (!grado_id || Number.isNaN(grado_id))) {
    return NextResponse.json({ error: 'Seleccione un grado' }, { status: 400 })
  }

  const pool = createRoutePool()
  try {
    const payload = await buildInstrumento002(pool, {
      periodo,
      alcance,
      grado_id: alcance === 'institucion' ? null : grado_id,
      mes,
      anio,
      docenteNombre,
    })
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[instrumento-002 GET]', e)
    return NextResponse.json({ error: 'Error al generar datos del reporte' }, { status: 500 })
  } finally {
    await pool.end()
  }
}

export async function POST(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = body.data as Instrumento002Payload
    const headerOverride = body.header as Partial<Instrumento002Header> | undefined

    if (!data?.filas) {
      return NextResponse.json({ error: 'Datos del reporte inválidos' }, { status: 400 })
    }

    const merged: Instrumento002Payload = {
      ...data,
      header: { ...data.header, ...headerOverride },
    }

    const buf = await buildInstrumento002Excel(merged)
    const slug =
      merged.periodo === 'mensual'
        ? `mensual_${merged.mes}_${merged.anio}`
        : `anual_${merged.anio}`

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="INSAL_Instrumento002_${slug}.xlsx"`,
      },
    })
  } catch (e) {
    console.error('[instrumento-002 POST]', e)
    return NextResponse.json({ error: 'Error al exportar Excel' }, { status: 500 })
  }
}
