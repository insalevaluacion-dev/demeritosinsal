import type { Pool } from 'pg'
import { ANIO_ESCOLAR } from '@/lib/anio-escolar'
import { ESPECIALIDADES } from '@/lib/utils'

export type ReportFilters = {
  grado_id?: string | null
  maestro_id?: number | null
}

export type DateRange = {
  whereDem: string
  whereRec: string
  whereRed: string
  params: unknown[]
}

export const MESES_NOMBRE = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function mapEspecialidad(rows: Record<string, unknown>[]) {
  return rows.map(r => {
    const esp = r.Especialidad
    if (typeof esp === 'string' && ESPECIALIDADES[esp]) {
      return { ...r, Especialidad: ESPECIALIDADES[esp] }
    }
    return r
  })
}

function appendGrado(sql: string, params: unknown[], grado_id?: string | null): string {
  if (!grado_id) return sql
  params.push(grado_id)
  return `${sql} AND e.grado_id = $${params.length}`
}

function appendMaestro(sql: string, params: unknown[], maestro_id: number | null | undefined, alias: string): string {
  if (!maestro_id) return sql
  params.push(maestro_id)
  return `${sql} AND ${alias}.id_maestro = $${params.length}`
}

export function buildDateRangeMensual(mes: number, anio: number): DateRange {
  const params = [mes, anio]
  const dem = ` AND EXTRACT(MONTH FROM d.fecha) = $1 AND EXTRACT(YEAR FROM d.fecha) = $2`
  const rec = ` AND EXTRACT(MONTH FROM r.fecha) = $1 AND EXTRACT(YEAR FROM r.fecha) = $2`
  const red = ` AND EXTRACT(MONTH FROM mv.fecha_hora) = $1 AND EXTRACT(YEAR FROM mv.fecha_hora) = $2`
  return { whereDem: dem, whereRec: rec, whereRed: red, params }
}

export function buildDateRangeAnual(anio: number): DateRange {
  const params = [anio]
  const dem = ` AND EXTRACT(YEAR FROM d.fecha) = $1`
  const rec = ` AND EXTRACT(YEAR FROM r.fecha) = $1`
  const red = ` AND EXTRACT(YEAR FROM mv.fecha_hora) = $1`
  return { whereDem: dem, whereRec: rec, whereRed: red, params }
}

export function buildDateRangeDiario(fecha: string): DateRange {
  const params = [fecha]
  const dem = ` AND d.fecha::date = $1::date`
  const rec = ` AND r.fecha::date = $1::date`
  const red = ` AND mv.fecha_hora::date = $1::date`
  return { whereDem: dem, whereRec: rec, whereRed: red, params }
}

export async function fetchDemeritosRows(pool: Pool, filters: ReportFilters, range: DateRange) {
  const params = [...range.params]
  let sql = `
    SELECT
      e.nie AS "NIE",
      e.nombre_completo AS "Estudiante",
      g.nivel AS "Año",
      g.especialidad AS "Especialidad",
      g.seccion_letra AS "Sección",
      c.letra AS "Causal",
      c.descripcion AS "Descripción causal",
      d.observacion AS "Observación",
      m.nombre AS "Registrado por",
      TO_CHAR(d.fecha, 'DD/MM/YYYY') AS "Fecha",
      CASE WHEN d.redimido THEN 'Sí' ELSE 'No' END AS "Redimido",
      CASE WHEN d.alumno_firmo THEN 'Sí' ELSE 'No' END AS "Firmó alumno"
    FROM demeritos d
    LEFT JOIN estudiantes e ON e.nie = d.nie
    LEFT JOIN grados g ON g.grado_id = e.grado_id
    LEFT JOIN causales_demerito c ON c.id_causal = d.id_causal
    LEFT JOIN maestros m ON m.maestro_id = d.id_maestro
    WHERE (e.anio_escolar = ${ANIO_ESCOLAR} OR e.anio_escolar IS NULL)${range.whereDem}
  `
  sql = appendGrado(sql, params, filters.grado_id)
  sql = appendMaestro(sql, params, filters.maestro_id, 'd')
  sql += ` ORDER BY d.fecha DESC, e.nombre_completo`

  const res = await pool.query(sql, params)
  return mapEspecialidad(res.rows)
}

export async function fetchReconocimientosRows(pool: Pool, filters: ReportFilters, range: DateRange) {
  const params = [...range.params]
  let sql = `
    SELECT
      e.nie AS "NIE",
      e.nombre_completo AS "Estudiante",
      g.nivel AS "Año",
      g.especialidad AS "Especialidad",
      g.seccion_letra AS "Sección",
      t.letra AS "Tipo",
      t.descripcion AS "Descripción",
      r.observacion AS "Observación",
      m.nombre AS "Registrado por",
      TO_CHAR(r.fecha, 'DD/MM/YYYY') AS "Fecha"
    FROM reconocimientos r
    LEFT JOIN estudiantes e ON e.nie = r.nie
    LEFT JOIN grados g ON g.grado_id = e.grado_id
    LEFT JOIN tipos_reconocimiento t ON t.id_tipo = r.id_tipo
    LEFT JOIN maestros m ON m.maestro_id = r.id_maestro
    WHERE (e.anio_escolar = ${ANIO_ESCOLAR} OR e.anio_escolar IS NULL)${range.whereRec}
  `
  sql = appendGrado(sql, params, filters.grado_id)
  sql = appendMaestro(sql, params, filters.maestro_id, 'r')
  sql += ` ORDER BY r.fecha DESC, e.nombre_completo`

  const res = await pool.query(sql, params)
  return mapEspecialidad(res.rows)
}

