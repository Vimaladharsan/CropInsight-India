import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line, CartesianGrid, Area, AreaChart,
} from 'recharts'
import { getOverview, getTopStates, getTopCrops, getSeasonBreakdown, getYearlyTrend } from '../api'
import useCountUp from '../hooks/useCountUp'

const PALETTE = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#10b981','#f97316','#ec4899','#64748b']

function StatCard({ label, value, sub, icon, animate = true }) {
  const count = useCountUp(animate ? (parseFloat(value) || 0) : 0)
  const display = animate ? count : value
  return (
    <div className="stat-card fade-in">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{typeof value === 'number' ? display.toLocaleString() : value}</div>
      <div className="stat-sub">{sub}</div>
      <div className="stat-icon">{icon}</div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <>
      <div className="stat-grid">
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton skeleton-stat" />)}
      </div>
      <div className="chart-grid">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-chart" />)}
      </div>
    </>
  )
}

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value?.toLocaleString()}{unit}</div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [states, setStates] = useState([])
  const [crops, setCrops] = useState([])
  const [seasons, setSeasons] = useState([])
  const [trend, setTrend] = useState([])
  const [filtered, setFiltered] = useState([])
  const [yearRange, setYearRange] = useState([1997, 2015])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getOverview(), getTopStates(10), getTopCrops(10), getSeasonBreakdown(), getYearlyTrend()])
      .then(([ov, st, cr, se, tr]) => {
        setOverview(ov)
        setStates(st.map(d => ({ name: d.State_Name, value: Math.round(d.total_production / 1e6) })))
        setCrops(cr.map(d => ({ name: d.Crop, value: Math.round(d.total_production / 1e6) })))
        setSeasons(se.map(d => ({ name: d.Season, value: Math.round(d.total_production / 1e6) })))
        const mapped = tr.map(d => ({ year: d.Crop_Year, production: Math.round(d.total_production / 1e6), yield: parseFloat(d.avg_yield?.toFixed(3) ?? 0) }))
        setTrend(mapped)
        setFiltered(mapped)
      })
      .catch(() => setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'))
  }, [])

  useEffect(() => {
    setFiltered(trend.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]))
  }, [yearRange, trend])

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>India Crop Production</h2>
          <p>18-year agricultural dataset · {overview ? `${(overview.total_records/1000).toFixed(0)}K observations` : 'Loading…'}</p>
        </div>
        <div className="year-filter">
          <label>From</label>
          <input type="range" min={1997} max={2014} value={yearRange[0]} onChange={e => setYearRange(r => [+e.target.value, r[1]])} />
          <span>{yearRange[0]}</span>
          <label>To</label>
          <input type="range" min={1998} max={2015} value={yearRange[1]} onChange={e => setYearRange(r => [r[0], +e.target.value])} />
          <span>{yearRange[1]}</span>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}
      {!overview && !error && <SkeletonGrid />}

      {overview && (
        <>
          <div className="stat-grid">
            <StatCard label="Total Records"     value={overview.total_records}       sub="state–district–crop rows" icon="📋" />
            <StatCard label="States Covered"    value={overview.states}              sub="across India"             icon="🗺" />
            <StatCard label="Unique Crops"      value={overview.crops}               sub="varieties tracked"        icon="🌱" />
            <StatCard label="Production (MT)"   value={overview.total_production_MT} sub="million tonnes total"     icon="📦" animate={false} />
            <StatCard label="Avg Yield (t/ha)"  value={overview.avg_yield}           sub="tonnes per hectare"       icon="📈" animate={false} />
          </div>

          <div className="section-label">Production trends</div>
          <div className="chart-grid">
            <div className="chart-card full">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Total Production Over Time</div>
                  <div className="chart-sub">million tonnes · {yearRange[0]}–{yearRange[1]}</div>
                </div>
                <span className="chart-badge">{filtered.length} years</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={filtered} margin={{ right: 10 }}>
                  <defs>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" MT" />} />
                  <Area type="monotone" dataKey="production" name="Production" stroke="#22c55e" strokeWidth={2} fill="url(#prodGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card full">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Average Yield Trend</div>
                  <div className="chart-sub">tonnes per hectare · {yearRange[0]}–{yearRange[1]}</div>
                </div>
                <span className="chart-badge">efficiency</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={filtered} margin={{ right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" t/ha" />} />
                  <Line type="monotone" dataKey="yield" name="Yield" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="section-label">Distribution breakdown</div>
          <div className="chart-grid">
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Top 10 States</div>
                  <div className="chart-sub">by total production (MT)</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={states} layout="vertical" margin={{ left: 90, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" MT" />} />
                  <Bar dataKey="value" name="Production" radius={[0, 5, 5, 0]}>
                    {states.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Season Share</div>
                  <div className="chart-sub">production distribution</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={seasons} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={95} innerRadius={45}>
                    {seasons.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip unit=" MT" />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card full">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Top 10 Crops by Total Production</div>
                  <div className="chart-sub">million tonnes (cumulative)</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={crops} margin={{ bottom: 55, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', angle: -35, textAnchor: 'end' }} interval={0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" MT" />} />
                  <Bar dataKey="value" name="Production" radius={[5, 5, 0, 0]}>
                    {crops.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
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
