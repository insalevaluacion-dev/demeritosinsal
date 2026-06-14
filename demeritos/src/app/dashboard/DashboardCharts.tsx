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
import AppIcon from '@/components/AppIcon'

const PIE_COLORS = ['#0f5aab', '#fa8d08', '#d62b0f', '#1a7a45', '#c9942a', '#1a6bc7', '#7c3aed']

type Props = {
  porMes: any[]
  porEsp: any[]
}

export default function DashboardCharts({ porMes, porEsp }: Props) {
  return (
    <div className="grid-charts">
      <div className="card" style={{ padding: 20 }}>
        <h3
          style={{
            fontWeight: 700,
            marginBottom: 16,
            fontSize: 15,
            color: 'var(--txt)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AppIcon name="chart" size={18} /> Deméritos por Mes
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

      <div className="card" style={{ padding: 20 }}>
        <h3
          style={{
            fontWeight: 700,
            marginBottom: 16,
            fontSize: 15,
            color: 'var(--txt)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AppIcon name="graduationCap" size={18} /> Por Especialidad
        </h3>
        {porEsp.length > 0 ? (
          <div className="chart-box" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porEsp}
                  dataKey="demeritos"
                  nameKey="especialidad"
                  cx="50%"
                  cy="50%"
                  outerRadius={68}
                  innerRadius={0}
                >
                  {porEsp.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--soft)', textAlign: 'center', padding: 40 }}>Sin datos</p>
        )}
      </div>
    </div>
  )
}
