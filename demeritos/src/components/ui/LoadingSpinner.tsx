'use client'

type Props = {
  label?: string
  fullScreen?: boolean
}

export default function LoadingSpinner({ label = 'Cargando...', fullScreen }: Props) {
  if (fullScreen) {
    return (
      <>
        <div className="spinner" aria-hidden />
        <span>{label}</span>
      </>
    )
  }
  return (
    <div className="loading-root" style={{ padding: 48 }}>
      <div className="spinner" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function LoadingSpinnerInline({ label = 'Cargando...' }: { label?: string }) {
  return (
    <>
      <div className="spinner" aria-hidden />
      <span>{label}</span>
    </>
  )
}
