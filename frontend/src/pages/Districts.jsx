import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts'
import { getOptions, getDistrictAnalysis } from '../api'

const fmt = v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : Number(v)?.toFixed(0)
const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#f97316']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => <div key={p.dataKey} style={{ color: p.color || 'var(--accent)' }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  )
}

export default function Districts() {
  const [states, setStates] = useState([])
  const [state, setState] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getOptions()
      .then(o => { setStates(o.states); setState(o.states[0] || '') })
      .catch(() => setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'))
  }, [])

  useEffect(() => { if (state) load() }, [state])

  const load = async () => {
    setLoading(true)
    try {
      const d = await getDistrictAnalysis(state)
      setData(d); setError('')
    } catch { setError('Failed to load district data.') }
    setLoading(false)
  }

  const topDistricts = data?.districts?.slice(0, 10) || []
  const maxProd = topDistricts[0]?.total_production || 1

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>District Analysis</h2>
          <p>Drill down into any state — top producing districts, crop mix, and historical trend</p>
        </div>
        <select value={state} onChange={e => setState(e.target.value)} style={{
          padding: '0.5rem 0.875rem', border: '1px solid var(--border)', borderRadius: 8,
          background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', minWidth: 200,
        }}>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-chart" />)}
        </div>
      )}

      {data && !loading && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* State summary KPIs */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Production', value: fmt(data.summary.total_production) + ' t', icon: '🌾' },
              { label: 'Avg Yield', value: data.summary.avg_yield?.toFixed(2) + ' t/ha', icon: '📈' },
              { label: 'Districts', value: data.summary.district_count, icon: '📍' },
              { label: 'Crop Varieties', value: data.summary.crop_count, icon: '🌿' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ flex: '1 1 140px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1.2rem', opacity: 0.2 }}>{icon}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Top districts table */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div className="chart-title" style={{ marginBottom: 14 }}>Top Districts by Production</div>
              {topDistricts.map((d, i) => (
                <div key={d.District_Name} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: i < 3 ? 700 : 400 }}>{d.District_Name}</span>
                    </div>
                    <span style={{ color: COLORS[i % COLORS.length], fontWeight: 600, fontSize: 11 }}>{fmt(d.total_production)}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 99, marginLeft: 26 }}>
                    <div style={{ height: '100%', width: `${(d.total_production / maxProd * 100).toFixed(0)}%`, background: COLORS[i % COLORS.length], borderRadius: 99, opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Top crops bar */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div className="chart-title" style={{ marginBottom: 12 }}>Top Crops in {state}</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.top_crops} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmt} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="Crop" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total_production" radius={[0, 4, 4, 0]} name="Production">
                    {data.top_crops.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yearly trend */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div className="chart-header" style={{ marginBottom: 12 }}>
              <div><div className="chart-title">{state} — Historical Production Trend</div><div className="chart-sub">Total state production 1997–2015</div></div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.yearly_trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="Crop_Year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total_production" stroke="#22c55e" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="Production" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Full district table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div className="chart-title" style={{ marginBottom: 12 }}>All Districts — {state}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'District', 'Total Production', 'Avg Yield (t/ha)', 'Total Area (ha)', 'Records'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: h === '#' || h === 'Records' ? 'center' : 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.districts.map((d, i) => (
                    <tr key={d.District_Name} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '7px 10px', fontWeight: i < 3 ? 700 : 400, color: 'var(--text)' }}>{d.District_Name}</td>
                      <td style={{ padding: '7px 10px', color: '#22c55e', fontWeight: 600 }}>{fmt(d.total_production)} t</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>{d.avg_yield?.toFixed(2)}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>{fmt(d.total_area)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>{d.records?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
