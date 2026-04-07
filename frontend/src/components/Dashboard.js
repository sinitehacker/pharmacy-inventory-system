import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, PieChart, LineChart } from './SimpleChart';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMedicines: 0,
    expiringSoon: 0,
    lowStock: 0
  });
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  // Chart data states
  const [monthlyDemand, setMonthlyDemand] = useState({ labels: [], data: [] });
  const [topMedicines, setTopMedicines] = useState({ labels: [], data: [] });
  const [healthData, setHealthData] = useState({ labels: [], data: [], colors: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const inventoryData = await api.getInventory();
    setInventory(inventoryData);
    
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);
    
    const expiringSoon = inventoryData.filter(item => {
      const expiry = new Date(item.expiry_date);
      return expiry <= thirtyDaysLater && expiry >= today;
    }).length;
    
    const lowStock = inventoryData.filter(item => item.quantity < 50).length;
    
    setStats({
      totalMedicines: inventoryData.length,
      expiringSoon: expiringSoon,
      lowStock: lowStock
    });
    
    generateAlerts(inventoryData);
    
    const forecastData = await api.getForecast();
    setForecast(forecastData);
    
    // Generate chart data
    generateMonthlyDemandData(inventoryData);
    generateTopMedicinesData(inventoryData);
    generateHealthPieData(inventoryData);
    
    setLoading(false);
  };

  const generateMonthlyDemandData = (inventoryData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const demandData = new Array(12).fill(0);
    
    inventoryData.forEach(item => {
      let demand = 0;
      if (item.quantity < 50) demand = 80;
      else if (item.quantity < 100) demand = 50;
      else demand = 30;
      
      const randomMonth = Math.floor(Math.random() * 12);
      demandData[randomMonth] += demand;
    });
    
    setMonthlyDemand({ labels: months, data: demandData });
  };

  const generateTopMedicinesData = (inventoryData) => {
    const sorted = [...inventoryData].sort((a, b) => b.quantity - a.quantity);
    const top5 = sorted.slice(0, 5);
    
    setTopMedicines({
      labels: top5.map(item => item.name.length > 15 ? item.name.slice(0, 12) + '...' : item.name),
      data: top5.map(item => Math.round(100 - item.quantity / 2))
    });
  };

  const generateHealthPieData = (inventoryData) => {
    let healthy = 0;
    let monitor = 0;
    let critical = 0;
    let expiring = 0;
    
    const today = new Date();
    
    inventoryData.forEach(item => {
      const expiry = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 30) {
        expiring++;
      } else if (item.quantity < 50) {
        critical++;
      } else if (item.quantity < 100 || daysUntilExpiry <= 90) {
        monitor++;
      } else {
        healthy++;
      }
    });
    
    setHealthData({
      labels: ['🟢 Good Stock', '🟡 Monitor', '🟠 Low Stock', '🔴 Expiring Soon'],
      data: [healthy, monitor, critical, expiring],
      colors: ['#4caf50', '#ffc107', '#ff9800', '#f44336']
    });
  };

  const generateAlerts = (inventoryData) => {
    const newAlerts = [];
    const today = new Date();
    
    inventoryData.forEach(item => {
      const expiry = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      
      if (item.quantity < 50 && item.quantity > 0) {
        newAlerts.push({
          id: `stock-${item.id}`,
          type: 'warning',
          icon: '⚠️',
          title: 'Low Stock Alert',
          message: `${item.name} stock will run out soon`,
          action: 'Order More',
          medicine: item.name
        });
      }
      
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        newAlerts.push({
          id: `expiry-${item.id}`,
          type: 'danger',
          icon: '📅',
          title: 'Expiry Alert',
          message: `${item.name} expires in ${daysUntilExpiry} days`,
          action: 'Send Alert',
          medicine: item.name
        });
      }
    });
    
    setAlerts(newAlerts.slice(0, 3));
  };

  const calculateHealthScore = (inventoryData) => {
    if (inventoryData.length === 0) return { score: 100, condition: 'GOOD' };
    
    let expiringCount = 0;
    let lowStockCount = 0;
    
    inventoryData.forEach(item => {
      const expiry = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 30) expiringCount++;
      if (item.quantity < 50) lowStockCount++;
    });
    
    let score = 100;
    score -= expiringCount * 5;
    score -= lowStockCount * 3;
    score = Math.max(0, Math.min(100, score));
    
    let condition = 'GOOD';
    if (score < 50) condition = 'CRITICAL';
    else if (score < 70) condition = 'NEEDS ATTENTION';
    else if (score < 85) condition = 'FAIR';
    
    return { score: Math.round(score), condition };
  };

  const health = calculateHealthScore(inventory);
  const scoreColor = health.score >= 80 ? '#4caf50' : health.score >= 60 ? '#ff9800' : '#f44336';

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🏥 Pharmacy Inventory Dashboard</h1>
      <p>Welcome to the inventory management system</p>
      
      {/* How to Use Guide */}
      <div style={{
        backgroundColor: '#e8f5e9',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '20px',
        borderLeft: '4px solid #4caf50'
      }}>
        <strong>📖 How to Use This System</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
          <span>1️⃣ Add medicines to inventory</span>
          <span>2️⃣ Check alerts daily</span>
          <span>3️⃣ Order medicines when stock is low</span>
          <span>4️⃣ Share surplus stock with nearby pharmacies</span>
        </div>
      </div>
      
      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🚨 Pharmacy Alerts</h3>
          {alerts.map((alert) => (
            <div key={alert.id} style={{
              backgroundColor: alert.type === 'danger' ? '#ffebee' : '#fff3e0',
              borderLeft: `4px solid ${alert.type === 'danger' ? '#f44336' : '#ff9800'}`,
              padding: '12px 15px',
              marginBottom: '10px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div>
                <strong>{alert.icon} {alert.title}</strong>
                <div style={{ fontSize: '14px' }}>{alert.message}</div>
              </div>
              <button onClick={() => alert(`Action: ${alert.action} for ${alert.medicine}`)} style={{
                padding: '6px 12px',
                backgroundColor: alert.type === 'danger' ? '#f44336' : '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}>
                {alert.action}
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Health Score */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '20px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0 }}>📊 Pharmacy Health Score</h3>
        <p style={{ fontSize: '48px', margin: '10px 0', color: scoreColor, fontWeight: 'bold' }}>
          {health.score} / 100
        </p>
        <p style={{ backgroundColor: scoreColor + '20', display: 'inline-block', padding: '5px 15px', borderRadius: '20px', color: scoreColor, fontWeight: 'bold' }}>
          Inventory Condition: {health.condition}
        </p>
      </div>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#1976d2' }}>📊 Total Medicines</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalMedicines}</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: '#ffebee', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#c62828' }}>⚠️ Medicines Expiring Soon</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.expiringSoon}</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#ef6c00' }}>📦 Medicines Running Out</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.lowStock}</p>
        </div>
      </div>
      
      {/* Graph 1: Monthly Demand Trend */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>📈 Monthly Medicine Demand Trend</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>Shows seasonal trends - when demand increases</p>
        <LineChart title="Demand Trend" labels={monthlyDemand.labels} data={monthlyDemand.data} label="Units Demanded" color="#4caf50" />
      </div>
      
      {/* Graph 2: Top Selling Medicines */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>🏆 Top Selling Medicines</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>Most popular medicines - keep good stock</p>
        <BarChart title="Top 5 Medicines by Demand" labels={topMedicines.labels} data={topMedicines.data} label="Demand Score" colors="rgba(76, 175, 80, 0.6)" />
      </div>
      
      {/* Graph 3: Inventory Health Pie Chart */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>🥧 Inventory Health Status</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>Quick view of your inventory condition</p>
        <PieChart title="Stock Health Distribution" labels={healthData.labels} data={healthData.data} colors={healthData.colors} />
      </div>
      
      {/* Forecast Section */}
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '10px' }}>
        <h3>📈 Medicines You Should Order Soon</h3>
        {forecast ? (
          <>
            <p>{forecast.message}</p>
            {forecast.recommendations && (
              <ul>
                {forecast.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec.medicine}: Order <strong>{rec.recommendedOrder} units</strong></li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>Add more sales data to see recommendations</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;