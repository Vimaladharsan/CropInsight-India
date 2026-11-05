import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/eda',       icon: '🔍', label: 'EDA Explorer' },
  { to: '/predict',   icon: '🌾', label: 'Predict Yield' },
]

export default function Navbar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>🌱 CropInsight</h1>
        <p>India Agriculture Analytics</p>
      </div>
      <nav className="nav-links">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>Dataset: 1997–2015</p>
        <p>246K+ records</p>
      </div>
    </aside>
  )
}
