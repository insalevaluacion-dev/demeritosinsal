import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ANIO_ESCOLAR } from '@/lib/anio-escolar'

export async function GET(req: NextRequest) {
  try {
    const [estTotal, demHoy, demActivos, reconTotal, redTotal, recientes, topInc, porEsp, porMes] = await Promise.all([
      query(`SELECT COUNT(*) FROM estudiantes WHERE anio_escolar=$1 AND estado=true`, [ANIO_ESCOLAR]),
      query(`SELECT COUNT(*) FROM demeritos WHERE fecha=CURRENT_DATE`),
      query(`SELECT COUNT(*) FROM demeritos WHERE redimido=false`),
      query(`SELECT COUNT(*) FROM reconocimientos`),
      query(`SELECT COUNT(*) FROM movimientos_redencion`),
      query(`
        SELECT 'demerito' as tipo, d.creado_en as fecha, e.nombre_completo as alumno,
          d.nie, c.descripcion, m.nombre as maestro
        FROM demeritos d
        LEFT JOIN estudiantes e ON e.nie=d.nie
        LEFT JOIN causales_demerito c ON c.id_causal=d.id_causal
        LEFT JOIN maestros m ON m.maestro_id=d.id_maestro
        UNION ALL
        SELECT 'reconocimiento', r.creado_en, e.nombre_completo, r.nie, t.descripcion, m.nombre
        FROM reconocimientos r
        LEFT JOIN estudiantes e ON e.nie=r.nie
        LEFT JOIN tipos_reconocimiento t ON t.id_tipo=r.id_tipo
        LEFT JOIN maestros m ON m.maestro_id=r.id_maestro
        ORDER BY fecha DESC LIMIT 10
      `),
      query(`
        SELECT d.nie, e.nombre_completo as nombre, g.nivel::int AS nivel,
          CASE g.nivel::int WHEN 1 THEN '1 Año' WHEN 2 THEN '2 Año' WHEN 3 THEN '3 Año' END AS nivel_nombre,
          g.especialidad, g.seccion_letra,
          COUNT(d.id_demerito) as total
        FROM demeritos d
        LEFT JOIN estudiantes e ON e.nie=d.nie
        LEFT JOIN grados g ON g.grado_id=e.grado_id
        WHERE d.redimido=false
        GROUP BY d.nie, e.nombre_completo, g.nivel, g.especialidad, g.seccion_letra
        ORDER BY total DESC LIMIT 10
      `),
      query(`
        SELECT g.especialidad,
          COUNT(DISTINCT e.estudiante_id) as estudiantes,
          COUNT(d.id_demerito) as demeritos
        FROM grados g
        LEFT JOIN estudiantes e ON e.grado_id=g.grado_id AND e.anio_escolar=$1
        LEFT JOIN demeritos d ON d.nie=e.nie AND d.redimido=false
        GROUP BY g.especialidad ORDER BY demeritos DESC
      `, [ANIO_ESCOLAR]),
      query(`
        SELECT TO_CHAR(fecha,'MM') as mes, TO_CHAR(fecha,'Mon') as mes_nombre,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE sexo_alumno = 'M')::int as mujeres,
          COUNT(*) FILTER (WHERE sexo_alumno = 'H')::int as hombres
        FROM demeritos WHERE fecha >= DATE_TRUNC('year', CURRENT_DATE)
        GROUP BY mes, mes_nombre ORDER BY mes
      `)
    ])

    return NextResponse.json({
      stats: {
        totalEstudiantes: parseInt(estTotal.rows[0].count),
        totalDemeritosHoy: parseInt(demHoy.rows[0].count),
        totalDemeritosActivos: parseInt(demActivos.rows[0].count),
        totalReconocimientos: parseInt(reconTotal.rows[0].count),
        totalRedenciones: parseInt(redTotal.rows[0].count),
      },
      recientes: recientes.rows,
      topIncidencias: topInc.rows,
      porEspecialidad: porEsp.rows,
      porMes: porMes.rows
    })
  } catch (e) {
    console.error('[dashboard GET]', e)
    return NextResponse.json({ error: 'Error al cargar el dashboard' }, { status: 500 })
  }
}
