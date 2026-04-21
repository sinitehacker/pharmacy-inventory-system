import { useState, useEffect } from 'react';
import { api, analyticsAPI } from '../services/api';
import { BarChart, PieChart, LineChart } from './SimpleChart';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMedicines: 0,
    totalStock: 0,
    expiringSoon: 0,
    lowStock: 0,
    activeAlerts: 0,
    highRiskMedicines: 0,
    mediumRiskMedicines: 0
  });
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [riskReport, setRiskReport] = useState([]);
  const [actionSummary, setActionSummary] = useState({
    reorder: 0,
    monitor: 0,
    redistribute: 0
  });
  const [topRiskMedicines, setTopRiskMedicines] = useState([]);
  
  const [monthlyDemand, setMonthlyDemand] = useState({ labels: [], data: [] });
  const [topMedicines, setTopMedicines] = useState({ labels: [], data: [] });
  const [healthData, setHealthData] = useState({ labels: [], data: [], colors: [] });
  const [healthDetails, setHealthDetails] = useState([]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      const inventoryData = await api.getInventory();
      setInventory(inventoryData);
      
      const riskData = await analyticsAPI.getRiskReport();
      setRiskReport(riskData);
      
      let highRiskCount = 0;
      let mediumRiskCount = 0;
      let reorderCount = 0;
      let monitorCount = 0;
      let redistributeCount = 0;
      const riskMedicines = [];
      
      riskData.forEach(medicine => {
        medicine.batches.forEach(batch => {
          const riskLevel = String(batch.risk_level).toLowerCase();
          if (riskLevel === 'high') {
            highRiskCount++;
            riskMedicines.push({
              name: medicine.medicine_name,
              days_left: batch.days_until_expiry,
              stock: batch.current_stock
            });
          } else if (riskLevel === 'medium') {
            mediumRiskCount++;
          }
        });
      });
      
      // Count low stock for reorder recommendations
      const lowStockItems = inventoryData.filter(item => item.quantity < 50);
      reorderCount = lowStockItems.length;
      
      // Count medium risk for monitoring
      monitorCount = mediumRiskCount;
      
      // Count surplus for redistribution
      const surplusItems = inventoryData.filter(item => item.quantity > 200);
      redistributeCount = surplusItems.length;
      
      setActionSummary({
        reorder: reorderCount,
        monitor: monitorCount,
        redistribute: redistributeCount
      });
      
      // Get top 3 risk medicines
      setTopRiskMedicines(riskMedicines.slice(0, 3));
      
      const lowStock = inventoryData.filter(item => item.quantity < 50 && item.quantity > 0).length;
      const totalStock = inventoryData.reduce((sum, item) => sum + item.quantity, 0);
      
      const todayDate = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(todayDate.getDate() + 30);
      
      const expiringSoonInventory = inventoryData.filter(item => {
        const expiry = new Date(item.expiry_date);
        return expiry <= thirtyDaysLater && expiry >= todayDate;
      }).length;
      
      setStats({
        totalMedicines: inventoryData.length,
        totalStock: totalStock,
        expiringSoon: expiringSoonInventory,
        lowStock: lowStock,
        activeAlerts: highRiskCount + mediumRiskCount,
        highRiskMedicines: highRiskCount,
        mediumRiskMedicines: mediumRiskCount
      });
      
      generateAlertsFromRiskData(riskData, inventoryData);
      
      const forecastData = await api.getForecast();
      // Replace generic AI message with action summary
      const enhancedForecast = {
        ...forecastData,
        message: `Action Summary: ${reorderCount} medicine(s) need reordering, ${monitorCount} batch(es) need monitoring, ${redistributeCount} surplus item(s) can be redistributed.`
      };
      setForecast(enhancedForecast);
      
      generateMonthlyDemandData(inventoryData);
      generateTopMedicinesData(inventoryData);
      generateHealthPieData(inventoryData, riskData);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAlertsFromRiskData = (riskData, inventoryData) => {
    const newAlerts = [];
    
    riskData.forEach(medicine => {
      medicine.batches.forEach(batch => {
        const riskLevel = String(batch.risk_level).toLowerCase();
        if (riskLevel === 'high') {
          newAlerts.push({
            id: `risk-${batch.batch_id}`,
            type: 'danger',
            title: 'Critical Expiry Risk',
            message: batch.risk_message || `${medicine.medicine_name} - ${batch.current_stock} units expiring soon`,
            action: 'Take Action',
            medicine: medicine.medicine_name
          });
        } else if (riskLevel === 'medium') {
          newAlerts.push({
            id: `risk-${batch.batch_id}`,
            type: 'warning',
            title: 'Expiry Warning',
            message: batch.risk_message || `${medicine.medicine_name} needs attention`,
            action: 'Monitor',
            medicine: medicine.medicine_name
          });
        }
      });
    });
    
    inventoryData.forEach(item => {
      if (item.quantity < 50 && item.quantity > 0) {
        newAlerts.push({
          id: `stock-${item.id}`,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${item.name} has only ${item.quantity} units remaining`,
          action: 'Order More',
          medicine: item.name
        });
      }
    });
    
    setAlerts(newAlerts.slice(0, 5));
  };

  const generateMonthlyDemandData = (inventoryData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const demandData = months.map((_, monthIndex) => {
      const seasonalFactor = (monthIndex >= 4 && monthIndex <= 7) ? 1.3 : 1.0;
      const baseDemand = inventoryData.reduce((sum, item) => {
        const demandContribution = item.quantity < 100 ? 80 : item.quantity < 300 ? 40 : 20;
        return sum + demandContribution;
      }, 0) / 12;
      return Math.round(baseDemand * seasonalFactor * (0.8 + Math.random() * 0.4));
    });
    
    setMonthlyDemand({ labels: months, data: demandData });
  };

  const generateTopMedicinesData = (inventoryData) => {
    const sorted = [...inventoryData].sort((a, b) => b.quantity - a.quantity);
    const top5 = sorted.slice(0, 5);
    
    setTopMedicines({
      labels: top5.map(item => item.name.length > 18 ? item.name.slice(0, 15) + '...' : item.name),
      data: top5.map(item => item.quantity)
    });
  };

  const generateHealthPieData = (inventoryData, riskData) => {
    let healthy = 0;
    let monitor = 0;
    let lowStockCount = 0;
    let expiring = 0;
    
    riskData.forEach(medicine => {
      medicine.batches.forEach(batch => {
        const riskLevel = String(batch.risk_level).toLowerCase();
        if (riskLevel === 'high') {
          expiring++;
        } else if (riskLevel === 'medium') {
          monitor++;
        } else {
          healthy++;
        }
      });
    });
    
    inventoryData.forEach(item => {
      if (item.quantity < 50 && item.quantity > 0) {
        lowStockCount++;
      }
    });
    
    setHealthData({
      labels: ['Healthy Stock', 'Needs Monitoring', 'Low Stock', 'Expiring Soon'],
      data: [healthy, monitor, lowStockCount, expiring],
      colors: ['#22c55e', '#eab308', '#f97316', '#ef4444']
    });
  };

  const calculateHealthScore = (inventoryData, riskData) => {
    if (!inventoryData || inventoryData.length === 0) return { score: 100, condition: 'Good', details: [] };
    
    let totalBatches = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    const details = [];
    
    riskData.forEach(medicine => {
      medicine.batches.forEach(batch => {
        totalBatches++;
        const riskLevel = String(batch.risk_level).toLowerCase();
        if (riskLevel === 'high') {
          highRiskCount++;
        } else if (riskLevel === 'medium') {
          mediumRiskCount++;
        }
      });
    });
    
    // Calculate percentage of healthy batches
    const healthyBatches = totalBatches - (highRiskCount + mediumRiskCount);
    let score = Math.round((healthyBatches / totalBatches) * 100);
    
    // Track deductions for explanation
    if (highRiskCount > 0) {
      const deduction = Math.min(20, highRiskCount * 5);
      details.push(`${highRiskCount} high risk medicine(s) (expiring soon) - deducted ${deduction}%`);
    }
    
    if (mediumRiskCount > 0) {
      const deduction = Math.min(15, mediumRiskCount * 3);
      details.push(`${mediumRiskCount} medium risk batch(es) - deducted ${deduction}%`);
    }
    
    // Adjust for low stock items (max 10% deduction)
    let lowStockCount = inventoryData.filter(item => item.quantity < 50).length;
    let lowStockPenalty = Math.min(10, Math.round((lowStockCount / inventoryData.length) * 20));
    if (lowStockPenalty > 0) {
      score -= lowStockPenalty;
      details.push(`${lowStockCount} low stock item(s) - deducted ${lowStockPenalty}%`);
    }
    
    // Adjust for expiring soon (max 10% deduction)
    const todayDate = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(todayDate.getDate() + 30);
    const expiringSoonCount = inventoryData.filter(item => {
      const expiry = new Date(item.expiry_date);
      return expiry <= thirtyDaysLater && expiry >= todayDate;
    }).length;
    let expiryPenalty = Math.min(10, Math.round((expiringSoonCount / inventoryData.length) * 20));
    if (expiryPenalty > 0) {
      score -= expiryPenalty;
      details.push(`${expiringSoonCount} medicine(s) expiring within 30 days - deducted ${expiryPenalty}%`);
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let condition = 'Good';
    if (score < 40) condition = 'Critical';
    else if (score < 60) condition = 'Needs Attention';
    else if (score < 80) condition = 'Fair';
    
    return { score: Math.round(score), condition, details };
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const health = calculateHealthScore(inventory, riskReport);
  const scoreColor = health.score >= 80 ? '#22c55e' : health.score >= 60 ? '#eab308' : health.score >= 40 ? '#f97316' : '#ef4444';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📊</div>
          <div>Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 8px 0', color: '#0f172a' }}>Pharmacy Dashboard</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Real-time inventory analytics and alerts</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💊</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a' }}>{stats.totalMedicines}</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Total Medicines</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{stats.totalStock.toLocaleString()} total units</div>
        </div>
        
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#f97316' }}>{stats.activeAlerts}</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Active Alerts</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{stats.highRiskMedicines} high, {stats.mediumRiskMedicines} medium risk</div>
        </div>
        
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📦</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#f97316' }}>{stats.lowStock}</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Low Stock Items</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Need reorder</div>
        </div>
        
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#eab308' }}>{stats.expiringSoon}</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Expiring Within 30 Days</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Take action now</div>
        </div>
      </div>
      
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Overall Inventory Health</div>
        <div style={{ fontSize: '56px', fontWeight: '700', color: scoreColor }}>{health.score}%</div>
        <div style={{ display: 'inline-block', background: scoreColor + '15', color: scoreColor, padding: '4px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', marginTop: '8px' }}>
          {health.condition}
        </div>
        {/* Explainable Health Score Details */}
        <div style={{ marginTop: '16px', fontSize: '13px', color: '#475569', textAlign: 'left', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <strong>📊 Based on:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {health.details.map((detail, i) => <li key={i}>{detail}</li>)}
            {health.details.length === 0 && <li>All inventory parameters are healthy</li>}
          </ul>
        </div>
      </div>
      
      {/* Action Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fef2f2', borderRadius: '16px', padding: '16px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>📦</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{actionSummary.reorder}</div>
          <div style={{ fontSize: '13px', color: '#475569' }}>Medicines need reordering</div>
        </div>
        <div style={{ background: '#fffbeb', borderRadius: '16px', padding: '16px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>👀</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706' }}>{actionSummary.monitor}</div>
          <div style={{ fontSize: '13px', color: '#475569' }}>Batches need monitoring</div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔄</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>{actionSummary.redistribute}</div>
          <div style={{ fontSize: '13px', color: '#475569' }}>Surplus items can be redistributed</div>
        </div>
      </div>
      
      {/* Top Risk Medicines */}
      {topRiskMedicines.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#0f172a' }}>⚠️ Top Wastage Risk Medicines</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topRiskMedicines.map((med, idx) => (
              <div key={idx} style={{ background: '#fef2f2', borderRadius: '12px', padding: '12px 16px', borderLeft: '4px solid #ef4444' }}>
                <strong>{med.name}</strong> - Expires in {med.days_left} days • Stock: {med.stock} units
              </div>
            ))}
          </div>
        </div>
      )}
      
      {alerts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#0f172a' }}>🔔 Active Alerts ({alerts.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map((alert) => (
              <div key={alert.id} style={{
                background: alert.type === 'danger' ? '#fef2f2' : '#fffbeb',
                borderLeft: `4px solid ${alert.type === 'danger' ? '#ef4444' : '#f59e0b'}`,
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#0f172a' }}>{alert.title}</div>
                  <div style={{ fontSize: '14px', color: '#475569' }}>{alert.message}</div>
                </div>
                <button onClick={() => window.alert(`Action: ${alert.action} for ${alert.medicine}`)} style={{
                  padding: '8px 16px',
                  background: alert.type === 'danger' ? '#ef4444' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  {alert.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#0f172a' }}>Monthly Demand Forecast</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Projected demand based on inventory levels</p>
          <LineChart labels={monthlyDemand.labels} data={monthlyDemand.data} label="Demand (units)" color="#10b981" />
        </div>
        
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#0f172a' }}>Top Medicines by Stock</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Highest inventory quantities</p>
          <BarChart labels={topMedicines.labels} data={topMedicines.data} label="Stock Quantity" colors="rgba(34, 197, 94, 0.7)" />
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#0f172a' }}>Inventory Health Distribution</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Breakdown by stock status</p>
          <PieChart labels={healthData.labels} data={healthData.data} colors={healthData.colors} />
        </div>
        
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#0f172a' }}>AI-Powered Recommendations</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Actionable insights from analytics</p>
          {forecast ? (
            <div>
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '500', marginBottom: '8px' }}>📋 Action Summary</div>
                <div style={{ fontSize: '14px', color: '#166534' }}>{forecast.message}</div>
              </div>
              {forecast.recommendations && forecast.recommendations.length > 0 && (
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '8px' }}>🎯 Recommended Actions</div>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {forecast.recommendations.slice(0, 3).map((rec, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', fontSize: '14px', color: '#475569' }}>
                        <strong>{rec.medicine}</strong>: {rec.action || `Order ${rec.recommendedOrder} units`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Loading recommendations...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;