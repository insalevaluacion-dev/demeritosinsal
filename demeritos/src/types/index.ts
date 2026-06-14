export interface User {
  maestro_id: number
  nombre: string
  email?: string
  rol: string
  rol_id: number
  turno?: string
  materia?: string
  /** Rol elegido una sola vez en select-role (persistido en BD). */
  rol_sesion?: string | null
  needsRoleSelection?: boolean
}

export interface TokenPayload {
  maestro_id: number
  nombre: string
  rol: string
  rol_id: number
  sessionRole?: string
}

export interface Estudiante {
  estudiante_id: number
  nombre_completo: string
  nie: string
  fecha_de_nacimiento: string
  telefono: string
  direccion: string
  responsable: string
  telefono_responsable: string
  grado_id?: number
  seccion_id?: number
  anio_escolar: number
  estado: boolean
  foto_url?: string
  grado?: Grado
  seccion?: Seccion
}

export interface Grado {
  grado_id: number
  nivel: number
  nivel_nombre?: string
  especialidad: string
  seccion_letra: string
  activo: boolean
  anio_escolar: number
}

export interface Seccion {
  seccion_id: number
  grado_id: number
  turno_id: number
  grado?: Grado
  turno?: { turno_id: number; nombre: string }
}

export interface Maestro {
  maestro_id: number
  nombre: string
  email?: string
  rol_id: number
  turno_id?: number
  materia_id?: number
  activo: boolean
  rol?: { nombre: string }
  turno?: { nombre: string }
  materia?: { nombre: string }
}

export interface Demerito {
  id_demerito: number
  nie: string
  id_causal: number
  causal_letra: string
  id_maestro: number
  fecha: string
  observacion?: string
  redimido: boolean
  creado_en: string
  causal?: CausalDemerito
  maestro_nombre?: string
  es_externo?: boolean
}

export interface CausalDemerito {
  id_causal: number
  letra: string
  descripcion: string
}

export interface Reconocimiento {
  id_reconocimiento: number
  nie: string
  id_tipo: number
  tipo_letra: string
  id_maestro: number
  fecha: string
  observacion?: string
  creado_en: string
  tipo?: { descripcion: string }
  maestro_nombre?: string
}

export interface MovimientoRedencion {
  id_mov: number
  nie: string
  id_demerito: number
  id_opcion: number
  opcion_letra: string
  id_maestro: number
  observacion?: string
  fecha_hora: string
  opcion?: { descripcion: string }
  maestro_nombre?: string
}

export interface Notificacion {
  id_notif: number
  nie: string
  tipo: 'demerito' | 'reconocimiento' | 'redencion'
  nivel_alerta: number
  titulo: string
  mensaje: string
  leida: boolean
  fecha_hora: string
}

export interface DashboardStats {
  totalEstudiantes: number
  totalDemeritosHoy: number
  totalDemeritosActivos: number
  totalReconocimientos: number
  totalRedenciones: number
  recentActivity: ActivityItem[]
  topIncidencias: TopIncidencia[]
  porEspecialidad: EspecialidadStat[]
}

export interface ActivityItem {
  id: number
  tipo: string
  alumno: string
  nie: string
  descripcion: string
  maestro: string
  fecha: string
}

export interface TopIncidencia {
  nie: string
  nombre: string
  grado: string
  seccion: string
  total: number
}

export interface EspecialidadStat {
  especialidad: string
  total: number
  porcentaje: number
}
