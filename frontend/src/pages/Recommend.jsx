import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getOptions, getRecommend } from '../api'

const RANK_COLORS = ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534']
const MEDAL = ['🥇', '🥈', '🥉', '4', '5']

const fmt = v => v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v?.toFixed(1)

const yieldLabel = y => {
  if (y == null) return { label: '—', color: 'var(--text-muted)' }
  if (y < 1) return { label: 'Low', color: '#ef4444' }
  if (y < 3) return { label: 'Average', color: '#f59e0b' }
  if (y < 6) return { label: 'Good', color: '#22c55e' }
  return { label: 'Excellent', color: '#3b82f6' }
}

export default function Recommend() {
  const [options, setOptions] = useState({ states: [], seasons: [] })
  const [form, setForm] = useState({ state: '', season: '', area: '1000', year: '2015' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getOptions()
      .then(o => setOptions({ states: o.states, seasons: o.seasons }))
      .catch(() => setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'))
  }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setResult(null); setError('')
    try {
      const data = await getRecommend(form.state, form.season, parseFloat(form.area), parseInt(form.year))
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Recommendation failed — check backend.')
    }
    setLoading(false)
  }

  const isValid = form.state && form.season && parseFloat(form.area) > 0

  const chartData = result?.recommendations?.map(r => ({
    crop: r.crop,
    yield: r.predicted_yield,
    color: RANK_COLORS[r.rank - 1] || '#4ade80',
  })) || []

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Crop Recommender</h2>
          <p>Enter your farm parameters and get the top crops ranked by predicted yield for your conditions</p>
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
              <label>Area (hectares)</label>
              <input type="number" name="area" value={form.area} onChange={handleChange} min="1" step="0.1" placeholder="e.g. 1000" required />
            </div>
            <div className="form-group">
              <label>Reference Year</label>
              <input type="number" name="year" value={form.year} onChange={handleChange} min="1997" max="2030" />
            </div>
            <button type="submit" className="btn-predict" disabled={!isValid || loading}>
              {loading ? '⟳ Analysing crops…' : '▶ Get Recommendations'}
            </button>
          </form>
        </div>

        <div className="result-card">
          <h3>◎ Recommended Crops</h3>
          {!result && !loading && (
            <div className="result-placeholder">
              <div className="result-placeholder-icon">🌱</div>
              <div>Select your state and season to find which crops will yield the most on your land.</div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Ranked by predicted yield (t/ha) · Top 5 crops shown
              </div>
            </div>
          )}
          {loading && (
            <div style={{ padding: '2rem 0' }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton skeleton-line" style={{ width: `${90 - i * 8}%`, marginBottom: 12 }} />)}
            </div>
          )}
          {result && (
            <div className="fade-in">
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                {result.crops_evaluated} crops evaluated · {result.state} · {result.season} · {parseFloat(result.area).toLocaleString()} ha
              </div>
              {result.recommendations.map(r => {
                const { label, color } = yieldLabel(r.predicted_yield)
                return (
                  <div key={r.crop} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '0.9rem 1rem', marginBottom: 8,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 10, position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${r.score_pct}%`, background: `${RANK_COLORS[r.rank - 1]}18`,
                      borderRadius: '10px 0 0 10px', transition: 'width 0.6s ease',
                    }} />
                    <div style={{ fontSize: '1.4rem', zIndex: 1, minWidth: 28, textAlign: 'center' }}>
                      {r.rank <= 3 ? MEDAL[r.rank - 1] : <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>#{r.rank}</span>}
                    </div>
                    <div style={{ flex: 1, zIndex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.crop}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {r.records_in_dataset > 0 ? `${r.records_in_dataset} records in dataset` : 'No historical data for this combination'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', zIndex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: RANK_COLORS[r.rank - 1] }}>
                        {r.predicted_yield.toFixed(2)} t/ha
                      </div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginTop: 16, boxShadow: 'var(--shadow-sm)' }}>
          <div className="chart-title" style={{ marginBottom: 4 }}>Yield Comparison</div>
          <div className="chart-sub" style={{ marginBottom: 16 }}>Predicted yield (tonnes/hectare) for top {result.recommendations.length} crops</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(1)} t/ha`} />
              <YAxis type="category" dataKey="crop" tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                formatter={v => [`${v.toFixed(3)} t/ha`, 'Predicted Yield']}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="yield" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="info-banner" style={{ marginTop: 16 }}>
            Recommendations are ranked by predicted yield (t/ha) using the Random Forest model.
            Crops with more historical records in the dataset provide more reliable estimates.
          </div>
        </div>
      )}
    </>
  )
}
