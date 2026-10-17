import { NextRequest, NextResponse } from 'next/server'
import { getRequestAuth } from '@/lib/api-auth'
import { saveAvatarSexo } from '@/lib/maestro-avatar'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest) {
  const auth = await getRequestAuth(req)
  if (!auth) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const sexo = body?.sexo === 'M' || body?.sexo === 'H' ? body.sexo : null
  if (!sexo) {
    return NextResponse.json({ error: 'Elige mujer u hombre' }, { status: 400 })
  }

  await saveAvatarSexo(auth.maestro_id, sexo)
  return NextResponse.json({ avatar_sexo: sexo })
}
