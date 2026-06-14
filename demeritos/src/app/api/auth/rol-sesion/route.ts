import { NextRequest, NextResponse } from 'next/server'

import { generateToken, verifyToken } from '@/lib/auth'

import { fetchRolSesion, saveMaestroRolSesion } from '@/lib/maestro-rol-sesion'

import { isSessionRoleId, type SessionRoleId } from '@/lib/session-roles'



export const runtime = 'nodejs'



export async function POST(req: NextRequest) {

  try {

    const auth = req.headers.get('authorization')?.slice(7) || ''

    const payload = verifyToken(auth) as {

      maestro_id?: number

      nombre?: string

      rol?: string

      rol_id?: number

    } | null

    if (!payload?.maestro_id) {

      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

    }



    const body = await req.json()

    const sessionRole = String(body.sessionRole || '').trim()

    if (!isSessionRoleId(sessionRole)) {

      return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })

    }



    const existing = await fetchRolSesion(payload.maestro_id)

    let finalRole: SessionRoleId = sessionRole



    if (existing) {

      if (existing !== sessionRole) {

        return NextResponse.json(

          {

            error: 'Ya elegiste un rol para esta cuenta. No puedes cambiarlo.',

            rol_sesion: existing,

          },

          { status: 409 }

        )

      }

      finalRole = existing

    } else {

      await saveMaestroRolSesion(payload.maestro_id, sessionRole)

      const saved = await fetchRolSesion(payload.maestro_id)

      if (!saved) {

        return NextResponse.json({ error: 'No se pudo guardar el rol' }, { status: 500 })

      }

      finalRole = saved

    }



    const token = generateToken({

      maestro_id: payload.maestro_id,

      nombre: payload.nombre,

      rol: payload.rol,

      rol_id: payload.rol_id,

      rol_sesion: finalRole,

    })



    return NextResponse.json({ ok: true, rol_sesion: finalRole, token })

  } catch (e) {

    console.error('[auth/rol-sesion POST]', e)

    return NextResponse.json({ error: 'Error al guardar el rol' }, { status: 500 })

  }

}

