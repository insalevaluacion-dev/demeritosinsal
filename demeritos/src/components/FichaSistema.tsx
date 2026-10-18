'use client'

import { useEffect, useState } from 'react'

const HERRAMIENTAS = ['Next.js', 'React', 'PostgreSQL']

export default function FichaSistema() {
  const [abierta, setAbierta] = useState(false)

  useEffect(() => {
    if (!abierta) return
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierta(false)
    }
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [abierta])

  return (
    <>
      <button
        type="button"
        className="ficha-ayuda"
        aria-label="Acerca del sistema"
        onClick={() => setAbierta(true)}
      >
        ?
      </button>
      {abierta && (
        <div className="modal-overlay" onClick={() => setAbierta(false)}>
          <div
            className="modal-box ficha-sistema"
            role="dialog"
            aria-labelledby="ficha-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ficha-titulo">Sistema de Deméritos (INSAL)</h2>
            <p>
              Creado con el propósito de facilitar el trabajo docente en el ámbito y gestión de deméritos, reconocimientos y redenciones.
            </p>
            <dl>
              <div>
                <dt>Desarrollador del sistema</dt>
                <dd>Diego Antonio Ramos Rodriguez</dd>
              </div>
              <div>
                <dt>Asistente de desarrollo</dt>
                <dd>José Javier Bojorquéz Menjivar</dd>
              </div>
              <div>
                <dt>Versión</dt>
                <dd>1.0.0</dd>
              </div>
              <div>
                <dt>Herramientas de desarrollo</dt>
                <dd>{HERRAMIENTAS.join(' · ')}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={() => setAbierta(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
