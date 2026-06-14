export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('es-SV', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('es-SV', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

export const ESPECIALIDADES: Record<string, string> = {
  'G':   'General',
  'APS': 'Salud y Bienestar Social',
  'SE':  'Sistemas Eléctricos',
  'LyA': 'Logística y Aduanas',
  'AC':  'Administrativo Contable',
  'DS':  'Desarrollo de Software',
  'DG':  'Diseño Gráfico',
}

export const ROLES_DISPLAY: Record<string, string> = {
  'director':      'Director/a',
  'administrador': 'Coordinador/a',
  'docente':       'Maestro/a',
}

export const NIVEL_LABEL: Record<number, string> = {
  1: '1 Año',
  2: '2 Año',
  3: '3 Año',
}

export const NIVELES_OPCIONES = [
  { id: '', label: 'Todos los años' },
  { id: '1', label: '1 Año' },
  { id: '2', label: '2 Año' },
  { id: '3', label: '3 Año' },
] as const

type GradoNivelLike = { nivel?: number | string | null; nivel_nombre?: string | null } | null | undefined

export function labelNivel(gradoOrNivel: GradoNivelLike | number | string | null | undefined): string {
  if (gradoOrNivel != null && typeof gradoOrNivel === 'object') {
    if (gradoOrNivel.nivel_nombre) return String(gradoOrNivel.nivel_nombre)
    const n = Number(gradoOrNivel.nivel)
    if (!Number.isNaN(n) && NIVEL_LABEL[n]) return NIVEL_LABEL[n]
    return ''
  }
  const n = Number(gradoOrNivel)
  if (!Number.isNaN(n) && NIVEL_LABEL[n]) return NIVEL_LABEL[n]
  return ''
}

export function labelGradoOpcion(g: {
  nivel?: number | string | null
  nivel_nombre?: string | null
  especialidad?: string | null
  seccion_letra?: string | null
}): string {
  const parts = [
    labelNivel(g),
    ESPECIALIDADES[g.especialidad || ''] || g.especialidad,
    g.seccion_letra,
  ].filter(Boolean)
  return parts.join(' ')
}
