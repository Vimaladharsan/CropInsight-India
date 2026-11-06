import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { getYearlyTrend, getYieldBySeason, getTopStates, getTopCrops } from '../api'

const PALETTE = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#10b981','#f97316','#ec4899','#64748b','#84cc16','#a855f7','#0ea5e9','#d946ef','#14b8a6']

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{unit}</div>
      ))}
    </div>
  )
}

function InsightBadge({ icon, title, value, color = '#22c55e' }) {
  return (
    <div className="insight-card">
      <div className="insight-card-label">{title}</div>
      <div className="insight-card-value">{value}</div>
      <div className="insight-card-sub">{icon}</div>
    </div>
  )
}

export default function EDA() {
  const [trend, setTrend] = useState([])
  const [yieldData, setYieldData] = useState([])
  const [states, setStates] = useState([])
  const [crops, setCrops] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getYearlyTrend(), getYieldBySeason(), getTopStates(15), getTopCrops(15)])
      .then(([tr, yd, st, cr]) => {
        setTrend(tr.map(d => ({
          year: d.Crop_Year,
          yield: parseFloat((d.avg_yield ?? 0).toFixed(3)),
          area: parseFloat(((d.total_area ?? 0) / 1e6).toFixed(2)),
          production: Math.round((d.total_production ?? 0) / 1e6),
        })))
        setYieldData(yd.map(d => ({
          season: d.Season,
          mean: parseFloat((d.mean ?? 0).toFixed(2)),
          max: parseFloat((d.max ?? 0).toFixed(2)),
          count: d.count ?? 0,
        })))
        setStates(st.map(d => ({ name: d.State_Name, value: Math.round(d.total_production / 1e6) })))
        setCrops(cr.map(d => ({ name: d.Crop, value: Math.round(d.total_production / 1e6) })))
        setLoading(false)
      })
      .catch(() => { setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'); setLoading(false) })
  }, [])

  const maxYield = trend.length ? Math.max(...trend.map(d => d.yield)) : 0
  const minYield = trend.length ? Math.min(...trend.map(d => d.yield)) : 0
  const yieldGrowth = trend.length >= 2 ? ((trend.at(-1).yield - trend[0].yield) / trend[0].yield * 100).toFixed(1) : 0
  const topState = states[0]?.name ?? '—'
  const topCrop = crops[0]?.name ?? '—'

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Data Explorer</h2>
          <p>Deep-dive into India's agricultural production patterns</p>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {loading && (
        <div className="chart-grid">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton skeleton-chart" />)}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="insight-grid">
            <InsightBadge title="Top Producing State" value={topState} icon="🏆 #1 state" />
            <InsightBadge title="Top Crop" value={topCrop} icon="🌾 by volume" />
            <InsightBadge title="Yield Growth" value={`+${yieldGrowth}%`} icon="📈 1997→2015" />
            <InsightBadge title="Peak Yield" value={`${maxYield.toFixed(2)} t/ha`} icon="⬆ highest year" />
            <InsightBadge title="Lowest Yield" value={`${minYield.toFixed(2)} t/ha`} icon="⬇ lowest year" />
          </div>

          <div className="section-label" style={{ marginTop: '1.5rem' }}>Yield & area over time</div>
          <div className="chart-grid">
            <div className="chart-card full">
              <div className="chart-header">
                <div><div className="chart-title">Average Yield per Year</div><div className="chart-sub">tonnes per hectare — measures farming efficiency</div></div>
                <span className="chart-badge">1997–2015</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ right: 10 }}>
                  <defs>
                    <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" t/ha" />} />
                  <Area type="monotone" dataKey="yield" name="Avg Yield" stroke="#3b82f6" strokeWidth={2} fill="url(#yieldGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Area Cultivated</div><div className="chart-sub">million hectares per year</div></div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trend} margin={{ right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" Mha" />} />
                  <Bar dataKey="area" name="Area" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Mean Yield by Season</div><div className="chart-sub">which season grows most efficiently</div></div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={yieldData} layout="vertical" margin={{ left: 70, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="season" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" t/ha" />} />
                  <Bar dataKey="mean" name="Mean Yield" radius={[0, 5, 5, 0]}>
                    {yieldData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="section-label">State & crop rankings</div>
          <div className="chart-grid">
            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Top 15 States</div><div className="chart-sub">total production in million tonnes</div></div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={states} layout="vertical" margin={{ left: 110, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" MT" />} />
                  <Bar dataKey="value" name="Production" radius={[0, 5, 5, 0]}>
                    {states.map((_, i) => <Cell key={i} fill={i === 0 ? '#22c55e' : '#3b82f6'} opacity={1 - i * 0.04} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Top 15 Crops</div><div className="chart-sub">total production in million tonnes</div></div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={crops} layout="vertical" margin={{ left: 110, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" MT" />} />
                  <Bar dataKey="value" name="Production" radius={[0, 5, 5, 0]}>
                    {crops.map((_, i) => <Cell key={i} fill={i === 0 ? '#f59e0b' : '#8b5cf6'} opacity={1 - i * 0.04} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  )
}
