import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Inventory from './pages/Inventory';
import PharmacyNetwork from './pages/PharmacyNetwork';  // ← ADD THIS

function App() {
  return (
    <Router>
      <div>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/network" element={<PharmacyNetwork />} />  {/* ← ADD THIS */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;