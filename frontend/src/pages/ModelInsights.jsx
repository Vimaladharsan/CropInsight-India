import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getModelInsights } from '../api'

const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6']

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '1.1rem 1.25rem', boxShadow: 'var(--shadow-sm)', flex: '1 1 140px',
    }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: accent || 'var(--accent)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{payload[0].payload.feature}</div>
      <div style={{ color: 'var(--accent)' }}>Importance: <strong>{(payload[0].value * 100).toFixed(2)}%</strong></div>
    </div>
  )
}

export default function ModelInsights() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getModelInsights()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'); setLoading(false) })
  }, [])

  const notTrained = data && data.trained === false

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Model Insights</h2>
          <p>Random Forest performance, feature importance, and comparison with baseline</p>
        </div>
        <div style={{
          padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: notTrained ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          color: notTrained ? '#ef4444' : '#22c55e',
          border: `1px solid ${notTrained ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
        }}>
          {loading ? '● Connecting' : notTrained ? '● Model not trained' : '● Model loaded'}
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {loading && (
        <div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton skeleton-line" style={{ width: `${90 - i * 8}%`, marginBottom: 12, height: i === 0 ? 60 : 16 }} />
          ))}
        </div>
      )}

      {notTrained && !loading && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '2rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📓</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Model not trained yet</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.7, fontSize: '0.9rem' }}>
            Run the Jupyter notebook to train the Random Forest model and generate model files in the <code>/model/</code> directory.
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 16px', display: 'inline-block', textAlign: 'left', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            cd notebooks<br />
            jupyter notebook CropInsight_Analysis.ipynb
          </div>
        </div>
      )}

      {data && data.trained && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Random Forest Performance</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <MetricCard label="R² Score" value={data.rf?.r2?.toFixed(4)} sub="Variance explained" accent="#22c55e" />
              <MetricCard label="RMSE" value={data.rf?.rmse?.toLocaleString(undefined, { maximumFractionDigits: 0 })} sub="Root mean squared error" accent="#3b82f6" />
              <MetricCard label="MAE" value={data.rf?.mae?.toLocaleString(undefined, { maximumFractionDigits: 0 })} sub="Mean absolute error" accent="#a855f7" />
              <MetricCard label="Trees" value={data.rf?.n_estimators ?? 100} sub="Estimators in forest" accent="#f59e0b" />
            </div>
          </div>

          {data.lr && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Model Comparison</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0 }}>
                {[['', 'R²', 'RMSE', 'MAE'], ['Linear Regression', data.lr.r2?.toFixed(4), data.lr.rmse?.toFixed(0), data.lr.mae?.toFixed(0)], ['Random Forest', data.rf.r2?.toFixed(4), data.rf.rmse?.toFixed(0), data.rf.mae?.toFixed(0)]].map((row, ri) =>
                  row.map((cell, ci) => (
                    <div key={`${ri}-${ci}`} style={{
                      padding: '8px 12px', fontSize: ri === 0 ? '0.68rem' : '0.85rem',
                      fontWeight: ri === 0 || ci === 0 ? 700 : 400,
                      color: ri === 0 ? 'var(--text-muted)' : ri === 2 && ci > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                      borderBottom: '1px solid var(--border)', borderRight: ci < 3 ? '1px solid var(--border)' : 'none',
                      textTransform: ri === 0 ? 'uppercase' : 'none', letterSpacing: ri === 0 ? '0.06em' : 'normal',
                      background: ri === 2 ? 'rgba(34,197,94,0.04)' : 'transparent',
                    }}>{cell}</div>
                  ))
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Random Forest outperforms Linear Regression on this non-linear agricultural dataset. Target was log-transformed (np.log1p) before training.
              </div>
            </div>
          )}

          {data.feature_importances && data.feature_importances.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Feature Importance</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.feature_importances} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="feature" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {data.feature_importances.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Features ranked by mean decrease in impurity (Gini importance). Area and Crop type are the dominant predictors.
              </div>
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Model Architecture</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.85rem' }}>
              {[['Algorithm', 'Random Forest Regressor'], ['Target transform', 'np.log1p(Production)'], ['Encoding', 'LabelEncoder (State, Season, Crop)'], ['Features', 'Area, Year, Season, State, Crop'], ['Train/Test split', '80 / 20'], ['Evaluation metric', 'R², RMSE, MAE']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>{k}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
