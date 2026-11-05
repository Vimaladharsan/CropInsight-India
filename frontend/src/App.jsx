import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import EDA from './pages/EDA'
import Predict from './pages/Predict'

export default function App() {
  return (
    <div className="layout">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/eda" element={<EDA />} />
          <Route path="/predict" element={<Predict />} />
        </Routes>
      </main>
    </div>
  )
}
