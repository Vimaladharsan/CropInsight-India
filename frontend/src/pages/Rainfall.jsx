import { useEffect, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Line, Area,
  Legend,
} from 'recharts'
import { getRainfall } from '../api'

const rColor = r => {
  if (r == null) return 'var(--text-muted)'
  if (r >= 0.5) return '#22c55e'
  if (r >= 0.2) return '#f59e0b'
  if (r >= 0) return 'var(--text-muted)'
  if (r >= -0.2) return '#f59e0b'
  return '#ef4444'
}

const rLabel = r => {
  if (r == null) return '—'
  if (r >= 0.6) return 'Strong positive'
  if (r >= 0.3) return 'Moderate positive'
  if (r >= 0.1) return 'Weak positive'
  if (r >= -0.1) return 'No correlation'
  if (r >= -0.3) return 'Weak negative'
  if (r >= -0.6) return 'Moderate negative'
  return 'Strong negative'
}

const ScatterDot = ({ cx, cy, payload }) => {
  if (!cx || !cy) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#22c55e" fillOpacity={0.7} stroke="#16a34a" strokeWidth={1.5} />
      {payload?.State && (
        <text x={cx + 8} y={cy + 4} fontSize={9} fill="var(--text-muted)" textAnchor="start">
          {payload.State.length > 12 ? payload.State.slice(0, 11) + '…' : payload.State}
        </text>
      )}
    </g>
  )
}

const CustomScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.State}</div>
      <div style={{ color: '#3b82f6' }}>Annual rainfall: <strong>{d.avg_rainfall?.toFixed(0)} mm</strong></div>
      <div style={{ color: '#22c55e' }}>Avg yield: <strong>{d.avg_yield?.toFixed(3)} t/ha</strong></div>
      {d.avg_monsoon != null && <div style={{ color: '#a855f7' }}>Monsoon: <strong>{d.avg_monsoon?.toFixed(0)} mm</strong></div>}
    </div>
  )
}

const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v?.toFixed(1)

