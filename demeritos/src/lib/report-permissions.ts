import type { SessionRoleId } from '@/lib/session-roles'

export type ReporteId =
  | 'institucional_mensual'
  | 'institucional_anual'
  | 'maestro_mensual'
  | 'maestro_diario'
  | 'demeritos'
  | 'estudiantes'
  | 'reconocimientos'

const INSTITUCIONAL: SessionRoleId[] = ['director', 'coordinador', 'subdirector']
const MAESTRO: SessionRoleId[] = ['docente']

export function isInstitucionalRole(rol: SessionRoleId): boolean {
  return INSTITUCIONAL.includes(rol)
}

export function canExportReporte(rol: SessionRoleId, reporte: ReporteId): boolean {
  if (reporte === 'institucional_mensual' || reporte === 'institucional_anual') {
    return isInstitucionalRole(rol)
  }
  if (reporte === 'maestro_mensual' || reporte === 'maestro_diario') {
    return MAESTRO.includes(rol) || isInstitucionalRole(rol)
  }
  if (reporte === 'estudiantes' || reporte === 'reconocimientos') {
    return isInstitucionalRole(rol)
  }
  if (reporte === 'demeritos') {
    return true
  }
  return false
}
