import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth-edge'

const PUBLIC_PATHS = ['/login', '/api/auth', '/select-role', '/select-grado']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const payload = await verifyTokenEdge(auth.slice(7))
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ['/api/:path*', '/dashboard/:path*'] }