export default function Rainfall() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('scatter')

  useEffect(() => {
    getRainfall()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'); setLoading(false) })
  }, [])

  const r = data?.pearson_r_annual
  const rm = data?.pearson_r_monsoon

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Rainfall vs Yield</h2>
          <p>Pearson correlation between annual/monsoon rainfall and crop yield across Indian states, 1997–2015</p>
        </div>
        {data?.available && (
          <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
            🌧 {data.pairs_count} state×year pairs · {data.states_count} states
          </div>
        )}
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-line" style={{ width: `${90 - i * 10}%`, height: 32 }} />)}
        </div>
      )}

      {/* Dataset not found */}
      {data && !data.available && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '2rem', maxWidth: 600 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>🌧</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Rainfall dataset not found</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: 16 }}>
            Download the <strong>Rainfall in India 1901–2015</strong> dataset from Kaggle and place it in the <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>data/</code> folder.
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            Search Kaggle: <strong>"rainfall in india 1901 2015"</strong><br />
            Filename: <strong>rainfall in india 1901-2015.csv</strong><br />
            Place at: <strong>data/rainfall_in_india_1901-2015.csv</strong>
          </div>
        </div>
      )}

      {data?.available && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* KPI row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              {
                label: 'Annual Rainfall r',
                value: r != null ? r.toFixed(4) : '—',
                sub: rLabel(r),
                color: rColor(r),
                icon: '🌧',
              },
              {
                label: 'Monsoon (Jun–Sep) r',
                value: rm != null ? rm.toFixed(4) : '—',
                sub: rLabel(rm),
                color: rColor(rm),
                icon: '⛈',
              },
              {
                label: 'p-value (annual)',
                value: data.p_value_annual != null ? data.p_value_annual.toFixed(5) : '—',
                sub: data.p_value_annual < 0.05 ? 'Statistically significant' : 'Not significant',
                color: data.p_value_annual < 0.05 ? '#22c55e' : '#f59e0b',
                icon: '📊',
              },
              {
                label: 'States analysed',
                value: data.states_count,
                sub: `${data.pairs_count} state×year pairs`,
                color: '#3b82f6',
                icon: '🗺',
              },
            ].map(({ label, value, sub, color, icon }) => (
              <div key={label} style={{ flex: '1 1 160px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{icon} {label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'scatter', label: 'Scatter Plot' },
              { id: 'trend', label: 'Yearly Trend' },
              { id: 'states', label: 'State Correlations' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                style={{
                  padding: '0.45rem 1rem', borderRadius: 7, fontSize: '0.82rem', fontWeight: 600,
                  border: `1px solid ${view === id ? 'var(--accent)' : 'var(--border)'}`,
                  background: view === id ? 'var(--accent-dim)' : 'var(--surface)',
                  color: view === id ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scatter plot */}
          {view === 'scatter' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div className="chart-title" style={{ marginBottom: 4 }}>Annual Rainfall vs Average Yield by State</div>
              <div className="chart-sub" style={{ marginBottom: 16 }}>Each point = one state averaged over 1997–2015 · r = {r}</div>
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number" dataKey="avg_rainfall" name="Annual Rainfall"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                    label={{ value: 'Annual Rainfall (mm)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number" dataKey="avg_yield" name="Avg Yield"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                    label={{ value: 'Avg Yield (t/ha)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomScatterTooltip />} />
                  <Scatter data={data.scatter} shape={<ScatterDot />} />
                </ScatterChart>
              </ResponsiveContainer>
              <div className="info-banner" style={{ marginTop: 12 }}>
                Pearson r = {r} ({rLabel(r)}) · p = {data.p_value_annual} ·
                {data.p_value_annual < 0.05
                  ? ' The correlation is statistically significant (p < 0.05).'
                  : ' The correlation is not statistically significant at p < 0.05.'}
              </div>
            </div>
          )}

          {/* Yearly trend */}
          {view === 'trend' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div className="chart-title" style={{ marginBottom: 4 }}>National Average — Rainfall &amp; Yield, 1997–2015</div>
              <div className="chart-sub" style={{ marginBottom: 16 }}>Dual axis: rainfall (mm) left · yield (t/ha) right</div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={data.yearly} margin={{ top: 10, right: 50, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rain" orientation="left" tick={{ fill: '#3b82f6', fontSize: 11 }} axisLine={false} tickLine={false}
                    label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 10 }} />
                  <YAxis yAxisId="yield" orientation="right" tick={{ fill: '#22c55e', fontSize: 11 }} axisLine={false} tickLine={false}
                    label={{ value: 'Yield (t/ha)', angle: 90, position: 'insideRight', fill: '#22c55e', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [v?.toFixed(2), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                  <Area yAxisId="rain" type="monotone" dataKey="avg_rainfall" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth={2} name="Annual Rainfall (mm)" dot={false} />
                  {data.yearly[0]?.avg_monsoon != null && (
                    <Line yAxisId="rain" type="monotone" dataKey="avg_monsoon" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 2" name="Monsoon Rainfall (mm)" dot={false} />
                  )}
                  <Line yAxisId="yield" type="monotone" dataKey="avg_yield" stroke="#22c55e" strokeWidth={2.5} name="Avg Yield (t/ha)" dot={{ fill: '#22c55e', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* State correlations */}
          {view === 'states' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div className="chart-title" style={{ marginBottom: 4 }}>Rainfall–Yield Correlation by State</div>
              <div className="chart-sub" style={{ marginBottom: 16 }}>Pearson r computed from {'{'}each state's annual data 1997–2015{'}'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {data.state_correlations.map(s => (
                  <div key={s.state} style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '0.9rem 1rem',
                    borderLeft: `3px solid ${rColor(s.pearson_r)}`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      width: `${Math.abs(s.pearson_r) * 60}%`,
                      background: `${rColor(s.pearson_r)}10`,
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.state}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {s.years} years · {s.avg_rainfall?.toFixed(0)} mm avg rainfall
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: rColor(s.pearson_r) }}>{s.pearson_r > 0 ? '+' : ''}{s.pearson_r}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{rLabel(s.pearson_r)}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 6, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${Math.abs(s.pearson_r) * 100}%`,
                        background: rColor(s.pearson_r),
                        marginLeft: s.pearson_r < 0 ? 'auto' : undefined,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="info-banner">
            Rainfall data: IMD meteorological subdivisions mapped to states. Multiple subdivisions per state are averaged.
            Monsoon (Jun–Sep) rainfall drives Kharif crop yield — a higher monsoon r than annual r is expected.
            Correlation ≠ causation; soil type, irrigation, and crop mix are confounders not captured here.
          </div>
        </div>
      )}
    </>
  )
}
