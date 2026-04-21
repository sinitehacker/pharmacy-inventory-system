import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Inventory from './pages/Inventory';
import PharmacyNetwork from './pages/PharmacyNetwork';
import Login from './components/Auth/Login';
import Logout from './components/Auth/Logout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const name = localStorage.getItem('pharmacy_name');
    if (token) {
      setIsAuthenticated(true);
      setPharmacyName(name || 'Pharmacy');
    }
  }, []);

  const handleLogin = (data) => {
    setIsAuthenticated(true);
    setPharmacyName(data.pharmacy_name);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('pharmacy_id');
    localStorage.removeItem('pharmacy_name');
    setIsAuthenticated(false);
    setPharmacyName('');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div>
        {/* Navigation Bar */}
        <div style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>🏥 Pharmacy Network</div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', padding: '12px 0' }}>📊 Dashboard</Link>
              <Link to="/inventory" style={{ color: 'white', textDecoration: 'none', padding: '12px 0' }}>📦 Inventory</Link>
              <Link to="/pharmacy-network" style={{ color: 'white', textDecoration: 'none', padding: '12px 0' }}>🌐 Pharmacy Network</Link>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '14px' }}>Logged in as: {pharmacyName}</span>
            <Logout onLogout={handleLogout} />
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/pharmacy-network" element={<PharmacyNetwork />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;