const CLASES_DOMAIN = '@clases.edu.sv'
const LOGIN_DOMAINS = ['@clases.edu.sv', '@insal.edu.sv', '@insl.edu.sv', '@mined.gob.sv']

export function isClasesEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(CLASES_DOMAIN)
}

/** Correos permitidos para iniciar sesión. */
export function isLoginEmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  return LOGIN_DOMAINS.some((d) => e.endsWith(d))
}

export function normalizeClasesEmail(email: string): string {
  return email.trim().toLowerCase()
}
