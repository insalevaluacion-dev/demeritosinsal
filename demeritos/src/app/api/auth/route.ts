import { NextRequest, NextResponse } from 'next/server'
import { generateToken, hashPassword } from '@/lib/auth'
import { isClasesEmail, isLoginEmail, normalizeClasesEmail } from '@/lib/auth-email'
import { query } from '@/lib/db'
import { ensureContrasenaPlanaColumn, saveContrasenaPlana } from '@/lib/ensure-contrasena-plana'
import { ensureMaestroIdSequence } from '@/lib/ensure-maestro-schema'
import { fetchMaestroByEmail } from '@/lib/fetch-maestro'
import { upgradePasswordHashIfNeeded, verifyMaestroPassword } from '@/lib/maestro-password'
import type { SessionRoleId } from '@/lib/session-roles'

export const runtime = 'nodejs'

const MIN_PASSWORD = 6

function userPayload(maestro: Record<string, unknown>) {
  const rolSesion = maestro.rol_sesion ? String(maestro.rol_sesion).trim() : null
  return {
    maestro_id: maestro.maestro_id,
    nombre: maestro.nombre,
    email: maestro.email,
    rol: maestro.rol_nombre || 'docente',
    rol_id: maestro.rol_id,
    turno: maestro.turno_nombre,
    materia: maestro.materia_nombre,
    rol_sesion: rolSesion || null,
    needsRoleSelection: !rolSesion,
  }
}

async function ensureDocenteRol(): Promise<number> {
  await query(`
    INSERT INTO principal.roles (rol_id, nombre, estado)
    OVERRIDING SYSTEM VALUE VALUES (3, 'docente', true)
    ON CONFLICT (rol_id) DO NOTHING
  `).catch(() => {})

  const rolRes = await query(
    `SELECT rol_id FROM roles WHERE rol_id = 3 OR LOWER(nombre) = 'docente' ORDER BY rol_id LIMIT 1`
  )
  if (rolRes.rows[0]?.rol_id) return Number(rolRes.rows[0].rol_id)

  const anyRol = await query(`SELECT rol_id FROM roles ORDER BY rol_id LIMIT 1`)
  return Number(anyRol.rows[0]?.rol_id ?? 2)
}

async function ensureTurnoId(): Promise<number> {
  const t = await query(`SELECT turno_id FROM turno ORDER BY turno_id LIMIT 1`)
  return Number(t.rows[0]?.turno_id ?? 1)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = normalizeClasesEmail(body.email || '')
    const password = String(body.password || '')
    const nombre = String(body.nombre || '').trim()
    const confirmPassword = String(body.confirmPassword || '')
    const isRegister = Boolean(body.register)

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son obligatorios' }, { status: 400 })
    }

    if (isRegister && !isClasesEmail(email)) {
      return NextResponse.json(
        { error: 'Para crear cuenta use un correo @clases.edu.sv' },
        { status: 400 }
      )
    }

    if (!isRegister && !isLoginEmail(email)) {
      return NextResponse.json(
        { error: 'Use un correo @clases.edu.sv, @insal.edu.sv o @mined.gob.sv' },
        { status: 400 }
      )
    }

    if (password.length < MIN_PASSWORD) {
      return NextResponse.json(
        { error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` },
        { status: 400 }
      )
    }

    const existing = await fetchMaestroByEmail(email)

    if (isRegister || !existing) {
      if (!isRegister && !existing) {
        return NextResponse.json(
          {
            error: 'Este correo aún no está registrado. Crea tu cuenta con una contraseña personal.',
            needsRegistration: true,
          },
          { status: 404 }
        )
      }

      if (existing) {
        return NextResponse.json(
          { error: 'Este correo ya tiene cuenta. Usa "Iniciar sesión" con tu contraseña.' },
          { status: 409 }
        )
      }

      if (!nombre || nombre.length < 3) {
        return NextResponse.json(
          { error: 'Escribe tu nombre completo para crear la cuenta' },
          { status: 400 }
        )
      }

      if (!confirmPassword || confirmPassword !== password) {
        return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
      }

      const hash = await hashPassword(password)
      const rolId = await ensureDocenteRol()
      const turnoId = await ensureTurnoId()

      await ensureMaestroIdSequence()
      await ensureContrasenaPlanaColumn()
      const inserted = await query<{ maestro_id: number }>(
        `
        INSERT INTO principal.maestros (nombre, email, contrasena, contrasena_plana, rol_id, turno_id, activo)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING maestro_id
        `,
        [nombre, email, hash, password, rolId, turnoId]
      )

      if (!inserted.rows[0]?.maestro_id) {
        return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 })
      }

      const maestro = await fetchMaestroByEmail(email)
      if (!maestro) {
        return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 })
      }

      const user = userPayload(maestro)
      const token = generateToken({
        maestro_id: maestro.maestro_id,
        nombre: maestro.nombre,
        rol: maestro.rol_nombre,
        rol_id: maestro.rol_id,
        rol_sesion: user.rol_sesion || undefined,
      })

      return NextResponse.json({
        token,
        user,
        registered: true,
        needsRoleSelection: user.needsRoleSelection,
      })
    }

    const valid = await verifyMaestroPassword(
      password,
      existing.contrasena as string,
      existing.contrasena_plana as string
    )
    if (!valid) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta. Use la misma que eligió al crear su cuenta.' },
        { status: 401 }
      )
    }

    await saveContrasenaPlana(Number(existing.maestro_id), password)
    await upgradePasswordHashIfNeeded(
      Number(existing.maestro_id),
      password,
      existing.contrasena as string
    )

    const user = userPayload(existing)
    const token = generateToken({
      maestro_id: existing.maestro_id,
      nombre: existing.nombre,
      rol: existing.rol_nombre,
      rol_id: existing.rol_id,
      rol_sesion: user.rol_sesion || undefined,
    })

    return NextResponse.json({
      token,
      user,
      needsRoleSelection: user.needsRoleSelection,
      rol_sesion: user.rol_sesion as SessionRoleId | null,
    })
  } catch (e: unknown) {
    const err = e as { message?: string; detail?: string; code?: string }
    console.error('[auth POST]', err)
    const msg = err.detail || err.message || ''
    let error =
      'No se pudo conectar con la base de datos. Reinicie con npm run dev (inicia PostgreSQL automáticamente).'
    if (err.code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) {
      error =
        'PostgreSQL no está activo en el puerto 5432. Detén el servidor y ejecuta npm run dev desde la carpeta del proyecto.'
    } else if (msg.includes('after calling end on the pool')) {
      error = 'Error interno de conexión. Recarga la página; si persiste, reinicia npm run dev.'
    } else if (msg) {
      error = msg
    }
    return NextResponse.json({ error }, { status: 500 })
  }
}
