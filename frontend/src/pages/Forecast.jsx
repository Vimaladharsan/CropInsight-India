import { useEffect, useState } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'
import { getOptions, getForecast } from '../api'

const fmt = v => v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v?.toFixed(0)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const isForecast = payload[0]?.payload?.type === 'forecast'
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>{label} {isForecast ? '(forecast)' : ''}</div>
      {payload.filter(p => p.dataKey === 'production' || p.dataKey === 'ci_band').map(p => (
        p.dataKey === 'production' && <div key="prod" style={{ color: isForecast ? '#a855f7' : '#22c55e', fontWeight: 700 }}>
          Production: {fmt(p.value)} tonnes
        </div>
      ))}
      {isForecast && payload[0]?.payload?.ci_lower != null && (
        <div style={{ color: 'var(--text-muted)', marginTop: 3, fontSize: 11 }}>
          95% CI: {fmt(payload[0].payload.ci_lower)} – {fmt(payload[0].payload.ci_upper)}
        </div>
      )}
    </div>
  )
}

export default function Forecast() {
  const [crops, setCrops] = useState([])
  const [crop, setCrop] = useState('Rice')
  const [horizon, setHorizon] = useState(5)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoRun, setAutoRun] = useState(false)

  useEffect(() => {
    getOptions()
      .then(o => { setCrops(o.crops); setCrop(o.crops[0] || 'Rice'); setAutoRun(true) })
      .catch(() => setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'))
  }, [])

  useEffect(() => { if (autoRun) { run(); setAutoRun(false) } }, [autoRun])

  const run = async () => {
    setLoading(true)
    try {
      const data = await getForecast(crop, horizon)
      setResult(data); setError('')
    } catch { setError('Forecast failed — check backend.') }
    setLoading(false)
  }

  const chartData = result
    ? [
        ...result.historical.map(d => ({ year: d.year, production: d.production, type: 'historical' })),
        ...result.forecast.map(d => ({ year: d.year, production: d.production, ci_lower: d.ci_lower, ci_upper: d.ci_upper, ci_band: [d.ci_lower, d.ci_upper], type: 'forecast' })),
      ]
    : []

  const splitYear = result ? result.historical[result.historical.length - 1]?.year : null

  const directionColor = result?.direction === 'growing' ? '#22c55e' : '#ef4444'
  const directionIcon = result?.direction === 'growing' ? '↗' : '↘'

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Production Forecast</h2>
          <p>ARIMA time-series forecast with 95% confidence interval — based on 1997–2015 historical data</p>
        </div>
        {result && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: result.direction === 'growing' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: directionColor, border: `1px solid ${directionColor}44` }}>
              {directionIcon} {result.direction === 'growing' ? '+' : ''}{result.trend_pct_per_year}% / year
            </div>
          </div>
        )}
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* Controls */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginBottom: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Crop</div>
          <select value={crop} onChange={e => setCrop(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 7, fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}>
            {crops.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Forecast horizon: <span style={{ color: 'var(--accent)' }}>{horizon} years</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>1</span>
            <input type="range" min={1} max={10} value={horizon} onChange={e => setHorizon(parseInt(e.target.value))} style={{ flex: 1, accentColor: '#a855f7' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>10</span>
          </div>
        </div>
        <button onClick={run} disabled={loading} style={{ padding: '0.55rem 1.5rem', background: '#a855f7', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '0.875rem', color: '#fff', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '⟳ Projecting…' : '▶ Run Forecast'}
        </button>
      </div>

      {loading && <div className="skeleton skeleton-chart" style={{ height: 360 }} />}

      {result && !loading && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Historical Peak', value: fmt(Math.max(...result.historical.map(d => d.production))) + ' t', color: '#22c55e' },
              { label: `${result.forecast[result.forecast.length - 1]?.year} Projection`, value: fmt(result.forecast[result.forecast.length - 1]?.production) + ' t', color: '#a855f7' },
              { label: 'Trend Slope', value: `${result.slope >= 0 ? '+' : ''}${fmt(result.slope)} t/yr`, color: directionColor },
              { label: 'Direction', value: result.direction === 'growing' ? '↗ Growing' : '↘ Declining', color: directionColor },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: '1 1 140px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div className="chart-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="chart-title">{crop} — Production Trend & Forecast</div>
                <div className="chart-sub">Historical (green) → Projected {horizon}-year forecast (purple) with 95% CI band</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {splitYear && <ReferenceLine x={splitYear} stroke="var(--border-strong)" strokeDasharray="4 4" label={{ value: 'Forecast →', fill: 'var(--text-muted)', fontSize: 10 }} />}
                <Area type="monotone" dataKey="production" fill="url(#histGrad)" stroke="#22c55e" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 4 }}
                  data={chartData.filter(d => d.type === 'historical')}
                  name="Historical" />
                <Area type="monotone" dataKey="production" fill="url(#foreGrad)" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="6 3" dot={false}
                  activeDot={{ r: 4 }}
                  data={chartData.filter(d => d.type === 'forecast')}
                  name="Forecast" />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 3, background: '#22c55e', display: 'inline-block', borderRadius: 2 }} /> Historical</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 3, background: '#a855f7', display: 'inline-block', borderRadius: 2, opacity: 0.7 }} /> Forecast ({result?.model || 'ARIMA'})</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 8, background: 'rgba(168,85,247,0.15)', display: 'inline-block', borderRadius: 2 }} /> 95% Confidence Interval</span>
            </div>
          </div>

          {/* Forecast table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div className="chart-title" style={{ marginBottom: 12 }}>Forecast Values</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {result.forecast.map(d => (
                <div key={d.year} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d.year}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a855f7', marginTop: 4 }}>{fmt(d.production)}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>CI: {fmt(d.ci_lower)}–{fmt(d.ci_upper)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="info-banner">
            Forecast uses ARIMA(1,1,0) time-series modelling when available, falling back to OLS linear regression. Confidence intervals are derived from the model's fitted covariance. For high-variance crops, treat projections as directional indicators.{result?.model ? ` Model used: ${result.model}.` : ''}
          </div>
        </div>
      )}
    </>
  )
}
