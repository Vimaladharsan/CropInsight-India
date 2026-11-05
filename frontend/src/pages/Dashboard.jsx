import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { getOverview, getTopStates, getTopCrops, getSeasonBreakdown, getYearlyTrend } from '../api'

const COLORS = ['#4ade80','#22d3ee','#f59e0b','#f87171','#a78bfa','#fb923c','#34d399','#60a5fa','#e879f9','#94a3b8']

const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : n

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [states, setStates] = useState([])
  const [crops, setCrops] = useState([])
  const [seasons, setSeasons] = useState([])
  const [trend, setTrend] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getOverview(), getTopStates(10), getTopCrops(10), getSeasonBreakdown(), getYearlyTrend()])
      .then(([ov, st, cr, se, tr]) => {
        setOverview(ov)
        setStates(st.map(d => ({ name: d.State_Name, value: Math.round(d.total_production / 1e6) })))
        setCrops(cr.map(d => ({ name: d.Crop, value: Math.round(d.total_production / 1e6) })))
        setSeasons(se.map(d => ({ name: d.Season, value: Math.round(d.total_production / 1e6) })))
        setTrend(tr.map(d => ({ year: d.Crop_Year, production: Math.round(d.total_production / 1e6), yield: parseFloat(d.avg_yield.toFixed(2)) })))
      })
      .catch(() => setError('Backend not running. Start FastAPI with: cd backend && uvicorn main:app --reload'))
  }, [])

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>India crop production overview · 1997–2015</p>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {!overview && !error && <div className="loading">Loading data…</div>}

      {overview && (
        <>
          <div className="stat-grid">
            <div className="stat-card accent">
              <div className="stat-label">Total Records</div>
              <div className="stat-value">{(overview.total_records / 1000).toFixed(0)}K</div>
              <div className="stat-sub">state–district–crop rows</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-label">States Covered</div>
              <div className="stat-value">{overview.states}</div>
              <div className="stat-sub">across India</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-label">Unique Crops</div>
              <div className="stat-value">{overview.crops}</div>
              <div className="stat-sub">varieties tracked</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-label">Total Production</div>
              <div className="stat-value">{overview.total_production_MT}M</div>
              <div className="stat-sub">tonnes (cumulative)</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-label">Avg Yield</div>
              <div className="stat-value">{overview.avg_yield.toFixed(2)}</div>
              <div className="stat-sub">tonnes / hectare</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <div className="chart-title">Top 10 States by Production <span>million tonnes</span></div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={states} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={v => [v + ' MT', 'Production']} />
                  <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title">Production by Season <span>share of total</span></div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={seasons} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {seasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [v + ' MT', 'Production']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card full">
              <div className="chart-title">Production Trend 1997–2015 <span>million tonnes</span></div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [v + ' MT', 'Production']} />
                  <Line type="monotone" dataKey="production" stroke="#4ade80" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card full">
              <div className="chart-title">Top 10 Crops by Total Production <span>million tonnes</span></div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={crops} margin={{ bottom: 60 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, angle: -35, textAnchor: 'end' }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [v + ' MT', 'Production']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {crops.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
