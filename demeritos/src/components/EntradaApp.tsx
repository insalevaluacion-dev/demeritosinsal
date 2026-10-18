'use client'

import { useEffect, useState } from 'react'

const CHIPS = ['Deméritos', 'Reconocimientos', 'Redenciones']

export default function EntradaApp() {
  const [fase, setFase] = useState<'off' | 'in' | 'out'>('off')

  useEffect(() => {
    const root = document.documentElement
    let pendiente = root.classList.contains('entrada-pendiente')
    if (!pendiente) {
      try {
        pendiente = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      } catch {
        pendiente = true
      }
      if (pendiente) root.classList.add('entrada-pendiente')
    }
    if (!pendiente) return

    setFase('in')
    const sale = window.setTimeout(() => setFase('out'), 4500)
    const fin = window.setTimeout(() => {
      root.classList.remove('entrada-pendiente')
      setFase('off')
    }, 5300)

    return () => {
      window.clearTimeout(sale)
      window.clearTimeout(fin)
    }
  }, [])

  if (fase === 'off') return null

  return (
    <div className={`entrada${fase === 'out' ? ' entrada--sale' : ''}`} aria-hidden>
      <div className="entrada__luz" />
      <div className="entrada__barrido" />
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`entrada__punto entrada__punto--${i + 1}`} />
      ))}
      <div className="entrada__centro">
        <div className="entrada__medalla">
          <svg className="entrada__aro" viewBox="0 0 140 140" aria-hidden>
            <circle className="entrada__aro-base" cx="70" cy="70" r="64" />
            <circle className="entrada__aro-trazo" cx="70" cy="70" r="64" />
          </svg>
          <span className="entrada__orbita" />
          <img src="/insal-logo.png" alt="" width={108} height={108} className="entrada__logo" />
        </div>
        <p className="entrada__kicker">Instituto Nacional San Luis</p>
        <h1 className="entrada__titulo">
          <span>Sistema</span>
          <span>de deméritos</span>
        </h1>
        <div className="entrada__linea" />
        <ul className="entrada__chips">
          {CHIPS.map((chip) => (
            <li key={chip}>{chip}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
