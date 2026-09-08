import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'
import { normalizeClasesEmail } from '@/lib/auth-email'
import { saveContrasenaPlana } from '@/lib/ensure-contrasena-plana'
import { fetchMaestroByEmail } from '@/lib/fetch-maestro'
import { upgradePasswordHashIfNeeded, verifyMaestroPassword } from '@/lib/maestro-password'
import type { SessionRoleId } from '@/lib/session-roles'

export const runtime = 'nodejs'

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = normalizeClasesEmail(body.email || '')
    const password = String(body.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son obligatorios' }, { status: 400 })
    }

    if (body.register) {
      return NextResponse.json(
        { error: 'No se pueden crear cuentas aquí. Use el correo y la contraseña del sistema principal.' },
        { status: 400 }
      )
    }

    const existing = await fetchMaestroByEmail(email)

    if (!existing) {
      return NextResponse.json(
        { error: 'Este correo no está en el sistema principal. Use el mismo correo con el que inicia sesión allá.' },
        { status: 404 }
      )
    }

    const valid = await verifyMaestroPassword(
      password,
      existing.contrasena as string,
      existing.contrasena_plana as string
    )
    if (!valid) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta. Use la misma del sistema principal.' },
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
