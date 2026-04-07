import { useState, useEffect } from 'react';
import { api } from '../services/api';

const PharmacyNetwork = () => {
  const [nearbyPharmacies, setNearbyPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [inventory, setInventory] = useState([]);

  // Mock data for nearby pharmacies and their medicine needs
  const mockPharmacies = [
    {
      id: 1,
      name: "Rama Pharmacy",
      location: "Main Street, 2km away",
      distance: "2 km",
      phone: "98765 43210",
      needs: [
        { medicine: "Paracetamol 500mg", quantity: 100, urgency: "high" },
        { medicine: "Amoxicillin 250mg", quantity: 50, urgency: "medium" }
      ]
    },
    {
      id: 2,
      name: "Lakshmi Medicals",
      location: "Gandhi Nagar, 3.5km away",
      distance: "3.5 km",
      phone: "98765 43211",
      needs: [
        { medicine: "Aspirin 75mg", quantity: 30, urgency: "high" },
        { medicine: "Vitamin C", quantity: 80, urgency: "low" }
      ]
    },
    {
      id: 3,
      name: "Sai Pharmacy",
      location: "Railway Road, 1.5km away",
      distance: "1.5 km",
      phone: "98765 43212",
      needs: [
        { medicine: "Cetirizine 10mg", quantity: 60, urgency: "medium" },
        { medicine: "Cough Syrup", quantity: 40, urgency: "high" }
      ]
    },
    {
      id: 4,
      name: "Venkateshwara Medical",
      location: "Bus Stand Area, 4km away",
      distance: "4 km",
      phone: "98765 43213",
      needs: [
        { medicine: "Ibuprofen 200mg", quantity: 90, urgency: "medium" },
        { medicine: "ORS Powder", quantity: 200, urgency: "low" }
      ]
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Load your inventory to check what medicines you have
    const inventoryData = await api.getInventory();
    setInventory(inventoryData);
    setNearbyPharmacies(mockPharmacies);
    setLoading(false);
  };

  // Check if you have a medicine in your inventory
  const checkAvailability = (medicineName) => {
    const found = inventory.find(item => 
      item.name.toLowerCase().includes(medicineName.toLowerCase())
    );
    if (found && found.quantity > 0) {
      return { available: true, stock: found.quantity };
    }
    return { available: false, stock: 0 };
  };

  // Handle offering stock
  const handleOfferStock = (pharmacy, medicine, requiredQty) => {
    const availability = checkAvailability(medicine);
    
    if (!availability.available) {
      setMessage({ 
        text: `You don't have ${medicine} in your inventory. Add it first.`, 
        type: 'error' 
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }
    
    if (availability.stock < requiredQty) {
      setMessage({ 
        text: `You only have ${availability.stock} units of ${medicine}. Cannot offer ${requiredQty}.`, 
        type: 'error' 
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }
    
    // Show confirmation
    if (window.confirm(`Offer ${requiredQty} units of ${medicine} to ${pharmacy.name}?`)) {
      setMessage({ 
        text: `✅ Offer sent to ${pharmacy.name} for ${medicine}! They will contact you.`, 
        type: 'success' 
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      default: return '#4caf50';
    }
  };

  const getUrgencyText = (urgency) => {
    switch(urgency) {
      case 'high': return '🔴 Urgent';
      case 'medium': return '🟡 Moderate';
      default: return '🟢 Normal';
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading nearby pharmacies...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🏪 Nearby Pharmacy Network</h1>
      <p>Connect with nearby pharmacies to share surplus stock or request medicines</p>
      
      {/* Info Banner */}
      <div style={{
        backgroundColor: '#e8f5e9',
        borderLeft: '4px solid #4caf50',
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '8px'
      }}>
        <strong>💡 How Redistribution Works:</strong>
        <ul style={{ margin: '10px 0 0 20px' }}>
          <li>Nearby pharmacies post medicine needs</li>
          <li>If you have surplus stock, click "Offer Stock"</li>
          <li>The pharmacy will contact you for coordination</li>
          <li>This reduces medicine waste and helps the community</li>
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
      
      {/* Pharmacies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {nearbyPharmacies.map(pharmacy => (
          <div
            key={pharmacy.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0'
            }}
          >
            {/* Pharmacy Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'start',
              flexWrap: 'wrap',
              marginBottom: '15px',
              borderBottom: '1px solid #eee',
              paddingBottom: '10px'
            }}>
              <div>
                <h3 style={{ margin: 0 }}>🏪 {pharmacy.name}</h3>
                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                  📍 {pharmacy.location} • 📞 {pharmacy.phone}
                </div>
              </div>
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '14px'
              }}>
                🚗 {pharmacy.distance}
              </div>
            </div>
            
            {/* Medicine Needs Table */}
            <div>
              <strong>📋 Medicines Needed:</strong>
              <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>💊 Medicine</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>📦 Quantity Needed</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>⚡ Urgency</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Your Stock</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacy.needs.map((need, idx) => {
                      const availability = checkAvailability(need.medicine);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>{need.medicine}</td>
                          <td style={{ padding: '10px' }}>{need.quantity} units</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              backgroundColor: getUrgencyColor(need.urgency) + '20',
                              color: getUrgencyColor(need.urgency),
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {getUrgencyText(need.urgency)}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            {availability.available ? (
                              <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                                ✅ {availability.stock} units
                              </span>
                            ) : (
                              <span style={{ color: '#f44336' }}>❌ Not in stock</span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <button
                              onClick={() => handleOfferStock(pharmacy, need.medicine, need.quantity)}
                              disabled={!availability.available || availability.stock < need.quantity}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: (availability.available && availability.stock >= need.quantity) ? '#2196f3' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: (availability.available && availability.stock >= need.quantity) ? 'pointer' : 'not-allowed',
                                fontSize: '12px'
                              }}
                            >
                              📦 Offer Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Your Surplus Section */}
      <div style={{
        marginTop: '30px',
        backgroundColor: '#fff3e0',
        borderRadius: '12px',
        padding: '20px',
        borderLeft: '4px solid #ff9800'
      }}>
        <h3>📤 Your Surplus Stock (Offer to Network)</h3>
        <p>Medicines you have in good quantity that you can share:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          {inventory.filter(item => item.quantity > 100).map(item => (
            <div key={item.id} style={{
              backgroundColor: 'white',
              padding: '10px 15px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              💊 {item.name} - {item.quantity} units
              <button
                onClick={() => {
                  alert(`Post ${item.name} to network? Nearby pharmacies will be notified.`);
                }}
                style={{
                  marginLeft: '10px',
                  padding: '3px 8px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Share
              </button>
            </div>
          ))}
          {inventory.filter(item => item.quantity > 100).length === 0 && (
            <p style={{ color: '#666' }}>No surplus stock available. Add more medicines to help others.</p>
          )}
        </div>
      </div>
      
      {/* Request Medicine Section */}
      <div style={{
        marginTop: '20px',
        backgroundColor: '#e3f2fd',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h3>📢 Need a Medicine?</h3>
        <p>Post your requirement and nearby pharmacies will see it.</p>
        <button
          onClick={() => alert('Request feature coming soon! Your request will be visible to nearby pharmacies.')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ➕ Post Medicine Request
        </button>
      </div>
    </div>
  );
};

export default PharmacyNetwork;