import type { ReactNode } from 'react'

export default function PageHero({
  title,
  subtitle,
  hint,
  children,
}: {
  title: string
  subtitle?: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <header className="dash-hero page-hero">
      <div>
        <p className="dash-kicker">Instituto Nacional San Luis</p>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        {hint ? <p className="page-hero-hint">{hint}</p> : null}
      </div>
      {children ? <div className="page-hero-actions">{children}</div> : null}
    </header>
  )
}