export async function fetchRedencionesRows(pool: Pool, filters: ReportFilters, range: DateRange) {
  const params = [...range.params]
  let sql = `
    SELECT
      e.nie AS "NIE",
      e.nombre_completo AS "Estudiante",
      g.nivel AS "Año",
      g.especialidad AS "Especialidad",
      g.seccion_letra AS "Sección",
      o.letra AS "Opción",
      o.descripcion AS "Descripción redención",
      mv.observacion AS "Observación",
      m.nombre AS "Registrado por",
      TO_CHAR(mv.fecha_hora, 'DD/MM/YYYY HH24:MI') AS "Fecha"
    FROM movimientos_redencion mv
    LEFT JOIN estudiantes e ON e.nie = mv.nie
    LEFT JOIN grados g ON g.grado_id = e.grado_id
    LEFT JOIN opciones_redencion o ON o.id_opcion = mv.id_opcion
    LEFT JOIN maestros m ON m.maestro_id = mv.id_maestro
    WHERE (e.anio_escolar = ${ANIO_ESCOLAR} OR e.anio_escolar IS NULL)${range.whereRed}
  `
  sql = appendGrado(sql, params, filters.grado_id)
  sql = appendMaestro(sql, params, filters.maestro_id, 'mv')
  sql += ` ORDER BY mv.fecha_hora DESC, e.nombre_completo`

  const res = await pool.query(sql, params)
  return mapEspecialidad(res.rows)
}

export async function fetchResumenPorSeccion(pool: Pool, filters: ReportFilters, range: DateRange) {
  const params = [...range.params]
  let sql = `
    SELECT
      g.nivel AS "Año",
      g.especialidad AS "Especialidad",
      g.seccion_letra AS "Sección",
      COUNT(DISTINCT e.estudiante_id) AS "Estudiantes",
      COUNT(DISTINCT d.id_demerito) AS "Deméritos",
      COUNT(DISTINCT d.id_demerito) FILTER (WHERE NOT d.redimido) AS "Deméritos activos",
      COUNT(DISTINCT r.id_reconocimiento) AS "Reconocimientos",
      COUNT(DISTINCT mv.id_mov) AS "Redenciones"
    FROM estudiantes e
    LEFT JOIN grados g ON g.grado_id = e.grado_id
    LEFT JOIN demeritos d ON d.nie = e.nie${range.whereDem}
    LEFT JOIN reconocimientos r ON r.nie = e.nie${range.whereRec}
    LEFT JOIN movimientos_redencion mv ON mv.nie = e.nie${range.whereRed}
    WHERE (e.anio_escolar = ${ANIO_ESCOLAR} OR e.anio_escolar IS NULL) AND e.estado = true
  `
  sql = appendGrado(sql, params, filters.grado_id)
  if (filters.maestro_id) {
    params.push(filters.maestro_id)
    const p = params.length
    sql += ` AND (d.id_maestro = $${p} OR r.id_maestro = $${p} OR mv.id_maestro = $${p} OR (d.id_demerito IS NULL AND r.id_reconocimiento IS NULL AND mv.id_mov IS NULL))`
  }
  sql += ` GROUP BY g.nivel, g.especialidad, g.seccion_letra ORDER BY g.nivel, g.especialidad, g.seccion_letra`

  const res = await pool.query(sql, params)
  return mapEspecialidad(res.rows)
}

export async function fetchEstudiantesResumen(pool: Pool, grado_id?: string | null) {
  const params: unknown[] = []
  let sql = `
    SELECT
      e.nie AS "NIE",
      e.nombre_completo AS "Estudiante",
      g.nivel AS "Año",
      g.especialidad AS "Especialidad",
      g.seccion_letra AS "Sección",
      COUNT(DISTINCT d.id_demerito) FILTER (WHERE NOT d.redimido) AS "Deméritos activos",
      COUNT(DISTINCT d.id_demerito) AS "Total deméritos",
      COUNT(DISTINCT r.id_reconocimiento) AS "Reconocimientos",
      COUNT(DISTINCT mv.id_mov) AS "Redenciones"
    FROM estudiantes e
    LEFT JOIN grados g ON g.grado_id = e.grado_id
    LEFT JOIN demeritos d ON d.nie = e.nie
    LEFT JOIN reconocimientos r ON r.nie = e.nie
    LEFT JOIN movimientos_redencion mv ON mv.nie = e.nie
    WHERE (e.anio_escolar = ${ANIO_ESCOLAR} OR e.anio_escolar IS NULL) AND e.estado = true
  `
  sql = appendGrado(sql, params, grado_id)
  sql += `
    GROUP BY e.estudiante_id, e.nombre_completo, e.nie, g.nivel, g.especialidad, g.seccion_letra
    ORDER BY "Deméritos activos" DESC NULLS LAST, e.nombre_completo
  `
  const res = await pool.query(sql, params)
  return mapEspecialidad(res.rows)
}

export function buildMetaSheet(titulo: string, periodo: string, extra: Record<string, string | number> = {}) {
  const rows: Record<string, string | number>[] = [
    { Campo: 'Instituto', Valor: 'Instituto Nacional San Luis (INSAL)' },
    { Campo: 'Reporte', Valor: titulo },
    { Campo: 'Período', Valor: periodo },
    { Campo: 'Generado', Valor: new Date().toLocaleString('es-SV') },
    { Campo: 'Año lectivo', Valor: ANIO_ESCOLAR },
  ]
  for (const [k, v] of Object.entries(extra)) {
    rows.push({ Campo: k, Valor: v })
  }
  return rows
}
