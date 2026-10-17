'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts'
import Link from 'next/link'
import AppIcon from '@/components/AppIcon'
import { ESPECIALIDADES } from '@/lib/utils'

const PIE_COLORS = ['#0f5aab', '#fa8d08', '#d62b0f', '#1a7a45', '#c9942a', '#1a6bc7', '#7c3aed']

type EspRow = {
  especialidad: string
  nombre: string
  estudiantes: number
  con_demerito: number
  demeritos: number
  porcentaje: number
  tasa: number
}

type Props = {
  porMes: any[]
  porEsp: any[]
  nivel?: string
}

function especialidadRows(porEsp: any[]): EspRow[] {
  return porEsp
    .map((row) => {
      const codigo = String(row.especialidad || '')
      return {
        especialidad: codigo,
        nombre: ESPECIALIDADES[codigo] || codigo || 'Sin especialidad',
        estudiantes: Number(row.estudiantes) || 0,
        con_demerito: Number(row.con_demerito) || 0,
        demeritos: Number(row.demeritos) || 0,
        porcentaje: Number(row.porcentaje) || 0,
        tasa: Number(row.tasa) || 0,
      }
    })
    .filter((row) => row.estudiantes > 0 || row.demeritos > 0)
}

export default function DashboardCharts({ porMes, porEsp, nivel = '' }: Props) {
  const especialidades = especialidadRows(porEsp)
  const conDemeritos = especialidades.filter((row) => row.demeritos > 0)

  return (
    <div className="grid-charts">
      <div className="card dash-chart-card" style={{ padding: 20 }} data-guia="meses">
        <h3 className="dash-chart-title">
          <AppIcon name="chart" size={18} /> Deméritos por mes
        </h3>
        {porMes.length > 0 ? (
          <>
            <div className="chart-box" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes_nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                  <Tooltip
                    labelFormatter={(label) => `Mes: ${label}`}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0]?.payload as {
                        total?: number
                        mujeres?: number
                        hombres?: number
                      }
                      return (
                        <div
                          style={{
                            background: '#fff',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                          <div>
                            Total: <strong>{row.total ?? 0}</strong>
                          </div>
                          <div style={{ color: '#c026d3' }}>
                            Mujeres: <strong>{row.mujeres ?? 0}</strong>
                          </div>
                          <div style={{ color: 'var(--azul)' }}>
                            Hombres: <strong>{row.hombres ?? 0}</strong>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Legend
                    formatter={(v) => (v === 'mujeres' ? 'Mujeres' : v === 'hombres' ? 'Hombres' : v)}
                  />
                  <Bar dataKey="mujeres" name="mujeres" stackId="sexo" fill="#c026d3" />
                  <Bar dataKey="hombres" name="hombres" stackId="sexo" fill="var(--azul)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: 11, color: 'var(--soft)', marginTop: 10, textAlign: 'center' }}>
              Total por mes = mujeres + hombres con demérito registrado
            </p>
          </>
        ) : (
          <p style={{ color: 'var(--soft)', textAlign: 'center', padding: 40 }}>Sin datos</p>
        )}
      </div>

      <div className="card dash-chart-card" style={{ padding: 20 }} data-guia="especialidades">
        <h3 className="dash-chart-title">
          <AppIcon name="graduationCap" size={18} /> Porcentajes por especialidad
        </h3>
        <p className="dash-chart-note">
          La dona es el porcentaje del total de deméritos activos. La barra es el porcentaje de estudiantes de esa especialidad que ya tienen al menos uno.
        </p>
        {especialidades.length > 0 ? (
          <>
            {conDemeritos.length > 0 ? (
              <div className="chart-box" style={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={conDemeritos}
                      dataKey="porcentaje"
                      nameKey="nombre"
                      cx="50%"
                      cy="46%"
                      outerRadius={72}
                      innerRadius={42}
                      paddingAngle={2}
                      label={({ payload }) => {
                        const pct = Number((payload as EspRow | undefined)?.porcentaje) || 0
                        return pct >= 8 ? `${pct}%` : ''
                      }}
                    >
                      {conDemeritos.map((row, i) => (
                        <Cell key={row.especialidad || i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const row = payload[0].payload as EspRow
                        return (
                          <div className="dash-tip">
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{row.nombre}</div>
                            <div>{row.porcentaje}% de los deméritos activos ({row.demeritos})</div>
                            <div>{row.tasa}% de sus estudiantes ({row.con_demerito} de {row.estudiantes})</div>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="dash-chart-empty">Todavía no hay deméritos activos para repartir el porcentaje.</p>
            )}
            <ul className="esp-bars">
              {especialidades.map((row, i) => (
                <li key={row.especialidad || row.nombre}>
                  <Link
                    className="esp-bars__link"
                    href={`/dashboard/estudiantes?especialidad=${encodeURIComponent(row.especialidad)}${nivel ? `&nivel=${nivel}` : ''}`}
                  >
                  <div className="esp-bars__head">
                    <span>
                      <i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {row.nombre}
                    </span>
                    <strong>{row.tasa}%</strong>
                  </div>
                  <div className="esp-bars__track">
                    <div style={{ width: `${Math.min(row.tasa, 100)}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                  <p>
                    {row.con_demerito} de {row.estudiantes} estudiantes · {row.porcentaje}% del total de deméritos
                  </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="dash-chart-empty">Sin especialidades con estudiantes este año.</p>
        )}
      </div>
    </div>
  )
}
