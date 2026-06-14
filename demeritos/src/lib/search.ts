/** Normaliza texto para búsqueda sin distinguir tildes (López = Lopez). */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

/** Divide la consulta en palabras (nombre, apellido, NIE parcial, etc.). */
export function searchTokens(q: string): string[] {
  return normalizeSearchText(q)
    .split(/\s+/)
    .filter(Boolean)
}

function escapeIlikeToken(token: string): string {
  return `%${token.replace(/[%_\\]/g, '\\$&')}%`
}

/** Patrón ILIKE con comodines, sin acentos en el término buscado. */
export function searchPattern(q: string): string {
  return escapeIlikeToken(normalizeSearchText(q))
}

/** Expresión SQL: nombre sin acentos ILIKE patrón. */
export const SQL_NOMBRE_SIN_ACENTOS = `LOWER(translate(e.nombre_completo,
  'áàäâãåéèëêíìïîóòöôõúùüûñÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑ',
  'aaaaaaeeeeiiiiooooouuuunAAAAAAEEEEIIIIOOOOOUUUUN'
))`

/**
 * Condición SQL: cada palabra debe coincidir en nombre o NIE (cualquier orden, sin tildes ni mayúsculas).
 * Devuelve null si no hay término de búsqueda.
 */
export function buildEstudianteSearchCondition(q: string, params: unknown[]): string | null {
  const tokens = searchTokens(q)
  if (tokens.length === 0) return null

  const parts = tokens.map((token) => {
    params.push(escapeIlikeToken(token))
    const p = `$${params.length}`
    return `((${SQL_NOMBRE_SIN_ACENTOS}) ILIKE ${p} OR LOWER(e.nie) ILIKE ${p})`
  })

  return parts.join(' AND ')
}
