import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Inventory = () => {
  const [formData, setFormData] = useState({
    name: '', generic_name: '', category: '', manufacturer: '',
    quantity: '', expiry_date: '', batch_number: '', purchase_price: '', selling_price: ''
  });
  
  const [inventory, setInventory] = useState([]);
  const [reorderRecs, setReorderRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  const pharmacyId = localStorage.getItem('pharmacy_id') || 1;

  useEffect(() => {
    loadInventory();
    loadReorderRecommendations();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await api.getInventory();
      setInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
    setLoading(false);
  };

  const loadReorderRecommendations = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/matching/reorder/${pharmacyId}`);
      const data = await response.json();
      setReorderRecs(data.recommendations || []);
      console.log('Reorder recs loaded:', data.recommendations?.length);
    } catch (error) {
      console.error('Error loading reorder recommendations:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.expiry_date) {
      setMessage({ text: 'Please fill all required fields', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }
    setLoading(true);
    try {
      await api.addMedicine({
        name: formData.name,
        generic_name: formData.generic_name,
        category: formData.category,
        manufacturer: formData.manufacturer,
        quantity: formData.quantity,
        expiry_date: formData.expiry_date
      });
      setFormData({ name: '', generic_name: '', category: '', manufacturer: '',
        quantity: '', expiry_date: '', batch_number: '', purchase_price: '', selling_price: '' });
      setMessage({ text: 'Medicine added successfully!', type: 'success' });
      await loadInventory();
      await loadReorderRecommendations();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Error adding medicine', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      setLoading(true);
      try {
        await api.deleteMedicine(id);
        setMessage({ text: 'Medicine deleted successfully!', type: 'success' });
        await loadInventory();
        await loadReorderRecommendations();
      } catch (error) {
        setMessage({ text: 'Error deleting medicine', type: 'error' });
      } finally {
        setLoading(false);
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    }
  };

  const getRiskLevel = (expiryDate) => {
    if (!expiryDate) return 'low';
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 30) return 'high';
    if (daysLeft <= 90) return 'medium';
    return 'low';
  };

  const getRiskStyle = (risk) => {
    switch(risk) {
      case 'high': return { bg: '#ffebee', color: '#c62828', text: '🔴 Expiring Soon' };
      case 'medium': return { bg: '#fff8e1', color: '#f57c00', text: '🟡 Use Soon' };
      default: return { bg: '#e8f5e9', color: '#2e7d32', text: '🟢 Good Stock' };
    }
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const getFilteredInventory = () => {
    let filtered = inventory;
    filtered = filtered.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filter === 'expiring') {
      filtered = filtered.filter(item => getRiskLevel(item.expiry_date) === 'high');
    } else if (filter === 'lowStock') {
      filtered = filtered.filter(item => item.quantity < 50);
    }
    return filtered;
  };

  const displayedInventory = getFilteredInventory();

  if (loading && inventory.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading inventory...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>📦 Inventory Management</h1>
      
      {/* Reorder Recommendations Section */}
      {reorderRecs.length > 0 && (
        <div style={{
          backgroundColor: '#fff3e0',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          borderLeft: '4px solid #ff9800'
        }}>
          <h3 style={{ margin: '0 0 12px 0' }}>📋 Reorder Recommendations ({reorderRecs.length})</h3>
          {reorderRecs.slice(0, 10).map((rec, idx) => (
            <div key={idx} style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div>
                <strong>{rec.medicine_name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Stock: {rec.current_stock} | ROP: {rec.reorder_point} | Formula: {rec.formula}
                </div>
              </div>
              <button
                onClick={() => alert(`Order ${rec.suggested_order} units of ${rec.medicine_name}`)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Order {rec.suggested_order} units
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Message Display */}
      {message.text && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '5px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24'
        }}>
          {message.text}
        </div>
      )}
      
      {/* Search and Filter Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search medicine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: '1', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
          />
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setViewMode('table')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'table' ? '#2c3e50' : '#e0e0e0', color: viewMode === 'table' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📋 Table</button>
            <button onClick={() => setViewMode('card')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'card' ? '#2c3e50' : '#e0e0e0', color: viewMode === 'card' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🃏 Card</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={{ padding: '6px 12px', backgroundColor: filter === 'all' ? '#2c3e50' : '#e0e0e0', color: filter === 'all' ? 'white' : '#333', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>All</button>
          <button onClick={() => setFilter('expiring')} style={{ padding: '6px 12px', backgroundColor: filter === 'expiring' ? '#f44336' : '#e0e0e0', color: filter === 'expiring' ? 'white' : '#333', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>🔴 Expiring</button>
          <button onClick={() => setFilter('lowStock')} style={{ padding: '6px 12px', backgroundColor: filter === 'lowStock' ? '#ff9800' : '#e0e0e0', color: filter === 'lowStock' ? 'white' : '#333', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>🟠 Low Stock</button>
        </div>
      </div>
      
      {/* Add Medicine Form */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
        <h3 style={{ marginTop: 0 }}>➕ Add New Medicine</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <input type="text" name="name" placeholder="Medicine Name *" value={formData.name} onChange={handleChange} required />
            <input type="text" name="generic_name" placeholder="Generic Name" value={formData.generic_name} onChange={handleChange} />
            <input type="text" name="category" placeholder="Category" value={formData.category} onChange={handleChange} />
            <input type="text" name="manufacturer" placeholder="Manufacturer" value={formData.manufacturer} onChange={handleChange} />
            <input type="number" name="quantity" placeholder="Quantity *" value={formData.quantity} onChange={handleChange} required />
            <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} required />
            <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {loading ? 'Adding...' : '➕ Add Medicine'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Inventory Display */}
      <h3>📋 Current Inventory ({displayedInventory.length} medicines)</h3>
      {displayedInventory.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
          <p>No medicines found.</p>
        </div>
      ) : viewMode === 'card' ? (
        <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {displayedInventory.map(item => {
            const risk = getRiskLevel(item.expiry_date);
            const riskStyle = getRiskStyle(risk);
            const daysLeft = getDaysLeft(item.expiry_date);
            return (
              <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '15px', backgroundColor: 'white' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>💊 {item.name}</h4>
                <div>📦 Stock: <strong>{item.quantity}</strong></div>
                <div>📅 Expiry: {item.expiry_date} ({daysLeft} days left)</div>
                <div>📊 Status: <span style={{ color: riskStyle.color }}>{riskStyle.text}</span></div>
                <button onClick={() => handleDelete(item.id, item.name)} style={{ marginTop: '10px', padding: '6px 12px', backgroundColor: '#9e9e9e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Delete</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                <th style={{ padding: '12px' }}>Medicine</th>
                <th style={{ padding: '12px' }}>Stock</th>
                <th style={{ padding: '12px' }}>Expiry</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedInventory.map((item, idx) => {
                const risk = getRiskLevel(item.expiry_date);
                const riskStyle = getRiskStyle(risk);
                const daysLeft = getDaysLeft(item.expiry_date);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '12px' }}>{item.name}</td>
                    <td style={{ padding: '12px' }}>{item.quantity}</td>
                    <td style={{ padding: '12px' }}>{item.expiry_date}<br /><small>{daysLeft} days left</small></td>
                    <td style={{ padding: '12px' }}><span style={{ backgroundColor: riskStyle.bg, color: riskStyle.color, padding: '4px 8px', borderRadius: '20px', fontSize: '12px' }}>{riskStyle.text}</span></td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleDelete(item.id, item.name)} style={{ padding: '5px 10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Inventory;
