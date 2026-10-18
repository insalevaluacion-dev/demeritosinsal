import { NextRequest, NextResponse } from 'next/server'
import type { Pool } from 'pg'
import { createRoutePool } from '@/lib/db'
import { getRequestAuth } from '@/lib/api-auth'
import { hashPassword } from '@/lib/auth'
import { isLoginEmail, normalizeClasesEmail } from '@/lib/auth-email'
import { ensureContrasenaPlanaColumn } from '@/lib/ensure-contrasena-plana'
import { ensureAvatarSexoColumn } from '@/lib/maestro-avatar'
import { isInstitucionalRole } from '@/lib/report-permissions'
import { isSessionRoleId, type SessionRoleId } from '@/lib/session-roles'

function puedeGestionar(rol: string): boolean {
  return rol === 'director' || rol === 'subdirector'
}

function rolIdDeSesion(rol: SessionRoleId): number {
  if (rol === 'director') return 1
  if (rol === 'docente') return 3
  return 2
}

function sexoDe(value: unknown): 'M' | 'H' | null {
  return value === 'M' || value === 'H' ? value : null
}

function idOpcional(value: unknown): { ok: true; id: number | null } | { ok: false } {
  if (value === undefined || value === null || value === '') return { ok: true, id: null }
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) return { ok: false }
  return { ok: true, id: n }
}

async function existeCatalogo(
  pool: Pool,
  materiaId: number | null,
  turnoId: number | null
): Promise<string | null> {
  if (materiaId != null) {
    const m = await pool.query(`SELECT 1 FROM principal.materias WHERE materia_id = $1`, [materiaId])
    if (!m.rows.length) return 'La materia no existe'
  }
  if (turnoId != null) {
    const t = await pool.query(`SELECT 1 FROM principal.turnos WHERE turno_id = $1`, [turnoId])
    if (!t.rows.length) return 'El turno no existe'
  }
  return null
}

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const verContrasenas = isInstitucionalRole(auth.rol_sesion)
  const todos = req.nextUrl.searchParams.get('todos') === '1'

  const pool = createRoutePool()
  try {
    await ensureContrasenaPlanaColumn()
    await ensureAvatarSexoColumn()
    const result = await pool.query(`
      SELECT m.maestro_id, m.nombre, m.email, m.contrasena_plana, m.activo,
        m.materia_id, m.turno_id, m.rol_sesion, pm.avatar_sexo,
        r.nombre as rol_nombre, t.nombre as turno_nombre, mat.nombre_materia as materia_nombre
      FROM maestros m
      LEFT JOIN principal.maestros pm ON pm.maestro_id = m.maestro_id
      LEFT JOIN roles r ON r.rol_id = m.rol_id
      LEFT JOIN turno t ON t.turno_id = m.turno_id
      LEFT JOIN materia mat ON mat.materia_id = m.materia_id
      WHERE ($1::boolean OR m.activo = true)
      ORDER BY m.activo DESC, m.nombre
    `, [todos])
    return NextResponse.json(result.rows.map((m: Record<string, unknown>) => ({
      maestro_id: m.maestro_id,
      nombre: m.nombre,
      email: m.email,
      activo: m.activo,
      rol_sesion: m.rol_sesion,
      materia_id: m.materia_id,
      turno_id: m.turno_id,
      avatar_sexo: sexoDe(typeof m.avatar_sexo === 'string' ? m.avatar_sexo.trim() : null),
      contrasena_plana: verContrasenas ? (m.contrasena_plana || null) : undefined,
      rol: { nombre: m.rol_nombre },
      turno: { nombre: m.turno_nombre },
      materia: { nombre: m.materia_nombre },
    })))
  } catch (e) {
    console.error('[maestros]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  } finally {
    await pool.end()
  }
}

