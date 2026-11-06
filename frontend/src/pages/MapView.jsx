import { useEffect, useState, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { getStateMap } from '../api'

const GEO_URL = 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-states.json'

function interpolateGreen(ratio) {
  const t = Math.pow(Math.max(0, Math.min(1, ratio)), 0.45)
  const r = Math.round(220 + (20 - 220) * t)
  const g = Math.round(252 + (83 - 252) * t)
  const b = Math.round(231 + (45 - 231) * t)
  return `rgb(${r},${g},${b})`
}

function matchState(geoName, dataMap) {
  if (!geoName) return null
  const lower = geoName.toLowerCase()
  for (const [key, val] of dataMap.entries()) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return val
  }
  return null
}

export default function MapView() {
  const [stateData, setStateData] = useState(new Map())
  const [maxProd, setMaxProd] = useState(1)
  const [tooltip, setTooltip] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState({ coordinates: [82, 22], zoom: 1 })

  useEffect(() => {
    getStateMap()
      .then(data => {
        const map = new Map(data.map(d => [d.State_Name, d]))
        setStateData(map)
        setMaxProd(Math.max(...data.map(d => d.total_production)))
        setLoading(false)
      })
      .catch(() => { setError('Backend not running — start with: cd backend && python -m uvicorn main:app --reload --port 8001'); setLoading(false) })
  }, [])

  const handleZoomIn = () => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.6, 8) }))
  const handleZoomOut = () => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.6, 1) }))
  const handleReset = () => { setPosition({ coordinates: [82, 22], zoom: 1 }); setSelected(null) }

  const topStates = [...stateData.values()]
    .sort((a, b) => b.total_production - a.total_production)
    .slice(0, 8)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>India Production Map</h2>
          <p>State-wise crop production — hover to explore, scroll to zoom</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleZoomIn} style={btnStyle}>＋</button>
          <button onClick={handleZoomOut} style={btnStyle}>－</button>
          <button onClick={handleReset} style={btnStyle}>⟳ Reset</button>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
          {loading && <div className="loading" style={{ height: 520 }}>Loading map…</div>}

          {!loading && (
            <>
              {tooltip && (
                <div style={{
                  position: 'absolute', top: tooltip.y + 10, left: tooltip.x + 10, zIndex: 20,
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: 12, pointerEvents: 'none',
                  maxWidth: 180,
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{tooltip.name}</div>
                  {tooltip.data ? (
                    <>
                      <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{(tooltip.data.total_production / 1e6).toFixed(1)} MT</div>
                      <div style={{ color: 'var(--text-muted)' }}>Avg yield: {tooltip.data.avg_yield?.toFixed(2)} t/ha</div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>No data available</div>
                  )}
                </div>
              )}

              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 900, center: [82, 23] }}
                style={{ width: '100%', height: 520 }}
              >
                <ZoomableGroup
                  zoom={position.zoom}
                  center={position.coordinates}
                  onMoveEnd={setPosition}
                >
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map(geo => {
                        const name = geo.properties.NAME_1
                        const data = matchState(name, stateData)
                        const ratio = data ? data.total_production / maxProd : 0
                        const fill = data ? interpolateGreen(ratio) : 'var(--surface-2)'
                        const isSelected = selected === name
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fill}
                            stroke="var(--surface)"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: 'none', filter: isSelected ? 'brightness(0.85)' : 'none' },
                              hover: { outline: 'none', filter: 'brightness(0.88)', cursor: 'pointer' },
                              pressed: { outline: 'none' },
                            }}
                            onMouseMove={e => setTooltip({ name, data, x: e.clientX - e.currentTarget.closest('svg').getBoundingClientRect().left, y: e.clientY - e.currentTarget.closest('svg').getBoundingClientRect().top })}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={() => setSelected(s => s === name ? null : name)}
                          />
                        )
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Low</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'linear-gradient(to right, #dcfce7, #14532d)' }} />
                <span>High production</span>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Top 8 States</div>
            {topStates.map((s, i) => {
              const pct = ((s.total_production / maxProd) * 100).toFixed(0)
              return (
                <div key={s.State_Name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: i === 0 ? 700 : 400 }}>{i + 1}. {s.State_Name}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{(s.total_production / 1e6).toFixed(0)}M</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#22c55e' : '#3b82f6', borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {selected && (() => {
            const data = matchState(selected, stateData)
            return data ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Selected State</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>{selected}</div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total production</span>
                    <span style={{ fontWeight: 600 }}>{(data.total_production / 1e6).toFixed(1)} MT</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Avg yield</span>
                    <span style={{ fontWeight: 600 }}>{data.avg_yield?.toFixed(2)} t/ha</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Share of India</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{((data.total_production / (maxProd * 1.5)) * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ marginTop: 10, width: '100%', padding: '5px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>Clear selection</button>
              </div>
            ) : null
          })()}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', boxShadow: 'var(--shadow-sm)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>How to use</div>
            <div>• Hover over a state to see details</div>
            <div>• Click to select & inspect</div>
            <div>• Scroll or use ＋/－ to zoom</div>
            <div>• Drag to pan when zoomed in</div>
          </div>
        </div>
      </div>
    </>
  )
}

const btnStyle = {
  padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
  fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
}
