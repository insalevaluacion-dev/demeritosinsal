import type { Pool } from 'pg'
import { ANIO_ESCOLAR } from '@/lib/anio-escolar'
import { fetchGradosOrientador } from '@/lib/orientador-maestro'
import { MESES_NOMBRE } from '@/lib/report-queries'
import { resolverSexoAlumno } from '@/lib/sexo-alumno'
import { labelGradoOpcion, labelNivel } from '@/lib/utils'
import type {
  FilaMesInstrumento002,
  Instrumento002Header,
  Instrumento002Payload,
  ResumenInstrumento002,
} from '@/lib/instrumento-002-types'

export type Instrumento002Params = {
  periodo: 'mensual' | 'anual'
  alcance: 'grado' | 'institucion'
  grado_id: number | null
  mes: number
  anio: number
  docenteNombre: string
}

function gradoFilter(grado_id: number | null, params: unknown[], alias = 'e'): string {
  if (grado_id == null) return ''
  params.push(grado_id)
  return ` AND ${alias}.grado_id = $${params.length}`
}

function emptyFila(mes: string, mesNum: number): FilaMesInstrumento002 {
  return {
    mes,
    mesNum,
    matriculaM: 0,
    matriculaH: 0,
    demeritosM: 0,
    demeritosH: 0,
    causalA: 0,
    causalB: 0,
    causalC: 0,
    causalD: 0,
    redencionM: 0,
    redencionH: 0,
    redencionA: 0,
    redencionB: 0,
    redencionC: 0,
    reconocimientoM: 0,
    reconocimientoH: 0,
  }
}

function sumFilas(filas: FilaMesInstrumento002[], matricula: { m: number; h: number }): FilaMesInstrumento002 {
  const t = emptyFila('TOTAL', 0)
  t.matriculaM = matricula.m
  t.matriculaH = matricula.h
  for (const f of filas) {
    t.demeritosM += f.demeritosM
    t.demeritosH += f.demeritosH
    t.causalA += f.causalA
    t.causalB += f.causalB
    t.causalC += f.causalC
    t.causalD += f.causalD
    t.redencionM += f.redencionM
    t.redencionH += f.redencionH
    t.redencionA += f.redencionA
    t.redencionB += f.redencionB
    t.redencionC += f.redencionC
    t.reconocimientoM += f.reconocimientoM
    t.reconocimientoH += f.reconocimientoH
  }
  t.mes = 'TOTAL'
  return t
}

/** Sexo conocido por estudiante (M=Mujer, H=Hombre) según registros en BD. */
async function fetchSexoEstudianteMap(pool: Pool, grado_id: number | null) {
  const params: unknown[] = []
  const gf = gradoFilter(grado_id, params)
  const res = await pool.query(
    `
    SELECT e.nie, e.nombre_completo,
      (
        SELECT s FROM (
          SELECT d.sexo_alumno AS s, d.fecha AS orden FROM demeritos d
          WHERE d.nie = e.nie AND d.sexo_alumno IN ('M', 'H')
          UNION ALL
          SELECT r.sexo_alumno AS s, r.fecha::timestamptz AS orden FROM reconocimientos r
          WHERE r.nie = e.nie AND r.sexo_alumno IN ('M', 'H')
        ) x ORDER BY orden DESC LIMIT 1
      ) AS sexo
    FROM estudiantes e
    WHERE (e.anio_escolar = ${ANIO_ESCOLAR} OR e.anio_escolar IS NULL) AND e.estado = true${gf}
    `,
    params
  )
  return res.rows as { nie: string; nombre_completo: string; sexo: string | null }[]
}

async function fetchMatriculaSexo(pool: Pool, grado_id: number | null) {
  const rows = await fetchSexoEstudianteMap(pool, grado_id)
  let m = 0
  let h = 0
  for (const r of rows) {
    const sexo = resolverSexoAlumno(r.sexo, r.nombre_completo)
    if (sexo === 'M') m++
    else h++
  }
  return { m, h, total: rows.length }
}

