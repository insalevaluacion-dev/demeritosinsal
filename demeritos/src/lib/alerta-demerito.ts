export type NivelAlerta = 0 | 1 | 2 | 3

/** 6 avisa a la familia, 10 suspende, 15 no promueve. */
export function nivelAlertaDemeritos(totalActivos: number): NivelAlerta {
  if (totalActivos >= 15) return 3
  if (totalActivos >= 10) return 2
  if (totalActivos >= 6) return 1
  return 0
}

export function tituloAlertaDemeritos(nivel: NivelAlerta): string {
  if (nivel >= 3) return 'CRÍTICO: Alumno no puede ser promovido'
  if (nivel === 2) return 'Suspensión de privilegios'
  if (nivel === 1) return 'Comunicar a familia'
  return 'Nuevo Demérito Registrado'
}

/** Texto del aviso antes de guardar. `activos` es el total actual, sin el que se va a registrar. */
export function textoProximoDemerito(activos: number): string {
  const siguiente = activos + 1
  const nivel = nivelAlertaDemeritos(siguiente)
  if (nivel >= 3) {
    return `Con este demérito quedará en ${siguiente} activos. Ya no puede ser promovido.`
  }
  if (nivel === 2) {
    return `Con este demérito quedará en ${siguiente} activos. Corresponde suspensión de privilegios.`
  }
  if (nivel === 1) {
    return `Con este demérito quedará en ${siguiente} activos. Hay que avisar a la familia.`
  }
  const lleva = activos === 1 ? '1 demérito activo' : `${activos} deméritos activos`
  return `Tiene ${lleva}. Este sería el ${siguiente}.`
}
