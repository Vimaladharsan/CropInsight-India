import { NavLink } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

const groups = [
  {
    label: 'Analytics',
    links: [
      { to: '/dashboard', icon: '▦', label: 'Overview' },
      { to: '/eda',       icon: '◈', label: 'Explore' },
      { to: '/map',       icon: '◉', label: 'Map' },
      { to: '/districts', icon: '⊞', label: 'Districts' },
      { to: '/rainfall',  icon: '🌧', label: 'Rainfall' },
      { to: '/calendar',  icon: '▦', label: 'Calendar' },
    ],
  },
  {
    label: 'Research',
    links: [
      { to: '/compare',  icon: '⚖', label: 'Compare' },
      { to: '/forecast', icon: '◭', label: 'Forecast' },
    ],
  },
  {
    label: 'ML',
    links: [
      { to: '/predict',   icon: '◎', label: 'Predict' },
      { to: '/recommend', icon: '✦', label: 'Recommend' },
      { to: '/cluster',   icon: '⬡', label: 'Clusters' },
      { to: '/anomaly',   icon: '◈', label: 'Anomalies' },
      { to: '/model',     icon: '◬', label: 'Model' },
    ],
  },
]

export default function Navbar() {
  const { dark, toggle } = useTheme()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="sidebar-logo-icon">🌾</div>
          <div>
            <h1>CropInsight</h1>
            <p>India · 1997–2015</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
        {groups.map(({ label, links }) => (
          <div key={label} className="nav-section">
            <div className="nav-section-label">{label}</div>
            {links.map(({ to, icon, lbl, label: lLabel }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              >
                <span className="nav-icon-wrap">{icon}</span>
                <span>{lLabel}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="theme-btn" onClick={toggle}>
          <span>{dark ? '☀' : '◑'}</span>
          <span>{dark ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <div className="dataset-info">
          <div>246K+ records · 25 states</div>
          <div>50+ crops · 5 seasons</div>
        </div>
      </div>
    </aside>
  )
}
