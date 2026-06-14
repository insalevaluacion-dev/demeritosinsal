import { Suspense } from 'react'
import ExpedienteClient from './ExpedienteClient'
import { decodeNieParam } from '@/lib/nie'

export default async function ExpedientePage({
  params,
}: {
  params: Promise<{ nie: string }>
}) {
  const { nie: raw } = await params
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, color: 'var(--soft)' }}>Cargando expediente...</div>}>
      <ExpedienteClient nie={decodeNieParam(raw)} />
    </Suspense>
  )
}
