/** Normaliza NIE para comparar y guardar (trim, sin espacios extra). */
export function normalizeNie(nie: string): string {
  return nie.trim().replace(/\s+/g, '')
}

export function decodeNieParam(raw: string): string {
  try {
    return normalizeNie(decodeURIComponent(raw))
  } catch {
    return normalizeNie(raw)
  }
}

export function expedientePath(nie: string): string {
  return `/dashboard/estudiantes/${encodeURIComponent(normalizeNie(nie))}`
}

export function nuevoDemeritoPath(nie: string): string {
  return `/dashboard/demeritos/nuevo?nie=${encodeURIComponent(normalizeNie(nie))}`
}

export function nuevoReconocimientoPath(nie: string): string {
  return `/dashboard/reconocimientos/nuevo?nie=${encodeURIComponent(normalizeNie(nie))}`
}
