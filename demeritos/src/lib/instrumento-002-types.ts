export type Instrumento002Header = {
  centroEducativo: string
  codigoCE: string
  departamento: string
  municipio: string
  distrito: string
  docente: string
  mesAnio: string
  grado: string
  seccion: string
  turno: string
}

export type FilaMesInstrumento002 = {
  mes: string
  mesNum: number
  matriculaM: number
  matriculaH: number
  demeritosM: number
  demeritosH: number
  causalA: number
  causalB: number
  causalC: number
  causalD: number
  redencionM: number
  redencionH: number
  redencionA: number
  redencionB: number
  redencionC: number
  reconocimientoM: number
  reconocimientoH: number
}

export type ResumenInstrumento002 = {
  alumnosM: number
  alumnosH: number
  alumnosTotal: number
  demeritosCausal: { A: number; B: number; C: number; D: number; total: number }
  demeritosSexo: { M: number; H: number; total: number }
  redencionesOpcion: { A: number; B: number; C: number; total: number }
  redencionesSexo: { M: number; H: number; total: number }
  reconocimientosSexo: { M: number; H: number; total: number }
  totalGeneral: number
}

export type Instrumento002Payload = {
  periodo: 'mensual' | 'anual'
  alcance: 'grado' | 'institucion'
  grado_id: number | null
  mes?: number
  anio: number
  header: Instrumento002Header
  filas: FilaMesInstrumento002[]
  totales: FilaMesInstrumento002
  resumen: ResumenInstrumento002
}
