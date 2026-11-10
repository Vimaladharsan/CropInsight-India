import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { getAnomalies } from '../api'

const THRESHOLDS = [1.5, 2.0, 2.5, 3.0]

function zColor(z) {
  const abs = Math.abs(z)
  const intensity = Math.min(1, (abs - 1.5) / 2.5)
  return z > 0
    ? `rgba(34,197,94,${0.25 + intensity * 0.75})`
    : `rgba(239,68,68,${0.25 + intensity * 0.75})`
}

function zTextColor(z) { return z > 0 ? '#16a34a' : '#dc2626' }

function severityLabel(z) {
  const a = Math.abs(z)
  if (a >= 4) return 'Extreme'
  if (a >= 3) return 'Severe'
  return 'Moderate'
}

function KPI({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem 1.25rem', boxShadow: 'var(--shadow-sm)', flex: '1 1 140px' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: accent || 'var(--accent)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function Anomaly() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(2.0)
  const [direction, setDirection] = useState('all')
  const [tab, setTab] = useState('table')

  useEffect(() => {
    setLoading(true)
    getAnomalies(threshold)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'); setLoading(false) })
  }, [threshold])

  const filtered = useMemo(() => {
    if (!data?.anomalies) return []
    if (direction === 'all') return data.anomalies
    return data.anomalies.filter(a => a.direction === direction)
  }, [data, direction])

  // Build heatmap structures
  const { states, years, cellMap } = useMemo(() => {
    if (!data?.heatmap) return { states: [], years: [], cellMap: {} }
    const stateSet = [...new Set(data.heatmap.map(h => h.state))].sort()
    const yearSet = [...new Set(data.heatmap.map(h => h.year))].sort()
    const map = {}
    data.heatmap.forEach(h => { map[`${h.state}__${h.year}`] = h })
    return { states: stateSet, years: yearSet, cellMap: map }
  }, [data])

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Yield Anomaly Detection</h2>
          <p>State+crop+year combinations where yield deviated significantly from historical norm (z-score threshold)</p>
        </div>
        {data && (
          <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
            {data.total_anomalies} anomalies · |z| ≥ {threshold}
          </div>
        )}
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {loading && (
        <div>{[...Array(5)].map((_, i) => <div key={i} className="skeleton skeleton-line" style={{ width: `${90 - i * 8}%`, marginBottom: 12, height: i === 0 ? 60 : 16 }} />)}</div>
      )}

      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPIs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <KPI label="Total Anomalies" value={data.total_anomalies.toLocaleString()} sub={`|z| ≥ ${threshold}`} accent="#ef4444" />
            <KPI label="States Affected" value={data.states_affected} sub="out of 33" accent="#f59e0b" />
            <KPI label="Crops Affected" value={data.crops_affected} sub="unique crops" accent="#a855f7" />
            <KPI label="Peak Year" value={data.yearly?.reduce((a, b) => b.count > a.count ? b : a, { year: '—', count: 0 }).year} sub="most anomalies" accent="#3b82f6" />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: 4 }}>Threshold |z| ≥</span>
              {THRESHOLDS.map(t => (
                <button key={t} onClick={() => setThreshold(t)} style={{
                  padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem',
                  fontWeight: threshold === t ? 700 : 400, cursor: 'pointer',
                  background: threshold === t ? '#ef4444' : 'var(--surface)',
                  color: threshold === t ? '#fff' : 'var(--text-secondary)',
                }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: 4 }}>Direction</span>
              {[['all', 'All'], ['high', '↑ High'], ['low', '↓ Low']].map(([v, l]) => (
                <button key={v} onClick={() => setDirection(v)} style={{
                  padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem',
                  fontWeight: direction === v ? 700 : 400, cursor: 'pointer',
                  background: direction === v ? 'var(--accent)' : 'var(--surface)',
                  color: direction === v ? '#fff' : 'var(--text-secondary)',
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['table', 'Anomaly Table'], ['heatmap', 'State Heatmap'], ['yearly', 'Yearly Trend']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem',
                fontWeight: tab === id ? 700 : 500, cursor: 'pointer',
                background: tab === id ? 'var(--accent)' : 'var(--surface)',
                color: tab === id ? '#fff' : 'var(--text-secondary)',
              }}>{label}</button>
            ))}
          </div>

          {/* Anomaly Table */}
          {tab === 'table' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                Top {filtered.length} anomalies — sorted by |z-score|
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr>
                    {['State', 'Crop', 'Year', 'Yield (t/ha)', 'Mean Yield', 'Z-Score', 'Direction', '% from Mean'].map(h => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                      <td style={{ padding: '7px 10px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{a.state}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>{a.crop}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>{a.year}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{a.yield_val?.toFixed(3)}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>{a.mean_yield?.toFixed(3)}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ fontWeight: 700, color: zTextColor(a.z_score) }}>{a.z_score > 0 ? '+' : ''}{a.z_score?.toFixed(2)}</span>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, borderRadius: 4, padding: '2px 7px', background: a.direction === 'high' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: a.direction === 'high' ? '#16a34a' : '#dc2626' }}>
                          {a.direction === 'high' ? '↑ High' : '↓ Low'}
                        </span>
                        <span style={{ marginLeft: 5, fontSize: '0.68rem', color: 'var(--text-muted)' }}>{severityLabel(a.z_score)}</span>
                      </td>
                      <td style={{ padding: '7px 10px', color: zTextColor(a.z_score), fontWeight: 500 }}>
                        {a.pct_from_mean > 0 ? '+' : ''}{a.pct_from_mean?.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 100 && (
                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Showing top 100 of {filtered.length} anomalies</div>
              )}
            </div>
          )}

          {/* Heatmap */}
          {tab === 'heatmap' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>State × Year Anomaly Heatmap</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Green = high yield anomaly · Red = low yield anomaly · Intensity = magnitude
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 130 }}>State</th>
                      {years.map(y => (
                        <th key={y} style={{ padding: '4px 5px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, minWidth: 28 }}>{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {states.map(state => (
                      <tr key={state}>
                        <td style={{ padding: '3px 8px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>{state}</td>
                        {years.map(y => {
                          const cell = cellMap[`${state}__${y}`]
                          return (
                            <td key={y} title={cell ? `z=${cell.max_z > 0 ? '+' : ''}${cell.max_z} (${cell.count} crops)` : ''}
                              style={{
                                padding: '3px 2px', textAlign: 'center', cursor: cell ? 'default' : 'default',
                                background: cell ? zColor(cell.max_z) : 'transparent',
                                borderRadius: 2,
                              }}>
                              {cell ? <span style={{ fontSize: '0.6rem', fontWeight: 600, color: Math.abs(cell.max_z) > 3 ? '#fff' : zTextColor(cell.max_z) }}>
                                {Math.abs(cell.max_z) >= 3 ? '●' : '·'}
                              </span> : <span style={{ color: 'var(--border)' }}>·</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Yearly Trend */}
          {tab === 'yearly' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Anomaly Count by Year</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.yearly} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [v, 'Anomalies']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.yearly?.map((d, i) => <Cell key={i} fill={d.count > 60 ? '#ef4444' : d.count > 40 ? '#f59e0b' : '#3b82f6'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Most Anomalous States</div>
                  {data.top_states?.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{s.state}</span>
                      <span style={{ fontWeight: 700, color: '#ef4444' }}>{s.count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Most Anomalous Crops</div>
                  {data.top_crops?.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.crop}</span>
                      <span style={{ fontWeight: 700, color: '#f59e0b' }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Z-score = (yield − historical mean) / std per state+crop pair · Only pairs with ≥ 3 years of data included · Positive z = unusually high yield, negative z = unusually low yield
          </div>
        </div>
      )}
    </>
  )
}
