import { NavLink } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

const links = [
  { to: '/dashboard', icon: '▦', label: 'Overview' },
  { to: '/eda',       icon: '◈', label: 'Explore' },
  { to: '/map',       icon: '◉', label: 'Map' },
  { to: '/predict',   icon: '◎', label: 'Predict' },
  { to: '/model',     icon: '◬', label: 'Model' },
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

      <div className="nav-section">
        <div className="nav-section-label">Navigation</div>
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon-wrap">{icon}</span>
            <span>{label}</span>
          </NavLink>
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
