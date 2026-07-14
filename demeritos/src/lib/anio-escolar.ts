/**
 * Año lectivo activo.
 * Por defecto: año calendario actual (funciona sin cambios en años futuros).
 * Opcional: ANIO_ESCOLAR=2027 en variables de entorno (Railway / .env).
 */
function resolveAnioEscolar(): number {
  const fromEnv = Number.parseInt(String(process.env.ANIO_ESCOLAR || '').trim(), 10)
  if (Number.isFinite(fromEnv) && fromEnv >= 2000 && fromEnv <= 2100) return fromEnv
  return new Date().getFullYear()
}

export const ANIO_ESCOLAR = resolveAnioEscolar()
