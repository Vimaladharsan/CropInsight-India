import { useEffect, useState, useRef } from 'react'
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
    </>
  )
}
