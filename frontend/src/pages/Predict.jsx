import { useEffect, useState } from 'react'
import { getOptions, predict } from '../api'

export default function Predict() {
  const [options, setOptions] = useState({ states: [], seasons: [], crops: [] })
  const [form, setForm] = useState({ state: '', season: '', crop: '', area: '', year: 2015 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getOptions()
      .then(setOptions)
      .catch(() => setError('Backend not running. Start FastAPI with: cd backend && uvicorn main:app --reload'))
  }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.state || !form.season || !form.crop || !form.area) return
    setLoading(true)
    setResult(null)
    try {
      const res = await predict({ ...form, area: parseFloat(form.area), year: parseInt(form.year) })
      if (res.error) setError(res.error)
      else { setResult(res); setError('') }
    } catch {
      setError('Prediction failed. Make sure the model is trained (run the notebook).')
    }
    setLoading(false)
  }

  const isValid = form.state && form.season && form.crop && form.area > 0

  return (
    <>
      <div className="page-header">
        <h2>Predict Crop Production</h2>
        <p>Enter farm details to predict production using the trained Random Forest model</p>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="predict-wrap">
        <div className="form-card">
          <h3>Farm Parameters</h3>
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
              <label>Year</label>
              <input type="number" name="year" value={form.year} onChange={handleChange} min="1997" max="2030" />
            </div>
            <button type="submit" className="btn-predict" disabled={!isValid || loading}>
              {loading ? 'Predicting…' : '🌾 Predict Production'}
            </button>
          </form>
        </div>

        <div className="result-card">
          <h3>Prediction Result</h3>
          {!result && !loading && (
            <div className="result-placeholder">
              Fill in the form and click Predict to see the model output.
            </div>
          )}
          {loading && <div className="loading">Running model…</div>}
          {result && (
            <>
              <div className="result-value">{result.predicted_production.toLocaleString()}</div>
              <div className="result-unit">tonnes predicted production</div>
              <div style={{ marginTop: '1.5rem' }}>
                <div className="result-row"><span>Yield (t/ha)</span><span>{result.predicted_yield}</span></div>
                <div className="result-row"><span>State</span><span>{result.inputs.state}</span></div>
                <div className="result-row"><span>Season</span><span>{result.inputs.season}</span></div>
                <div className="result-row"><span>Crop</span><span>{result.inputs.crop}</span></div>
                <div className="result-row"><span>Area</span><span>{result.inputs.area} ha</span></div>
                <div className="result-row"><span>Year</span><span>{result.inputs.year}</span></div>
              </div>
              <div className="info-banner" style={{ marginTop: '1rem', marginBottom: 0 }}>
                Model: Random Forest Regressor · Features: Area, Year, Season, State, Crop
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
