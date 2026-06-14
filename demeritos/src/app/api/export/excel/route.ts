import { NextRequest, NextResponse } from 'next/server'
import { createRoutePool } from '@/lib/db'
import { getRequestAuth } from '@/lib/api-auth'
import { buildExcelBuffer } from '@/lib/excel-export'
import { canExportReporte, type ReporteId } from '@/lib/report-permissions'
import {
  buildDateRangeAnual,
  buildDateRangeDiario,
  buildDateRangeMensual,
  buildMetaSheet,
  fetchDemeritosRows,
  fetchEstudiantesResumen,
  fetchReconocimientosRows,
  fetchRedencionesRows,
  fetchResumenPorSeccion,
  MESES_NOMBRE,
} from '@/lib/report-queries'
import { SESSION_ROLE_LABELS } from '@/lib/session-roles'

function parseMes(v: string | null): number {
  const m = Number(v)
  if (m >= 1 && m <= 12) return m
  return new Date().getMonth() + 1
}

function parseAnio(v: string | null): number {
  const y = Number(v)
  if (y >= 2020 && y <= 2035) return y
  return new Date().getFullYear()
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function excelResponse(buf: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const reporte = (searchParams.get('reporte') || searchParams.get('tipo') || 'demeritos') as ReporteId
  const grado_id = searchParams.get('grado_id')
  const mes = parseMes(searchParams.get('mes'))
  const anio = parseAnio(searchParams.get('anio'))
  const fecha = searchParams.get('fecha') || todayISO()

  if (!canExportReporte(auth.rol_sesion, reporte)) {
    return NextResponse.json({ error: 'No tiene permiso para este reporte' }, { status: 403 })
  }

  const pool = createRoutePool()
  const filters = {
    grado_id,
    maestro_id:
      reporte === 'maestro_mensual' || reporte === 'maestro_diario'
        ? auth.maestro_id
        : reporte === 'demeritos' && auth.rol_sesion === 'docente'
          ? auth.maestro_id
          : null,
  }

  try {
    if (reporte === 'institucional_mensual' || reporte === 'institucional_anual') {
      const range =
        reporte === 'institucional_mensual'
          ? buildDateRangeMensual(mes, anio)
          : buildDateRangeAnual(anio)

      const periodo =
        reporte === 'institucional_mensual'
          ? `${MESES_NOMBRE[mes - 1]} ${anio}`
          : `Año ${anio}`

      const [demeritos, reconocimientos, redenciones, resumen] = await Promise.all([
        fetchDemeritosRows(pool, filters, range),
        fetchReconocimientosRows(pool, filters, range),
        fetchRedencionesRows(pool, filters, range),
        fetchResumenPorSeccion(pool, filters, range),
      ])

      const titulo =
        reporte === 'institucional_mensual'
          ? 'Reporte institucional mensual'
          : 'Reporte institucional anual'

      const buf = await buildExcelBuffer([
        {
          name: 'Información',
          rows: buildMetaSheet(titulo, periodo, {
            Rol: SESSION_ROLE_LABELS[auth.rol_sesion],
            'Total deméritos': demeritos.length,
            'Total reconocimientos': reconocimientos.length,
            'Total redenciones': redenciones.length,
          }),
        },
        { name: 'Resumen por sección', rows: resumen },
        { name: 'Deméritos', rows: demeritos },
        { name: 'Reconocimientos', rows: reconocimientos },
        { name: 'Redenciones', rows: redenciones },
      ])

      const slug = reporte === 'institucional_mensual' ? `mensual_${mes}_${anio}` : `anual_${anio}`
      return excelResponse(buf, `INSAL_reporte_institucional_${slug}.xlsx`)
    }

    if (reporte === 'maestro_mensual' || reporte === 'maestro_diario') {
      const range =
        reporte === 'maestro_mensual'
          ? buildDateRangeMensual(mes, anio)
          : buildDateRangeDiario(fecha)

      const periodo =
        reporte === 'maestro_mensual'
          ? `${MESES_NOMBRE[mes - 1]} ${anio}`
          : new Date(fecha + 'T12:00:00').toLocaleDateString('es-SV')

      const [demeritos, reconocimientos, redenciones] = await Promise.all([
        fetchDemeritosRows(pool, filters, range),
        fetchReconocimientosRows(pool, filters, range),
        fetchRedencionesRows(pool, filters, range),
      ])

      const titulo =
        reporte === 'maestro_mensual' ? 'Reporte mensual del maestro' : 'Reporte diario del maestro'

      const buf = await buildExcelBuffer([
        {
          name: 'Información',
          rows: buildMetaSheet(titulo, periodo, {
            'Total deméritos': demeritos.length,
            'Total reconocimientos': reconocimientos.length,
            'Total redenciones': redenciones.length,
          }),
        },
        { name: 'Deméritos', rows: demeritos },
        { name: 'Reconocimientos', rows: reconocimientos },
        { name: 'Redenciones', rows: redenciones },
      ])

      const slug =
        reporte === 'maestro_mensual' ? `mensual_${mes}_${anio}` : `diario_${fecha}`
      return excelResponse(buf, `INSAL_reporte_maestro_${slug}.xlsx`)
    }

    if (reporte === 'estudiantes') {
      const rows = await fetchEstudiantesResumen(pool, grado_id)
      const buf = await buildExcelBuffer([{ name: 'Estudiantes', rows }])
      return excelResponse(buf, `INSAL_estudiantes_${todayISO()}.xlsx`)
    }

    if (reporte === 'reconocimientos') {
      const range = buildDateRangeAnual(anio)
      const rows = await fetchReconocimientosRows(pool, filters, range)
      const buf = await buildExcelBuffer([{ name: 'Reconocimientos', rows }])
      return excelResponse(buf, `INSAL_reconocimientos_${anio}.xlsx`)
    }

    // demeritos (legacy / listado general)
    const range = buildDateRangeAnual(anio)
    const rows = await fetchDemeritosRows(pool, filters, range)
    const buf = await buildExcelBuffer([{ name: 'Demeritos', rows }])
    return excelResponse(buf, `INSAL_demeritos_${anio}.xlsx`)
  } catch (e) {
    console.error('[export/excel]', e)
    return NextResponse.json({ error: 'Error generando Excel' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
