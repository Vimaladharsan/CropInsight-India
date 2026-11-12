import { useEffect, useState, useMemo } from 'react'
import { getCalendar } from '../api'

const SEASON_COLORS = {
  'Kharif':     '#22c55e',
  'Rabi':       '#3b82f6',
  'Whole Year': '#a855f7',
  'Summer':     '#f59e0b',
  'Zaid':       '#06b6d4',
}

const SEASON_ICONS = {
  'Kharif': '🌧',
  'Rabi': '❄️',
  'Whole Year': '🔄',
  'Summer': '☀️',
  'Zaid': '🌱',
}

function yieldColor(val, minV, maxV, perCropMin, perCropMax, mode) {
  if (val == null) return null
  const lo = mode === 'crop' ? perCropMin : minV
  const hi = mode === 'crop' ? perCropMax : maxV
  if (hi === lo) return 'hsl(142,60%,70%)'
  const norm = (Math.log1p(val) - Math.log1p(lo)) / (Math.log1p(hi) - Math.log1p(lo))
  const lightness = Math.round(94 - norm * 62)
  return `hsl(142, 68%, ${lightness}%)`
}

function textColor(lightness) {
  return lightness < 55 ? '#fff' : '#166534'
}

export default function Calendar() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState('All States')
  const [tab, setTab] = useState('heatmap')
  const [colorMode, setColorMode] = useState('crop') // 'crop' | 'global'

  useEffect(() => {
    setLoading(true)
    getCalendar(state)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'); setLoading(false) })
  }, [state])

  // Build lookup: crop+season → cell data
  const cellMap = useMemo(() => {
    if (!data?.matrix) return {}
    const m = {}
    data.matrix.forEach(r => { m[`${r.Crop}__${r.Season}`] = r })
    return m
  }, [data])

  // Global yield range
  const { globalMin, globalMax } = useMemo(() => {
    if (!data?.matrix?.length) return { globalMin: 0, globalMax: 1 }
    const vals = data.matrix.map(r => r.avg_yield).filter(Boolean)
    return { globalMin: Math.min(...vals), globalMax: Math.max(...vals) }
  }, [data])

  // Per-crop yield range
  const perCropRange = useMemo(() => {
    if (!data?.matrix) return {}
    const ranges = {}
    data.matrix.forEach(r => {
      if (!ranges[r.Crop]) ranges[r.Crop] = { min: Infinity, max: -Infinity }
      if (r.avg_yield < ranges[r.Crop].min) ranges[r.Crop].min = r.avg_yield
      if (r.avg_yield > ranges[r.Crop].max) ranges[r.Crop].max = r.avg_yield
    })
    return ranges
  }, [data])

  const seasons = data?.seasons?.filter(s => data.matrix?.some(r => r.Season === s)) ?? []

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Crop Season Calendar</h2>
          <p>Which crops grow in which seasons — avg yield heatmap across state × season combinations</p>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {loading && (
        <div>{[...Array(5)].map((_, i) => <div key={i} className="skeleton skeleton-line" style={{ width: `${90 - i * 8}%`, marginBottom: 12, height: i === 0 ? 60 : 16 }} />)}</div>
      )}

      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>State</span>
              <select value={state} onChange={e => setState(e.target.value)} style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: '0.83rem', cursor: 'pointer',
              }}>
                <option value="All States">All States</option>
                {data.states_list?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Color scale</span>
              {[['crop', 'Per crop'], ['global', 'Global']].map(([v, l]) => (
                <button key={v} onClick={() => setColorMode(v)} style={{
                  padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem',
                  fontWeight: colorMode === v ? 700 : 400, cursor: 'pointer',
                  background: colorMode === v ? 'var(--accent)' : 'var(--surface)',
                  color: colorMode === v ? '#fff' : 'var(--text-secondary)',
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['heatmap', 'Crop Heatmap'], ['seasons', 'Season Profiles']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem',
                fontWeight: tab === id ? 700 : 500, cursor: 'pointer',
                background: tab === id ? 'var(--accent)' : 'var(--surface)',
                color: tab === id ? '#fff' : 'var(--text-secondary)',
              }}>{label}</button>
            ))}
          </div>

          {/* Heatmap */}
          {tab === 'heatmap' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                Top {data.crop_order?.length} crops × {seasons.length} seasons
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Color = avg yield (t/ha) · {colorMode === 'crop' ? 'Each row normalized independently (best season per crop)' : 'Global scale across all crops'}
              </div>

              {/* Season header legend */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                {seasons.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: SEASON_COLORS[s] || '#888' }} />
                    {SEASON_ICONS[s]} {s}
                  </div>
                ))}
              </div>

              <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '5px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '2px solid var(--border)', minWidth: 140 }}>Crop</th>
                    {seasons.map(s => (
                      <th key={s} style={{ padding: '5px 10px', textAlign: 'center', borderBottom: '2px solid var(--border)', borderLeft: `3px solid ${SEASON_COLORS[s] || '#888'}`, minWidth: 72 }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: SEASON_COLORS[s] || 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.crop_order?.map((crop, ri) => {
                    const cr = perCropRange[crop] || { min: 0, max: 1 }
                    return (
                      <tr key={crop} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '5px 10px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{crop}</td>
                        {seasons.map(season => {
                          const cell = cellMap[`${crop}__${season}`]
                          const bg = cell ? yieldColor(cell.avg_yield, globalMin, globalMax, cr.min, cr.max, colorMode) : null
                          const norm = cell && colorMode === 'crop'
                            ? (Math.log1p(cell.avg_yield) - Math.log1p(cr.min)) / (Math.log1p(cr.max) - Math.log1p(cr.min) || 1)
                            : cell
                              ? (Math.log1p(cell.avg_yield) - Math.log1p(globalMin)) / (Math.log1p(globalMax) - Math.log1p(globalMin) || 1)
                              : 0
                          const lness = Math.round(94 - norm * 62)
                          return (
                            <td key={season}
                              title={cell ? `${crop} · ${season}\nYield: ${cell.avg_yield?.toFixed(2)} t/ha\nArea: ${(cell.avg_area / 1000).toFixed(0)}K ha\nRecords: ${cell.records}` : '—'}
                              style={{
                                padding: '5px 8px', textAlign: 'center',
                                background: bg || 'var(--surface-2)',
                                borderLeft: `2px solid ${SEASON_COLORS[season] || '#888'}22`,
                              }}>
                              {cell ? (
                                <span style={{ fontWeight: 600, color: textColor(lness), fontSize: '0.72rem' }}>
                                  {cell.avg_yield < 10 ? cell.avg_yield?.toFixed(2) : cell.avg_yield?.toFixed(1)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--border)', fontSize: '0.7rem' }}>—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Values are average yield in tonnes/hectare · Hover for details · Blank = crop not grown in that season (or fewer than 5 records)
              </div>
            </div>
          )}

          {/* Season Profiles */}
          {tab === 'seasons' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.season_profiles?.map(sp => (
                <div key={sp.season} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderLeft: `4px solid ${SEASON_COLORS[sp.season] || '#888'}`,
                  borderRadius: 10, padding: '1.25rem', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: '1.4rem' }}>{SEASON_ICONS[sp.season]}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{sp.season}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sp.crops} crops · {sp.states} states · {sp.records.toLocaleString()} records</div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Yield</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: SEASON_COLORS[sp.season] || 'var(--accent)' }}>{sp.avg_yield?.toFixed(2)} t/ha</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Production</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>{(sp.total_production / 1e9).toFixed(1)}B t</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Top 5 Crops by Production</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sp.top_crops?.map((c, i) => {
                      const pct = sp.top_crops[0].total_production > 0
                        ? (c.total_production / sp.top_crops[0].total_production * 100)
                        : 0
                      return (
                        <div key={i} style={{
                          position: 'relative', flex: '1 1 140px', background: 'var(--surface-2)',
                          border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', overflow: 'hidden',
                        }}>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, width: `${pct}%`, background: SEASON_COLORS[sp.season] || 'var(--accent)', borderRadius: '0 0 0 8px', opacity: 0.6 }} />
                          <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{c.Crop}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(c.total_production / 1e6).toFixed(1)}M t</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
