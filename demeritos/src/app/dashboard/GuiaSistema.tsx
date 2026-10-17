'use client'

import { useEffect, useState } from 'react'

const PASOS = [
  {
    id: 'inicio',
    titulo: 'Inicio',
    texto: 'Resume el día: saludo y fecha. «Cómo funciona» vuelve a abrir esta guía.',
  },
  {
    id: 'numeros',
    titulo: 'Los números',
    texto: 'Matrícula, deméritos de hoy, los que siguen activos, reconocimientos y redenciones.',
  },
  {
    id: 'anios',
    titulo: 'El año',
    texto: 'Filtra las gráficas y el top por 1.°, 2.° o 3.° año.',
  },
  {
    id: 'meses',
    titulo: 'Por mes',
    texto: 'Cuántos deméritos hubo cada mes. Rosa: mujeres. Azul: hombres.',
  },
  {
    id: 'especialidades',
    titulo: 'Por especialidad',
    texto: 'Qué parte de los deméritos activos tiene cada especialidad. La barra abre esa lista.',
  },
  {
    id: 'actividad',
    titulo: 'Actividad',
    texto: 'Lo último registrado. Al tocarlo se abre el expediente.',
  },
  {
    id: 'incidencias',
    titulo: 'Top',
    texto: 'Quién tiene más deméritos sin redimir. 6 avisa a la familia, 10 suspende, 15 no promueve.',
  },
  {
    id: 'menu',
    titulo: 'El menú',
    texto: 'Entra a estudiantes, registros, historial, reportes y avisos.',
  },
]

export default function GuiaSistema({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [paso, setPaso] = useState(0)
  const actual = PASOS[paso]

  useEffect(() => {
    document.body.classList.toggle('guia-abierta', open)
    document.body.classList.toggle('guia-menu', open && actual.id === 'menu')
    document.querySelectorAll('.guia-foco').forEach((el) => el.classList.remove('guia-foco'))
    if (!open) return
    const target = document.querySelector(`[data-guia="${actual.id}"]`)
    if (target) {
      target.classList.add('guia-foco')
      target.scrollIntoView({ behavior: 'smooth', block: actual.id === 'menu' ? 'nearest' : 'center' })
    }
    return () => {
      document.body.classList.remove('guia-abierta', 'guia-menu')
      document.querySelectorAll('.guia-foco').forEach((el) => el.classList.remove('guia-foco'))
    }
  }, [open, actual.id])

  if (!open) return null

  return (
    <>
    <div className="guia-velo" aria-hidden />
    <aside className="guia-panel" role="dialog" aria-labelledby="guia-titulo">
      <p className="guia-kicker">Para qué sirve · {paso + 1}/{PASOS.length}</p>
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
    </>
  )
}
