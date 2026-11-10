import { useEffect, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { getClusters } from '../api'

const CLUSTER_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7']
const CLUSTER_LABELS = ['A', 'B', 'C', 'D', 'E']

function clusterLabel(profile, allProfiles) {
  const maxYield = Math.max(...allProfiles.map(p => p.avg_yield))
  const maxProd  = Math.max(...allProfiles.map(p => p.total_production))
  const maxDiv   = Math.max(...allProfiles.map(p => p.crop_diversity))
  if (profile.avg_yield >= maxYield * 0.9) return 'High Yield'
  if (profile.total_production >= maxProd * 0.9) return 'High Volume'
  if (profile.crop_diversity >= maxDiv * 0.9) return 'Diverse Crops'
  if (profile.avg_yield <= Math.min(...allProfiles.map(p => p.avg_yield)) * 1.1) return 'Subsistence'
  return 'Mixed Profile'
}

const ScatterDot = (props) => {
  const { cx, cy, payload } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={CLUSTER_COLORS[payload.cluster % CLUSTER_COLORS.length]}
        stroke="var(--surface)" strokeWidth={1.5} opacity={0.9} />
      <text x={cx + 8} y={cy + 4} fontSize={9} fill="var(--text-muted)" fontFamily="system-ui"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {payload.state.length > 9 ? payload.state.slice(0, 9) + '…' : payload.state}
      </text>
    </g>
  )
}

const ScatterTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{d.state}</div>
      <div style={{ color: CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length], fontWeight: 600, marginBottom: 4 }}>Cluster {CLUSTER_LABELS[d.cluster]}</div>
      <div style={{ color: 'var(--text-muted)' }}>Avg yield: <strong>{d.avg_yield?.toFixed(2)}</strong> t/ha</div>
      <div style={{ color: 'var(--text-muted)' }}>Crops grown: <strong>{d.crop_diversity}</strong></div>
      <div style={{ color: 'var(--text-muted)' }}>Avg area: <strong>{(d.avg_area / 1000).toFixed(0)}K</strong> ha</div>
    </div>
  )
}

export default function Cluster() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('scatter')

  useEffect(() => {
    getClusters()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'); setLoading(false) })
  }, [])

  const notAvailable = data && !data.available

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>State Clustering</h2>
          <p>K-Means unsupervised clustering of Indian states by agricultural profile — yield, area, crop diversity, production trend</p>
        </div>
        {data?.silhouette && (
          <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
            Silhouette: {data.silhouette}
          </div>
        )}
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {loading && (
        <div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-line" style={{ width: `${90 - i * 8}%`, marginBottom: 12, height: i === 0 ? 60 : 16 }} />
          ))}
        </div>
      )}

      {notAvailable && !loading && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📓</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Cluster data not generated yet</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>Run the Jupyter notebook (Restart &amp; Run All) to generate clusters.json.</div>
        </div>
      )}

      {data?.available && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Cluster profile cards */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {data.k} Clusters · {data.states?.length} States · Silhouette {data.silhouette}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {data.profiles?.map(p => {
                const color = CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length]
                const label = clusterLabel(p, data.profiles)
                return (
                  <div key={p.cluster} style={{
                    flex: '1 1 180px', background: 'var(--surface)', border: `1px solid var(--border)`,
                    borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '1rem 1.1rem',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Cluster {CLUSTER_LABELS[p.cluster]}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: `${color}22`, color, borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{label}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.9 }}>
                      <div>States: <strong style={{ color: 'var(--text-secondary)' }}>{p.count}</strong></div>
                      <div>Avg yield: <strong style={{ color: 'var(--text-secondary)' }}>{p.avg_yield?.toFixed(2)} t/ha</strong></div>
                      <div>Crop diversity: <strong style={{ color: 'var(--text-secondary)' }}>{p.crop_diversity?.toFixed(0)} crops</strong></div>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {p.states?.map(s => (
                        <span key={s} style={{ fontSize: '0.65rem', background: 'var(--surface-2)', color: 'var(--text-muted)', borderRadius: 3, padding: '1px 5px' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['scatter', 'PCA Scatter'], ['table', 'State Table']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem',
                fontWeight: tab === id ? 700 : 500, cursor: 'pointer',
                background: tab === id ? 'var(--accent)' : 'var(--surface)',
                color: tab === id ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>

          {/* Scatter tab */}
          {tab === 'scatter' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>PCA 2D Projection</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                PC1 explains {((data.pca_variance?.[0] ?? 0) * 100).toFixed(0)}% variance, PC2 explains {((data.pca_variance?.[1] ?? 0) * 100).toFixed(0)}%
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                {data.profiles?.map(p => (
                  <div key={p.cluster} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length] }} />
                    Cluster {CLUSTER_LABELS[p.cluster]}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="pca_x" name="PC1" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'PC1', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis type="number" dataKey="pca_y" name="PC2" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
                  <ReferenceLine x={0} stroke="var(--border)" strokeDasharray="4 4" />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                  <Tooltip content={<ScatterTip />} />
                  <Scatter data={data.states} shape={<ScatterDot />}>
                    {data.states?.map((s, i) => <Cell key={i} fill={CLUSTER_COLORS[s.cluster % CLUSTER_COLORS.length]} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table tab */}
          {tab === 'table' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>All States by Cluster</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr>
                    {['Cluster', 'State', 'Avg Yield (t/ha)', 'Crop Diversity', 'Avg Area (K ha)', 'Year Trend'].map(h => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.states?.slice().sort((a, b) => a.cluster - b.cluster || a.state.localeCompare(b.state)).map((s, i) => {
                    const color = CLUSTER_COLORS[s.cluster % CLUSTER_COLORS.length]
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                        <td style={{ padding: '7px 10px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                            {CLUSTER_LABELS[s.cluster]}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.state}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>{s.avg_yield?.toFixed(3)}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>{s.crop_diversity}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>{(s.avg_area / 1000).toFixed(1)}</td>
                        <td style={{ padding: '7px 10px', color: s.year_trend >= 0 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                          {s.year_trend >= 0 ? '↑' : '↓'} {Math.abs(s.year_trend).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Features: avg yield, total production, avg area, crop diversity, production std, year trend · Scaled with StandardScaler · k chosen by silhouette score · PCA 2D for visualization only
          </div>
        </div>
      )}
    </>
  )
}
