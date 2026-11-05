import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { getYearlyTrend, getYieldBySeason, getTopStates, getTopCrops } from '../api'

export default function EDA() {
  const [trend, setTrend] = useState([])
  const [yieldData, setYieldData] = useState([])
  const [states, setStates] = useState([])
  const [crops, setCrops] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getYearlyTrend(), getYieldBySeason(), getTopStates(15), getTopCrops(15)])
      .then(([tr, yd, st, cr]) => {
        setTrend(tr.map(d => ({
          year: d.Crop_Year,
          yield: parseFloat(d.avg_yield.toFixed(3)),
          area: parseFloat((d.total_area / 1e6).toFixed(2)),
        })))
        setYieldData(yd.map(d => ({ season: d.Season, mean: parseFloat(d.mean.toFixed(2)), max: parseFloat(d.max.toFixed(2)) })))
        setStates(st.map(d => ({ name: d.State_Name, value: Math.round(d.total_production / 1e6) })))
        setCrops(cr.map(d => ({ name: d.Crop, value: Math.round(d.total_production / 1e6) })))
      })
      .catch(() => setError('Backend not running. Start FastAPI with: cd backend && uvicorn main:app --reload'))
  }, [])

  return (
    <>
      <div className="page-header">
        <h2>EDA Explorer</h2>
        <p>Exploratory data analysis — answer the 15 research questions visually</p>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}
      {!trend.length && !error && <div className="loading">Loading charts…</div>}

      {trend.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card full">
            <div className="chart-title">Q2 · Average Yield Over Time (tonnes/hectare)</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [v + ' t/ha', 'Avg Yield']} />
                <Line type="monotone" dataKey="yield" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card full">
            <div className="chart-title">Q9 · Area Cultivated vs Year (million hectares)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} margin={{ right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [v + ' Mha', 'Area']} />
                <Bar dataKey="area" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">Q6 · Mean Yield by Season (tonnes/hectare)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={yieldData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="season" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={v => [v + ' t/ha', 'Mean Yield']} />
                <Bar dataKey="mean" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">Q6 · Max Yield by Season (tonnes/hectare)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={yieldData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="season" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={v => [v + ' t/ha', 'Max Yield']} />
                <Bar dataKey="max" fill="#f87171" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card full">
            <div className="chart-title">Q1 · Top 15 States by Total Production (million tonnes)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={states} layout="vertical" margin={{ left: 120, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={v => [v + ' MT', 'Production']} />
                <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card full">
            <div className="chart-title">Q4 · Top 15 Crops by Total Production (million tonnes)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={crops} layout="vertical" margin={{ left: 120, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={v => [v + ' MT', 'Production']} />
                <Bar dataKey="value" fill="#34d399" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  )
}
