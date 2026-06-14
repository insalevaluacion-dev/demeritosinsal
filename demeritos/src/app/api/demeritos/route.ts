import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import { normalizeNie } from '@/lib/nie'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const nieRaw = searchParams.get('nie')
  const nie = nieRaw ? normalizeNie(nieRaw) : null
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  try {
    const params: unknown[] = []
    let whereClause = nie ? "WHERE REPLACE(TRIM(d.nie), ' ', '') = $1" : ''
    if (nie) params.push(nie)

    const dataParams = [...params, limit, offset]
    const result = await query(
      `
      SELECT d.*, c.descripcion as causal_desc, m.nombre as maestro_nombre,
        e.nombre_completo as alumno_nombre, g.especialidad, g.nivel::int AS nivel,
        CASE g.nivel::int WHEN 1 THEN '1 Año' WHEN 2 THEN '2 Año' WHEN 3 THEN '3 Año' END AS nivel_nombre,
        g.seccion_letra,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM orientador o
            WHERE o.grado_id = e.grado_id AND o.activo = true AND o.maestro_id = d.id_maestro
          ) THEN false
          WHEN EXISTS (
            SELECT 1 FROM orientador o
            WHERE o.grado_id = e.grado_id AND o.activo = true
          ) THEN true
          ELSE false
        END AS es_externo
      FROM demeritos d
      LEFT JOIN causales_demerito c ON c.id_causal = d.id_causal
      LEFT JOIN maestros m ON m.maestro_id = d.id_maestro
      LEFT JOIN estudiantes e ON e.nie = d.nie
      LEFT JOIN grados g ON g.grado_id = e.grado_id
      ${whereClause}
      ORDER BY d.creado_en DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      dataParams
    )

    const countResult = await query(
      `SELECT COUNT(*) FROM demeritos${nie ? " WHERE REPLACE(TRIM(nie), ' ', '')=$1" : ''}`,
      nie ? [nie] : []
    )

    return NextResponse.json({
      demeritos: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    })
  } catch (e) {
    console.error('[demeritos GET]', e)
    return NextResponse.json({ error: 'Error al listar deméritos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.slice(7)
  const payload = verifyToken(auth || '') as {
    maestro_id?: number
    nombre?: string
  } | null
  if (!payload?.maestro_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const nie = normalizeNie(String(body.nie || ''))
    const id_causal = parseInt(String(body.id_causal), 10)
    const causal_letra = body.causal_letra
    const observacion = body.observacion ?? null
    const sexo_alumno = body.sexo_alumno ?? null
    const firmo = Boolean(body.alumno_firmo)
    const maestroId = Number(payload.maestro_id)

    if (!nie) return NextResponse.json({ error: 'NIE requerido' }, { status: 400 })
    if (!id_causal || !causal_letra) {
      return NextResponse.json({ error: 'Debe seleccionar una causal' }, { status: 400 })
    }

    const maestroCheck = await query(
      'SELECT maestro_id, nombre FROM maestros WHERE maestro_id = $1 AND activo = true',
      [maestroId]
    )
    if (!maestroCheck.rows.length) {
      return NextResponse.json(
        { error: 'Su cuenta de docente no está registrada en el sistema. Cierre sesión y vuelva a entrar.' },
        { status: 403 }
      )
    }

    const estResult = await query(
      `
      SELECT e.*, g.especialidad, g.nivel, g.seccion_letra,
        (
          SELECT o.maestro_id FROM orientador o
          WHERE o.grado_id = e.grado_id AND o.activo = true
          ORDER BY o.orientador_id
          LIMIT 1
        ) AS orientador_id
      FROM estudiantes e
      LEFT JOIN grados g ON g.grado_id = e.grado_id
      WHERE REPLACE(TRIM(e.nie), ' ', '') = $1
      `,
      [nie]
    )

    if (!estResult.rows.length) {
      return NextResponse.json({ error: 'Estudiante no encontrado en el sistema' }, { status: 404 })
    }

    const est = estResult.rows[0]
    const es_externo = Boolean(est.orientador_id && est.orientador_id !== maestroId)

    const insertResult = await query(
      `
      INSERT INTO demeritos (nie, id_causal, causal_letra, id_maestro, observacion, sexo_alumno, alumno_firmo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [nie, id_causal, causal_letra, maestroId, observacion, sexo_alumno, firmo]
    )

    const countResult = await query(
      'SELECT COUNT(*)::int AS total FROM demeritos WHERE REPLACE(TRIM(nie), \' \', \'\') = $1 AND redimido = false',
      [nie]
    )
    const total = countResult.rows[0]?.total ?? 0

    let nivel_alerta = 0
    let titulo = 'Nuevo Demérito Registrado'
    if (total >= 15) {
      nivel_alerta = 3
      titulo = 'CRÍTICO: Alumno no puede ser promovido'
    } else if (total >= 10) {
      nivel_alerta = 2
      titulo = 'Suspensión de privilegios'
    } else if (total >= 6) {
      nivel_alerta = 1
      titulo = 'Comunicar a familia'
    }

    let mensaje = `${est.nombre_completo} | Causal ${causal_letra} | Por: ${payload.nombre || maestroCheck.rows[0].nombre}`
    if (es_externo) mensaje += '\n[Docente externo a la sección]'

    await query(
      `
      INSERT INTO notificaciones (nie, tipo, nivel_alerta, titulo, mensaje)
      VALUES ($1, 'demerito', $2, $3, $4)
      `,
      [nie, nivel_alerta, titulo, mensaje]
    )

    return NextResponse.json({
      demerito: insertResult.rows[0],
      es_externo,
      nivel_alerta,
      total_activos: total,
    })
  } catch (e: unknown) {
    const err = e as { code?: string; detail?: string; message?: string }
    console.error('[demeritos POST]', err)
    if (err.code === '23503') {
      return NextResponse.json(
        { error: 'Datos inválidos (estudiante, causal o docente). Verifique e intente de nuevo.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: err.detail || err.message || 'Error al registrar demérito' },
      { status: 500 }
    )
  }
}
