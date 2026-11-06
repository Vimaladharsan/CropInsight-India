import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { getOptions, getCompare } from '../api'

const COLORS = { a: '#22c55e', b: '#3b82f6' }

const fmt = v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v?.toFixed(0)

function StatVs({ label, va, vb, unit = '', formatter = x => x?.toLocaleString() }) {
  const max = Math.max(Number(va), Number(vb)) || 1
  const pctA = (Number(va) / max * 100).toFixed(0)
  const pctB = (Number(vb) / max * 100).toFixed(0)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>
        <span style={{ color: COLORS.a }}>{formatter(va)}{unit}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ color: COLORS.b }}>{formatter(vb)}{unit}</span>
      </div>
      <div style={{ display: 'flex', gap: 2, height: 6 }}>
        <div style={{ flex: pctA, background: COLORS.a, borderRadius: '4px 0 0 4px', opacity: 0.85 }} />
        <div style={{ flex: pctB, background: COLORS.b, borderRadius: '0 4px 4px 0', opacity: 0.85 }} />
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-muted)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {fmt(p.value)} t</div>
      ))}
    </div>
  )
}

export default function Compare() {
  const [type, setType] = useState('crop')
  const [options, setOptions] = useState({ crops: [], states: [] })
  const [selA, setSelA] = useState('Rice')
  const [selB, setSelB] = useState('Wheat')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getOptions()
      .then(o => { setOptions(o); setSelA(o.crops[0] || 'Rice'); setSelB(o.crops[1] || 'Wheat') })
      .catch(() => setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'))
  }, [])

  useEffect(() => {
    if (type === 'crop') { setSelA(options.crops[0] || 'Rice'); setSelB(options.crops[1] || 'Wheat') }
    else { setSelA(options.states[0] || 'Uttar Pradesh'); setSelB(options.states[1] || 'Punjab') }
    setResult(null)
  }, [type])

  const run = async () => {
    setLoading(true); setResult(null)
    try {
      const data = await getCompare(type, selA, selB)
      setResult(data); setError('')
    } catch { setError('Comparison failed — backend may not be running.') }
    setLoading(false)
  }

  const list = type === 'crop' ? options.crops : options.states

  const trendData = result
    ? (() => {
        const mapA = Object.fromEntries(result.a.yearly_trend.map(d => [d.Crop_Year, d.total_production]))
        const mapB = Object.fromEntries(result.b.yearly_trend.map(d => [d.Crop_Year, d.total_production]))
        const years = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])].sort()
        return years.map(y => ({ year: parseInt(y), [result.a.name]: mapA[y] || 0, [result.b.name]: mapB[y] || 0 }))
      })()
    : []

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Compare</h2>
          <p>Side-by-side analysis — crop vs crop or state vs state across 18 years of data</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['crop', 'state'].map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer',
              background: type === t ? 'var(--accent)' : 'var(--surface)',
              color: type === t ? '#052e16' : 'var(--text-muted)', fontWeight: 600, fontSize: 12,
            }}>{t === 'crop' ? '🌾 Crop' : '🗺 State'}</button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginBottom: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {[{ sel: selA, set: setSelA, color: COLORS.a, label: 'A' }, { sel: selB, set: setSelB, color: COLORS.b, label: 'B' }].map(({ sel, set, color, label }) => (
          <div key={label} style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label} — {type}</div>
            <select value={sel} onChange={e => set(e.target.value)} style={{
              width: '100%', padding: '0.5rem 0.75rem', border: `1.5px solid ${color}`, borderRadius: 7,
              fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none',
            }}>
              {list.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button onClick={run} disabled={loading || !selA || !selB || selA === selB} style={{
          padding: '0.55rem 1.5rem', background: 'var(--accent)', border: 'none', borderRadius: 7,
          fontWeight: 700, fontSize: '0.875rem', color: '#052e16', cursor: 'pointer',
          opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap',
        }}>{loading ? '⟳ Loading…' : '▶ Compare'}</button>
      </div>

      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.3 }}>⚖</div>
          <div style={{ fontWeight: 600 }}>Select two {type}s and click Compare</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>See head-to-head production, yield, and trend data</div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-chart" />)}
        </div>
      )}

      {result && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name banners */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[result.a, result.b].map((item, i) => (
              <div key={i} style={{
                background: 'var(--surface)', border: `2px solid ${i === 0 ? COLORS.a : COLORS.b}`,
                borderRadius: 10, padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: i === 0 ? COLORS.a : COLORS.b, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{i === 0 ? 'A' : 'B'}</div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>{item.name}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    ['Total Production', fmt(item.total_production) + ' t'],
                    ['Avg Yield', item.avg_yield?.toFixed(2) + ' t/ha'],
                    ['Records', item.records?.toLocaleString()],
                    type === 'crop' ? ['States', item.states_count] : ['Crops', item.crops_count],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Head-to-head bars */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div className="chart-title" style={{ marginBottom: 16 }}>Head-to-Head Comparison</div>
            <StatVs label="Total Production (t)" va={result.a.total_production} vb={result.b.total_production} formatter={fmt} />
            <StatVs label="Avg Yield (t/ha)" va={result.a.avg_yield} vb={result.b.avg_yield} formatter={v => v?.toFixed(3)} />
            <StatVs label="Total Area (ha)" va={result.a.total_area} vb={result.b.total_area} formatter={fmt} />
            <StatVs label="Data Records" va={result.a.records} vb={result.b.records} formatter={v => v?.toLocaleString()} />
          </div>

          {/* Production trend */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div className="chart-header">
              <div><div className="chart-title">Production Trend (1997–2015)</div><div className="chart-sub">Annual total production comparison</div></div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey={result.a.name} stroke={COLORS.a} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey={result.b.name} stroke={COLORS.b} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Season breakdown side-by-side (crop mode) */}
          {type === 'crop' && result.a.season_breakdown && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[result.a, result.b].map((item, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="chart-title" style={{ marginBottom: 12 }}>{item.name} — Season Share</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={item.season_breakdown} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="Season" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmt} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => fmt(v) + ' t'} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="total_production" fill={i === 0 ? COLORS.a : COLORS.b} radius={[4, 4, 0, 0]} name="Production" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}

          {/* Top crops (state mode) */}
          {type === 'state' && result.a.top_crops && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[result.a, result.b].map((item, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="chart-title" style={{ marginBottom: 12 }}>{item.name} — Top Crops</div>
                  {item.top_crops.map((c, j) => {
                    const max = item.top_crops[0].total_production
                    return (
                      <div key={c.Crop} style={{ marginBottom: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{c.Crop}</span>
                          <span style={{ color: i === 0 ? COLORS.a : COLORS.b, fontWeight: 600 }}>{fmt(c.total_production)}</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 99 }}>
                          <div style={{ height: '100%', width: `${(c.total_production / max * 100).toFixed(0)}%`, background: i === 0 ? COLORS.a : COLORS.b, borderRadius: 99 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