async function fetchDemeritosMes(
  pool: Pool,
  grado_id: number | null,
  mes: number,
  anio: number
) {
  const params: unknown[] = [mes, anio]
  const gf = gradoFilter(grado_id, params)
  const res = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE d.sexo_alumno = 'M')::int AS dem_m,
      COUNT(*) FILTER (WHERE d.sexo_alumno = 'H')::int AS dem_h,
      COUNT(*) FILTER (WHERE d.causal_letra = 'A')::int AS ca,
      COUNT(*) FILTER (WHERE d.causal_letra = 'B')::int AS cb,
      COUNT(*) FILTER (WHERE d.causal_letra = 'C')::int AS cc,
      COUNT(*) FILTER (WHERE d.causal_letra = 'D')::int AS cd,
      COUNT(*)::int AS total
    FROM demeritos d
    JOIN estudiantes e ON e.nie = d.nie
    WHERE EXTRACT(MONTH FROM d.fecha) = $1 AND EXTRACT(YEAR FROM d.fecha) = $2${gf}
    `,
    params
  )
  return res.rows[0]
}

async function fetchRedencionesMes(pool: Pool, grado_id: number | null, mes: number, anio: number) {
  const params: unknown[] = [mes, anio]
  const gf = gradoFilter(grado_id, params, 'e')
  const res = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE d.sexo_alumno = 'M')::int AS red_m,
      COUNT(*) FILTER (WHERE d.sexo_alumno = 'H')::int AS red_h,
      COUNT(*) FILTER (WHERE mv.opcion_letra = 'A')::int AS ra,
      COUNT(*) FILTER (WHERE mv.opcion_letra = 'B')::int AS rb,
      COUNT(*) FILTER (WHERE mv.opcion_letra = 'C')::int AS rc,
      COUNT(*)::int AS total
    FROM movimientos_redencion mv
    JOIN estudiantes e ON e.nie = mv.nie
    LEFT JOIN demeritos d ON d.id_demerito = mv.id_demerito
    WHERE EXTRACT(MONTH FROM mv.fecha_hora) = $1 AND EXTRACT(YEAR FROM mv.fecha_hora) = $2${gf}
    `,
    params
  )
  return res.rows[0]
}

async function fetchReconocimientosMes(pool: Pool, grado_id: number | null, mes: number, anio: number) {
  const params: unknown[] = [mes, anio]
  const gf = gradoFilter(grado_id, params)
  const res = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE r.sexo_alumno = 'M')::int AS rec_m,
      COUNT(*) FILTER (WHERE r.sexo_alumno = 'H')::int AS rec_h,
      COUNT(*)::int AS total
    FROM reconocimientos r
    JOIN estudiantes e ON e.nie = r.nie
    WHERE EXTRACT(MONTH FROM r.fecha) = $1 AND EXTRACT(YEAR FROM r.fecha) = $2${gf}
    `,
    params
  )
  return res.rows[0]
}

async function fetchResumenPeriodo(
  pool: Pool,
  grado_id: number | null,
  anio: number,
  mesInicio: number,
  mesFin: number
): Promise<ResumenInstrumento002> {
  const mat = await fetchMatriculaSexo(pool, grado_id)

  const params: unknown[] = [anio, mesInicio, mesFin]
  const gf = gradoFilter(grado_id, params)

  const dem = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE d.causal_letra = 'A')::int AS a,
      COUNT(*) FILTER (WHERE d.causal_letra = 'B')::int AS b,
      COUNT(*) FILTER (WHERE d.causal_letra = 'C')::int AS c,
      COUNT(*) FILTER (WHERE d.causal_letra = 'D')::int AS d,
      COUNT(*) FILTER (WHERE d.sexo_alumno = 'M')::int AS m,
      COUNT(*) FILTER (WHERE d.sexo_alumno = 'H')::int AS h,
      COUNT(*)::int AS total
    FROM demeritos d
    JOIN estudiantes e ON e.nie = d.nie
    WHERE EXTRACT(YEAR FROM d.fecha) = $1
      AND EXTRACT(MONTH FROM d.fecha) BETWEEN $2 AND $3${gf}
    `,
    params
  )

  const red = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE mv.opcion_letra = 'A')::int AS a,
      COUNT(*) FILTER (WHERE mv.opcion_letra = 'B')::int AS b,
      COUNT(*) FILTER (WHERE mv.opcion_letra = 'C')::int AS c,
      COUNT(*) FILTER (WHERE d.sexo_alumno = 'M')::int AS m,
      COUNT(*) FILTER (WHERE d.sexo_alumno = 'H')::int AS h,
      COUNT(*)::int AS total
    FROM movimientos_redencion mv
    JOIN estudiantes e ON e.nie = mv.nie
    LEFT JOIN demeritos d ON d.id_demerito = mv.id_demerito
    WHERE EXTRACT(YEAR FROM mv.fecha_hora) = $1
      AND EXTRACT(MONTH FROM mv.fecha_hora) BETWEEN $2 AND $3${gf}
    `,
    params
  )

  const rec = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE r.sexo_alumno = 'M')::int AS m,
      COUNT(*) FILTER (WHERE r.sexo_alumno = 'H')::int AS h,
      COUNT(*)::int AS total
    FROM reconocimientos r
    JOIN estudiantes e ON e.nie = r.nie
    WHERE EXTRACT(YEAR FROM r.fecha) = $1
      AND EXTRACT(MONTH FROM r.fecha) BETWEEN $2 AND $3${gf}
    `,
    params
  )

  const d = dem.rows[0]
  const r = red.rows[0]
  const c = rec.rows[0]

  return {
    alumnosM: mat.m,
    alumnosH: mat.h,
    alumnosTotal: mat.total,
    demeritosCausal: {
      A: d.a,
      B: d.b,
      C: d.c,
      D: d.d,
      total: d.total,
    },
    demeritosSexo: { M: d.m, H: d.h, total: d.total },
    redencionesOpcion: { A: r.a, B: r.b, C: r.c, total: r.total },
    redencionesSexo: { M: r.m, H: r.h, total: r.total },
    reconocimientosSexo: { M: c.m, H: c.h, total: c.total },
    totalGeneral: d.total + r.total + c.total,
  }
}

