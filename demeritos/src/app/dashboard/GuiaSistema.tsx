'use client'

import { useEffect, useState } from 'react'

const PASOS = [
  {
    id: 'inicio',
    titulo: 'El inicio',
    texto:
      'Esta pantalla resume el bachillerato de hoy. Arriba está el saludo y la fecha. El botón «Cómo funciona» vuelve a abrir esta guía cuando quieras.',
  },
  {
    id: 'numeros',
    titulo: 'Los cinco números',
    texto:
      'Estudiantes es la matrícula activa del año. Deméritos de hoy son los registrados en esta fecha. Activos son los que todavía no se redimen. Reconocimientos y redenciones cuentan lo bueno y lo que ya se reparó.',
  },
  {
    id: 'meses',
    titulo: 'Deméritos por mes',
    texto:
      'Cada barra es un mes del año. El rosa son mujeres y el azul, hombres. Sirve para ver en qué meses se concentran las faltas, no para castigar un nombre.',
  },
  {
    id: 'especialidades',
    titulo: 'Porcentajes por especialidad',
    texto:
      'La dona reparte el 100% de los deméritos activos entre General, Software, Salud y el resto. La barra de abajo es otra cuenta: de los estudiantes de esa especialidad, qué porcentaje ya tiene al menos un demérito activo.',
  },
  {
    id: 'actividad',
    titulo: 'Actividad reciente',
    texto:
      'Los últimos deméritos y reconocimientos, con el estudiante, el motivo y quién lo registró. Es el pulso del día, de lo más nuevo a lo más viejo.',
  },
  {
    id: 'incidencias',
    titulo: 'Top de incidencias',
    texto:
      'Los estudiantes con más deméritos todavía sin redimir. El número rojo o naranja avisa cuando ya van varios. Al tocarlo se abre el expediente.',
  },
  {
    id: 'menu',
    titulo: 'El menú de la izquierda',
    texto:
      'Estudiantes: la lista y el expediente. Nuevo demérito y nuevo reconocimiento: el registro del día. Historial: lo ya anotado. Reportes: el Instrumento 002 para entregar. Notificaciones: avisos al estudiante. Dirección también ve maestros y administración.',
  },
]

export default function GuiaSistema({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [paso, setPaso] = useState(0)
  const actual = PASOS[paso]

  useEffect(() => {
    document.querySelectorAll('.guia-foco').forEach((el) => el.classList.remove('guia-foco'))
    if (!open) return
    const target = document.querySelector(`[data-guia="${actual.id}"]`)
    if (target) {
      target.classList.add('guia-foco')
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return () => {
      document.querySelectorAll('.guia-foco').forEach((el) => el.classList.remove('guia-foco'))
    }
  }, [open, actual.id])

  if (!open) return null

  return (
    <aside className="guia-panel" role="dialog" aria-labelledby="guia-titulo">
      <p className="guia-kicker">Guía · bloque {paso + 1} de {PASOS.length}</p>
      <h3 id="guia-titulo">{actual.titulo}</h3>
      <p>{actual.texto}</p>
      <div className="guia-dots" aria-hidden>
        {PASOS.map((item, i) => (
          <button key={item.id} type="button" className={i === paso ? 'is-on' : ''} onClick={() => setPaso(i)} />
        ))}
      </div>
      <div className="guia-actions">
        <button type="button" className="btn-outline" onClick={onClose}>
          Cerrar
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-outline" disabled={paso === 0} onClick={() => setPaso((n) => n - 1)}>
            Anterior
          </button>
          {paso < PASOS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setPaso((n) => n + 1)}>
              Siguiente
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={onClose}>
              Listo
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
