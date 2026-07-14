import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ANIO_ESCOLAR } from '@/lib/anio-escolar'

export const dynamic = 'force-dynamic'

/** Healthcheck liviano para Railway y keep-alive del APK. */
export async function GET() {
  let db: 'ok' | 'error' = 'ok'
  let dbDetail: string | undefined
  try {
    await query('SELECT 1 AS ok')
  } catch (e) {
    db = 'error'
    dbDetail = e instanceof Error ? e.message : String(e)
  }

  const healthy = db === 'ok'
  return NextResponse.json(
    {
      ok: healthy,
      service: 'demeritos-insal',
      anio_escolar: ANIO_ESCOLAR,
      db,
      ...(dbDetail ? { dbDetail } : {}),
      ts: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
