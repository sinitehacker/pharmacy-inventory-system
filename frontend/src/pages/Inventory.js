import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Inventory = () => {
  // State for form data
  const [formData, setFormData] = useState({
    name: '',
    batchNumber: '',
    quantity: '',
    expiry_date: '',
    purchasePrice: '',
    supplier: ''
  });
  
  // State for inventory list
  const [inventory, setInventory] = useState([]);
  
  // State for loading status
  const [loading, setLoading] = useState(false);
  
  // State for messages
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // State for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, expiring, lowStock, highDemand
  const [viewMode, setViewMode] = useState('table'); // table, card

  // Load inventory when page loads
  useEffect(() => {
    loadInventory();
  }, []);

  // Function to load inventory from backend
  const loadInventory = async () => {
    setLoading(true);
    const data = await api.getInventory();
    setInventory(data);
    setLoading(false);
  };

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.quantity || !formData.expiry_date) {
      setMessage({ text: 'Please fill all fields', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }

    setLoading(true);
    
    try {
      await api.addMedicine(formData);
      setFormData({ name: '', batchNumber: '', quantity: '', expiry_date: '', purchasePrice: '', supplier: '' });
      setMessage({ text: 'Medicine added successfully!', type: 'success' });
      await loadInventory();
      
      // Animated counter effect - trigger refresh
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Error adding medicine', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Delete medicine
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      setLoading(true);
      try {
        await api.deleteMedicine(id);
        setMessage({ text: 'Medicine deleted successfully!', type: 'success' });
        await loadInventory();
      } catch (error) {
        setMessage({ text: 'Error deleting medicine', type: 'error' });
      } finally {
        setLoading(false);
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    }
  };

  // Function to determine risk level
  const getRiskLevel = (expiryDate) => {
    if (!expiryDate) return 'low';
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 30) return 'high';
    if (daysUntilExpiry <= 90) return 'medium';
    return 'low';
  };

  // Get risk style with simple language
  const getRiskStyle = (risk) => {
    switch(risk) {
      case 'high': 
        return { 
          bg: '#ffebee', 
          color: '#c62828', 
          text: '🔴 Expiring Soon - Sell or Redistribute',
          simpleText: '🔴 Expiring Soon'
        };
      case 'medium': 
        return { 
          bg: '#fff8e1', 
          color: '#f57c00', 
          text: '🟡 Use Soon (1-3 months left)',
          simpleText: '🟡 Use Soon'
        };
      default: 
        return { 
          bg: '#e8f5e9', 
          color: '#2e7d32', 
          text: '🟢 Good Stock',
          simpleText: '🟢 Good Stock'
        };
    }
  };

  // Get demand indicator
  const getDemandIndicator = (item) => {
    const highDemandMedicines = ['Paracetamol', 'Amoxicillin', 'Vitamin C', 'Azithromycin', 'Cetirizine', 'Ibuprofen'];
    const mediumDemandMedicines = ['Aspirin', 'Cough Syrup', 'ORS', 'Antacid'];
    
    if (highDemandMedicines.some(med => item.name.includes(med))) {
      return { icon: '🔥', text: 'High Demand', color: '#ff5722', bg: '#fff3e0', suggestion: 'Keep good stock' };
    }
    if (mediumDemandMedicines.some(med => item.name.includes(med))) {
      return { icon: '📈', text: 'Medium Demand', color: '#ff9800', bg: '#fff8e1', suggestion: 'Regular stock' };
    }
    return { icon: '📉', text: 'Slow Moving', color: '#78909c', bg: '#f5f5f5', suggestion: 'Order less quantity' };
  };

  // Get days left until expiry
  const getDaysLeft = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  // Filter and search logic
  const getFilteredInventory = () => {
    let filtered = inventory;
    
    // Apply search
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply category filter
    if (filter === 'expiring') {
      filtered = filtered.filter(item => getRiskLevel(item.expiry_date) === 'high');
    } else if (filter === 'lowStock') {
      filtered = filtered.filter(item => item.quantity < 50);
    } else if (filter === 'highDemand') {
      const highDemandMedicines = ['Paracetamol', 'Amoxicillin', 'Vitamin C'];
      filtered = filtered.filter(item => 
        highDemandMedicines.some(med => item.name.includes(med))
      );
    }
    
    return filtered;
  };

  const displayedInventory = getFilteredInventory();

  // Card View Component
  const MedicineCard = ({ item, index }) => {
    const risk = getRiskLevel(item.expiry_date);
    const riskStyle = getRiskStyle(risk);
    const demand = getDemandIndicator(item);
    const daysLeft = getDaysLeft(item.expiry_date);
    
    return (
      <div style={{
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '15px',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '16px' }}>💊 {item.name}</h4>
            <span style={{ fontSize: '11px', backgroundColor: demand.bg, color: demand.color, padding: '2px 8px', borderRadius: '12px', display: 'inline-block', marginTop: '5px' }}>
              {demand.icon} {demand.text}
            </span>
          </div>
          <span style={{ fontSize: '20px' }}>{risk === 'high' ? '🔴' : risk === 'medium' ? '🟡' : '🟢'}</span>
        </div>
        
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>📦 Stock:</span>
            <strong style={{ color: item.quantity < 50 ? '#f57c00' : '#333' }}>{item.quantity} {item.quantity < 50 && '(Running Out)'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>📅 Expiry:</span>
            <span>{item.expiry_date} <span style={{ fontSize: '11px', color: '#666' }}>(⏳ {daysLeft} days left)</span></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>📊 Status:</span>
            <span style={{ color: riskStyle.color }}>{riskStyle.simpleText}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '15px', flexWrap: 'wrap' }}>
          {item.quantity < 50 && (
            <button onClick={() => alert(`Order more ${item.name}`)} style={{ padding: '6px 12px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>
              📦 Order More
            </button>
          )}
          {risk === 'high' && (
            <button onClick={() => alert(`Alert nearby pharmacies about ${item.name}`)} style={{ padding: '6px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>
              📢 Send Alert
            </button>
          )}
          <button onClick={() => handleDelete(item.id, item.name)} style={{ padding: '6px 12px', backgroundColor: '#9e9e9e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>
            🗑️ Remove
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>📦 Inventory Management</h1>
      
      {/* Step-by-Step Guidance */}
      <div style={{
        backgroundColor: '#e8f5e9',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '20px',
        borderLeft: '4px solid #4caf50'
      }}>
        <strong>📖 Quick Guide</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
          <span>1️⃣ Add medicines</span>
          <span>2️⃣ Check alerts</span>
          <span>3️⃣ Order when low</span>
          <span>4️⃣ Share surplus</span>
        </div>
      </div>
      
      {/* Advisory Banner - Pharmacy Assistant Tip */}
      <div style={{
        backgroundColor: '#e3f2fd',
        borderLeft: '4px solid #2196f3',
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '5px'
      }}>
        <strong>👩‍⚕️ Pharmacy Assistant Tip:</strong>
        <ul style={{ margin: '10px 0 0 20px', padding: 0 }}>
          <li>🔴 <strong>Red medicines</strong> - Sell quickly or share with other pharmacies</li>
          <li>🟡 <strong>Yellow medicines</strong> - Use within 1-3 months</li>
          <li>🟢 <strong>Green medicines</strong> - Good stock, no action needed</li>
          <li>📦 <strong>"Running Out"</strong> - Order more soon</li>
          <li>🔥 <strong>High Demand</strong> - Keep good stock always</li>
        </ul>
      </div>
      
      {/* Message Display */}
      {message.text && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '5px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}
      
      {/* Search and Filter Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input
              type="text"
              placeholder="Search medicine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>
          
          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setViewMode('table')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'table' ? '#2c3e50' : '#e0e0e0', color: viewMode === 'table' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📋 Table View</button>
            <button onClick={() => setViewMode('card')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'card' ? '#2c3e50' : '#e0e0e0', color: viewMode === 'card' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🃏 Card View</button>
          </div>
        </div>
        
        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={{ padding: '8px 16px', backgroundColor: filter === 'all' ? '#2c3e50' : '#e0e0e0', color: filter === 'all' ? 'white' : '#333', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>All Medicines</button>
          <button onClick={() => setFilter('expiring')} style={{ padding: '8px 16px', backgroundColor: filter === 'expiring' ? '#f44336' : '#e0e0e0', color: filter === 'expiring' ? 'white' : '#333', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>🔴 Expiring Soon</button>
          <button onClick={() => setFilter('lowStock')} style={{ padding: '8px 16px', backgroundColor: filter === 'lowStock' ? '#ff9800' : '#e0e0e0', color: filter === 'lowStock' ? 'white' : '#333', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>🟠 Running Out</button>
          <button onClick={() => setFilter('highDemand')} style={{ padding: '8px 16px', backgroundColor: filter === 'highDemand' ? '#4caf50' : '#e0e0e0', color: filter === 'highDemand' ? 'white' : '#333', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>🔥 High Demand</button>
        </div>
      </div>
      
      {/* Add Medicine Form */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f9f9f9',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0 }}>➕ Add New Medicine</h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ 
            display: 'grid', 
            gap: '15px', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            <input type="text" name="name" placeholder="💊 Medicine Name" value={formData.name} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} required />
            <input type="text" name="batchNumber" placeholder="🔢 Batch Number" value={formData.batchNumber} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} />
            <input type="number" name="quantity" placeholder="📦 Quantity" value={formData.quantity} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} required />
            <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} required />
            <input type="number" name="purchasePrice" placeholder="💰 Purchase Price" value={formData.purchasePrice} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} />
            <input type="text" name="supplier" placeholder="🏭 Supplier" value={formData.supplier} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} />
            <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {loading ? 'Adding...' : '➕ Add Medicine'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Inventory Display */}
      <div>
        <h3>📋 Current Inventory ({displayedInventory.length} medicines)</h3>
        
        {loading && inventory.length === 0 ? (
          <p>Loading inventory...</p>
        ) : displayedInventory.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
            <p>No medicines found. Try changing search or filter.</p>
          </div>
        ) : viewMode === 'card' ? (
          <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {displayedInventory.map((item, index) => (
              <MedicineCard key={item.id} item={item} index={index} />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: '10px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>💊 Medicine</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>📦 Stock</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>📅 Expiry</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>📊 Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>⚡ Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedInventory.map((item, index) => {
                  const risk = getRiskLevel(item.expiry_date);
                  const riskStyle = getRiskStyle(risk);
                  const demand = getDemandIndicator(item);
                  const daysLeft = getDaysLeft(item.expiry_date);
                  
                  return (
                    <tr key={item.id} style={{ 
                      borderBottom: '1px solid #eee',
                      backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                    }}>
                      {/* Medicine Name with Demand Indicator */}
                      <td style={{ padding: '12px', fontWeight: '500' }}>
                        {item.name}
                        <div style={{ marginTop: '5px' }}>
                          <span style={{ fontSize: '11px', backgroundColor: demand.bg, color: demand.color, padding: '2px 8px', borderRadius: '12px', display: 'inline-block' }}>
                            {demand.icon} {demand.text}
                          </span>
                        </div>
                      </td>
                      
                      {/* Stock Column */}
                      <td style={{ 
                        padding: '12px',
                        color: item.quantity < 50 ? '#f57c00' : '#333',
                        fontWeight: item.quantity < 50 ? 'bold' : 'normal'
                      }}>
                        {item.quantity}
                        {item.quantity < 50 && item.quantity >= 20 && ' 🔸 Running Out'}
                        {item.quantity < 20 && ' 🔴 Urgent!'}
                        {item.quantity >= 50 && ' ✅ In Stock'}
                      </td>
                      
                      {/* Expiry with Countdown */}
                      <td style={{ padding: '12px' }}>
                        {item.expiry_date}
                        <div style={{ fontSize: '11px', color: '#666' }}>⏳ {daysLeft} days left</div>
                      </td>
                      
                      {/* Risk Status */}
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          backgroundColor: riskStyle.bg,
                          color: riskStyle.color,
                          padding: '5px 10px',
                          borderRadius: '5px',
                          fontSize: '13px',
                          display: 'inline-block'
                        }}>
                          {riskStyle.simpleText}
                        </span>
                      </td>
                      
                      {/* Action Buttons */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {item.quantity < 50 && (
                            <button onClick={() => alert(`Order more ${item.name}\nSuggested: ${50 - item.quantity + 50} units`)} style={{ padding: '5px 10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
                              📦 Order More
                            </button>
                          )}
                          {risk === 'high' && (
                            <button onClick={() => alert(`Alert nearby pharmacies about ${item.name}\nExpiry: ${item.expiry_date}`)} style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
                              📢 Send Alert
                            </button>
                          )}
                          <button onClick={() => handleDelete(item.id, item.name)} style={{ padding: '5px 10px', backgroundColor: '#9e9e9e', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
                            🗑️ Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Mobile Responsive Note */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
        💡 Tip: Switch to Card View for better mobile experience
      </div>
    </div>
  );
};

export default Inventory;