import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import EDA from './pages/EDA'
import Predict from './pages/Predict'
import MapView from './pages/MapView'
import ModelInsights from './pages/ModelInsights'
import Compare from './pages/Compare'
import Forecast from './pages/Forecast'
import Districts from './pages/Districts'

export default function App() {
  return (
    <ThemeProvider>
      <div className="layout">
        <Navbar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/eda" element={<EDA />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/districts" element={<Districts />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/model" element={<ModelInsights />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  )
}