async function buildFilaMes(
  pool: Pool,
  grado_id: number | null,
  mes: number,
  anio: number,
  matricula: { m: number; h: number }
): Promise<FilaMesInstrumento002> {
  const dem = await fetchDemeritosMes(pool, grado_id, mes, anio)
  const red = await fetchRedencionesMes(pool, grado_id, mes, anio)
  const rec = await fetchReconocimientosMes(pool, grado_id, mes, anio)

  return {
    mes: MESES_NOMBRE[mes - 1],
    mesNum: mes,
    matriculaM: matricula.m,
    matriculaH: matricula.h,
    demeritosM: dem.dem_m,
    demeritosH: dem.dem_h,
    causalA: dem.ca,
    causalB: dem.cb,
    causalC: dem.cc,
    causalD: dem.cd,
    redencionM: red.red_m,
    redencionH: red.red_h,
    redencionA: red.ra,
    redencionB: red.rb,
    redencionC: red.rc,
    reconocimientoM: rec.rec_m,
    reconocimientoH: rec.rec_h,
  }
}

async function fetchGradoLabel(pool: Pool, grado_id: number | null): Promise<{
  grado: string
  seccion: string
  turno: string
}> {
  if (!grado_id) {
    return { grado: 'Institución completa', seccion: 'Todas', turno: 'Todos' }
  }
  const res = await pool.query(
    `SELECT nivel, nivel_nombre, especialidad, seccion_letra FROM grados WHERE grado_id = $1`,
    [grado_id]
  )
  const g = res.rows[0]
  if (!g) return { grado: '—', seccion: '—', turno: '—' }
  const gradoLabel = labelGradoOpcion(g) || labelNivel(g) || `${g.nivel}°`
  return {
    grado: gradoLabel,
    seccion: g.seccion_letra || '—',
    turno: 'Matutino',
  }
}

export async function buildInstrumento002(
  pool: Pool,
  params: Instrumento002Params
): Promise<Instrumento002Payload> {
  const { periodo, alcance, grado_id, mes, anio, docenteNombre } = params
  const gradoInfo = await fetchGradoLabel(pool, grado_id)

  const matricula = await fetchMatriculaSexo(pool, grado_id)

  const filas: FilaMesInstrumento002[] = []
  for (let m = 1; m <= 12; m++) {
    filas.push(await buildFilaMes(pool, grado_id, m, anio, matricula))
  }

  const totales = sumFilas(filas, matricula)
  const mesInicio = periodo === 'mensual' ? mes : 1
  const mesFin = periodo === 'mensual' ? mes : 12
  const resumen = await fetchResumenPeriodo(pool, grado_id, anio, mesInicio, mesFin)

  const mesAnioLabel =
    periodo === 'mensual'
      ? `${MESES_NOMBRE[mes - 1]} ${anio}`
      : `Año ${anio}`

  const header: Instrumento002Header = {
    centroEducativo: 'Instituto Nacional San Luis',
    codigoCE: '11423',
    departamento: 'San Salvador',
    municipio: 'San Luis La Herradura',
    distrito: '06-02',
    docente: docenteNombre,
    mesAnio: mesAnioLabel,
    grado: gradoInfo.grado,
    seccion: gradoInfo.seccion,
    turno: gradoInfo.turno,
  }

  return {
    periodo,
    alcance,
    grado_id,
    mes: periodo === 'mensual' ? mes : undefined,
    anio,
    header,
    filas,
    totales,
    resumen,
  }
}

export async function fetchGradosMaestro(pool: Pool, maestro_id: number) {
  return fetchGradosOrientador(pool, maestro_id)
}
