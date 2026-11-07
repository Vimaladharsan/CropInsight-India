import { useEffect, useState, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { getOptions, predict } from '../api'

const MAX_PROD = 50000000

export default function Predict() {
  const [options, setOptions] = useState({ states: [], seasons: [], crops: [] })
  const [form, setForm] = useState({ state: '', season: '', crop: '', area: '', year: 2015 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [barWidth, setBarWidth] = useState(0)
  const barTimer = useRef(null)

  useEffect(() => {
    getOptions()
      .then(setOptions)
      .catch(() => setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'))
  }, [])

  useEffect(() => {
    if (result) {
      clearTimeout(barTimer.current)
      setBarWidth(0)
      barTimer.current = setTimeout(() => {
        setBarWidth(Math.min((result.predicted_production / MAX_PROD) * 100, 100))
      }, 100)
    }
    return () => clearTimeout(barTimer.current)
  }, [result])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setResult(null)
    try {
      const res = await predict({ ...form, area: parseFloat(form.area), year: parseInt(form.year) })
      if (res.error) setError(res.error)
      else { setResult(res); setError('') }
    } catch {
      setError('Prediction failed. Make sure the notebook has been run to generate the model files.')
    }
    setLoading(false)
  }

  const isValid = form.state && form.season && form.crop && parseFloat(form.area) > 0

  const yieldClass = result
    ? result.predicted_yield < 1 ? 'Below average' : result.predicted_yield < 3 ? 'Average' : result.predicted_yield < 6 ? 'Good' : 'Excellent'
    : ''

  const yieldColor = result
    ? result.predicted_yield < 1 ? '#ef4444' : result.predicted_yield < 3 ? '#f59e0b' : result.predicted_yield < 6 ? '#22c55e' : '#3b82f6'
    : '#22c55e'

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Yield Predictor</h2>
          <p>Random Forest model trained on 246K observations — predicts crop production from farm parameters</p>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="predict-wrap">
        <div className="form-card">
          <h3>⚙ Farm Parameters</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>State</label>
              <select name="state" value={form.state} onChange={handleChange} required>
                <option value="">Select state…</option>
                {options.states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Season</label>
              <select name="season" value={form.season} onChange={handleChange} required>
                <option value="">Select season…</option>
                {options.seasons.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Crop</label>
              <select name="crop" value={form.crop} onChange={handleChange} required>
                <option value="">Select crop…</option>
                {options.crops.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Area (hectares)</label>
              <input type="number" name="area" value={form.area} onChange={handleChange} min="1" step="0.1" placeholder="e.g. 500" required />
            </div>
            <div className="form-group">
              <label>Reference Year</label>
              <input type="number" name="year" value={form.year} onChange={handleChange} min="1997" max="2030" />
            </div>
            <button type="submit" className="btn-predict" disabled={!isValid || loading}>
              {loading ? '⟳ Running model…' : '▶ Run Prediction'}
            </button>
          </form>
        </div>

        <div className="result-card">
          <h3>◎ Prediction Output</h3>
          {!result && !loading && (
            <div className="result-placeholder">
              <div className="result-placeholder-icon">🌾</div>
              <div>Fill in farm parameters and run the model to see predicted crop production.</div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Model: Random Forest · Features: Area, Year, Season, State, Crop
              </div>
            </div>
          )}
          {loading && (
            <div style={{ padding: '2rem 0' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-line" style={{ width: `${80 - i * 10}%` }} />)}
            </div>
          )}
          {result && (
            <div className="fade-in">
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Predicted Production</div>
                <div className="result-number">{result.predicted_production.toLocaleString()}</div>
                <div className="result-unit">tonnes</div>
              </div>

              <div className="result-bar-wrap">
                <div className="result-bar-label">
                  <span>0</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{Math.round(barWidth)}% of scale max</span>
                  <span>50M</span>
                </div>
                <div className="result-bar-track">
                  <div className="result-bar-fill" style={{ width: `${barWidth}%` }} />
                </div>
              </div>

              <div className="result-divider" />

              <div className="result-row">
                <span className="result-row-label">Yield efficiency</span>
                <span className="result-row-value" style={{ color: yieldColor }}>{result.predicted_yield} t/ha — {yieldClass}</span>
              </div>
              <div className="result-row">
                <span className="result-row-label">State</span>
                <span className="result-row-value">{result.inputs.state}</span>
              </div>
              <div className="result-row">
                <span className="result-row-label">Season</span>
                <span className="result-row-value">{result.inputs.season}</span>
              </div>
              <div className="result-row">
                <span className="result-row-label">Crop</span>
                <span className="result-row-value">{result.inputs.crop}</span>
              </div>
              <div className="result-row">
                <span className="result-row-label">Area</span>
                <span className="result-row-value">{parseFloat(result.inputs.area).toLocaleString()} ha</span>
              </div>

              <div className="info-banner" style={{ marginTop: '1.25rem' }}>
                Model R² ≈ 0.90 · Run the notebook to train and see exact metrics.
              </div>
            </div>
          )}
        </div>
      </div>

      {result?.shap_values && (
        <div className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginTop: 16, boxShadow: 'var(--shadow-sm)' }}>
          <div className="chart-title" style={{ marginBottom: 4 }}>Feature Contributions (SHAP)</div>
          <div className="chart-sub" style={{ marginBottom: 16 }}>
            How each input feature pushed the prediction up ↑ or down ↓ from the baseline
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={result.shap_values} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(3)} />
              <YAxis type="category" dataKey="feature" tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={60} />
              <ReferenceLine x={0} stroke="var(--border-strong)" strokeWidth={1.5} />
              <Tooltip
                formatter={(v, name, props) => [
                  `${v >= 0 ? '+' : ''}${v.toFixed(4)} (${props.payload.pct}%)`,
                  'SHAP contribution'
                ]}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="shap" radius={[0, 4, 4, 0]}>
                {result.shap_values.map((entry, i) => (
                  <Cell key={i} fill={entry.direction === 'positive' ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, background: '#22c55e', display: 'inline-block', borderRadius: 2 }} /> Increases prediction
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, background: '#ef4444', display: 'inline-block', borderRadius: 2 }} /> Decreases prediction
            </span>
          </div>
        </div>
      )}
    </>
  )
}
