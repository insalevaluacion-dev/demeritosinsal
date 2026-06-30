import type { Pool } from 'pg'
import { query } from '@/lib/db'
import { ANIO_ESCOLAR } from '@/lib/anio-escolar'
import {
  ensureOrientadorDeclinadoColumn,
  ensureOrientadorIdSequence,
} from '@/lib/ensure-maestro-schema'

export type GradoOrientador = {
  grado_id: number
  nivel: number
  nivel_nombre?: string
  especialidad: string
  seccion_letra: string
}

/** Grados donde el maestro es orientador activo en el año lectivo actual. */
export async function fetchGradosOrientador(
  pool: Pool,
  maestro_id: number
): Promise<GradoOrientador[]> {
  const res = await pool.query(
    `
    SELECT DISTINCT g.grado_id, g.nivel::int AS nivel,
      COALESCE(g.nivel_nombre,
        CASE g.nivel::int WHEN 1 THEN '1 Año' WHEN 2 THEN '2 Año' WHEN 3 THEN '3 Año' END
      ) AS nivel_nombre,
      g.especialidad, g.seccion_letra
    FROM orientador o
    JOIN grados g ON g.grado_id = o.grado_id
    WHERE o.maestro_id = $1 AND o.activo = true AND o.grado_id IS NOT NULL
      AND (o.anio_escolar = $2 OR o.anio_escolar IS NULL)
    ORDER BY g.nivel, g.especialidad, g.seccion_letra
    `,
    [maestro_id, ANIO_ESCOLAR]
  )
  return res.rows
}

export async function maestroTieneOrientador(pool: Pool, maestro_id: number): Promise<boolean> {
  const grados = await fetchGradosOrientador(pool, maestro_id)
  return grados.length > 0
}

export async function maestroDeclinoOrientador(maestro_id: number): Promise<boolean> {
  await ensureOrientadorDeclinadoColumn()
  const res = await query<{ orientador_declinado: boolean }>(
    `SELECT orientador_declinado FROM principal.maestros WHERE maestro_id = $1`,
    [maestro_id]
  )
  return Boolean(res.rows[0]?.orientador_declinado)
}

/** Ya eligió grado de orientación o indicó que no es orientador. */
export async function maestroRespondioOrientador(
  pool: Pool,
  maestro_id: number
): Promise<boolean> {
  if (await maestroTieneOrientador(pool, maestro_id)) return true
  return maestroDeclinoOrientador(maestro_id)
}

/** Marca que el maestro no es orientador (solo docente). */
export async function declinarOrientador(
  maestro_id: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureOrientadorDeclinadoColumn()

  const { createRoutePool } = await import('@/lib/db')
  const pool = createRoutePool()
  try {
    const grados = await fetchGradosOrientador(pool, maestro_id)
    if (grados.length > 0) {
      return { ok: false, error: 'Ya tienes un grado asignado como orientador' }
    }
  } finally {
    await pool.end()
  }

  await query(
    `UPDATE principal.maestros SET orientador_declinado = TRUE WHERE maestro_id = $1`,
    [maestro_id]
  )
  return { ok: true }
}

/** Asigna el grado de orientación (solo si aún no tiene uno activo este año). */
export async function asignarGradoOrientador(
  maestro_id: number,
  grado_id: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const poolGrado = await query(
    `SELECT grado_id FROM grados WHERE grado_id = $1 AND activo = true`,
    [grado_id]
  )
  if (!poolGrado.rows[0]) {
    return { ok: false, error: 'Grado no válido' }
  }

  const existing = await query(
    `
    SELECT orientador_id FROM orientador
    WHERE maestro_id = $1 AND activo = true AND grado_id IS NOT NULL
      AND (anio_escolar = $2 OR anio_escolar IS NULL)
    LIMIT 1
    `,
    [maestro_id, ANIO_ESCOLAR]
  )
  if (existing.rows[0]) {
    return { ok: false, error: 'Ya tienes un grado asignado como orientador' }
  }

  const inserted = await query(
    `
    INSERT INTO principal.orientadores (maestro_id, grado_id, anio_escolar, activo)
    VALUES ($1, $2, $3, true)
    RETURNING orientador_id
    `,
    [maestro_id, grado_id, ANIO_ESCOLAR]
  ).catch(() => ({ rows: [] as { orientador_id: number }[] }))

  if (inserted.rows[0]?.orientador_id) {
    return { ok: true }
  }

  const fallback = await query(
    `
    INSERT INTO orientador (maestro_id, grado_id, anio_escolar, activo)
    VALUES ($1, $2, $3, true)
    RETURNING orientador_id
    `,
    [maestro_id, grado_id, ANIO_ESCOLAR]
  ).catch(() => ({ rows: [] as { orientador_id: number }[] }))

  if (fallback.rows[0]?.orientador_id) {
    return { ok: true }
  }

  return { ok: false, error: 'No se pudo guardar el grado de orientación' }
}