export async function POST(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!puedeGestionar(auth.rol_sesion)) {
    return NextResponse.json({ error: 'Solo dirección puede crear cuentas' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const nombre = String(body.nombre || '').trim()
  const email = normalizeClasesEmail(String(body.email || ''))
  const password = String(body.password || '')
  const rol = String(body.rol_sesion || 'docente')
  const materia = idOpcional(body.materia_id)
  const turno = idOpcional(body.turno_id)
  const sexo = sexoDe(body.avatar_sexo)

  if (nombre.length < 3) return NextResponse.json({ error: 'Escriba el nombre completo' }, { status: 400 })
  if (!isLoginEmail(email)) {
    return NextResponse.json({ error: 'Use un correo institucional, por ejemplo @clases.edu.sv' }, { status: 400 })
  }
  if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  if (!isSessionRoleId(rol)) return NextResponse.json({ error: 'Elija un rol' }, { status: 400 })
  if (!materia.ok || !turno.ok) return NextResponse.json({ error: 'Materia o turno inválido' }, { status: 400 })

  const pool = createRoutePool()
  try {
    await ensureContrasenaPlanaColumn()
    await ensureAvatarSexoColumn()
    const catalogo = await existeCatalogo(pool, materia.id, turno.id)
    if (catalogo) return NextResponse.json({ error: catalogo }, { status: 400 })

    const ya = await pool.query(
      `SELECT maestro_id FROM principal.maestros WHERE lower(trim(email)) = $1 LIMIT 1`,
      [email]
    )
    if (ya.rows.length) {
      return NextResponse.json({ error: 'Ese correo ya está registrado' }, { status: 409 })
    }

    const hash = await hashPassword(password)
    const creado = await pool.query(
      `
      INSERT INTO principal.maestros
        (nombre, email, contrasena, contrasena_plana, materia_id, turno_id, rol_id, rol_sesion, avatar_sexo, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING maestro_id
      `,
      [nombre.slice(0, 255), email, hash, password.slice(0, 255), materia.id, turno.id, rolIdDeSesion(rol), rol, sexo]
    )
    return NextResponse.json({ maestro_id: creado.rows[0].maestro_id })
  } catch (e: unknown) {
    const err = e as { code?: string }
    console.error('[maestros POST]', e)
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Ese correo ya está registrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 })
  } finally {
    await pool.end()
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!puedeGestionar(auth.rol_sesion)) {
    return NextResponse.json({ error: 'Solo dirección puede editar cuentas' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const maestroId = Number(body.maestro_id)
  if (!Number.isInteger(maestroId) || maestroId <= 0) {
    return NextResponse.json({ error: 'Docente inválido' }, { status: 400 })
  }
  if (body.activo === false && maestroId === auth.maestro_id) {
    return NextResponse.json({ error: 'No puede desactivar su propia cuenta' }, { status: 400 })
  }

  const sets: string[] = []
  const params: unknown[] = []
  const add = (column: string, value: unknown) => {
    params.push(value)
    sets.push(`${column} = $${params.length}`)
  }

  if (typeof body.nombre === 'string') {
    const nombre = body.nombre.trim()
    if (nombre.length < 3) return NextResponse.json({ error: 'Escriba el nombre completo' }, { status: 400 })
    add('nombre', nombre.slice(0, 255))
  }
  if (body.rol_sesion !== undefined) {
    const rol = String(body.rol_sesion)
    if (!isSessionRoleId(rol)) return NextResponse.json({ error: 'Elija un rol' }, { status: 400 })
    add('rol_sesion', rol)
    add('rol_id', rolIdDeSesion(rol))
  }
  if (body.avatar_sexo !== undefined) {
    const sexo = sexoDe(body.avatar_sexo)
    if (!sexo) return NextResponse.json({ error: 'Elija mujer u hombre' }, { status: 400 })
    add('avatar_sexo', sexo)
  }
  if (body.activo !== undefined) {
    if (typeof body.activo !== 'boolean') return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    add('activo', body.activo)
  }

  let materiaId: number | null | undefined
  let turnoId: number | null | undefined
  if (body.materia_id !== undefined) {
    const materia = idOpcional(body.materia_id)
    if (!materia.ok) return NextResponse.json({ error: 'Materia inválida' }, { status: 400 })
    materiaId = materia.id
    add('materia_id', materia.id)
  }
  if (body.turno_id !== undefined) {
    const turno = idOpcional(body.turno_id)
    if (!turno.ok) return NextResponse.json({ error: 'Turno inválido' }, { status: 400 })
    turnoId = turno.id
    add('turno_id', turno.id)
  }
  if (!sets.length) return NextResponse.json({ error: 'Nada que guardar' }, { status: 400 })

  const pool = createRoutePool()
  try {
    await ensureAvatarSexoColumn()
    const catalogo = await existeCatalogo(pool, materiaId ?? null, turnoId ?? null)
    if (catalogo) return NextResponse.json({ error: catalogo }, { status: 400 })

    params.push(maestroId)
    sets.push('actualizado_en = now()')
    const updated = await pool.query(
      `UPDATE principal.maestros SET ${sets.join(', ')} WHERE maestro_id = $${params.length} RETURNING maestro_id`,
      params
    )
    if (!updated.rows.length) return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[maestros PATCH]', e)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
