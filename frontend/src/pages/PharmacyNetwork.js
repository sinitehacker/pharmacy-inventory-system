import { useState, useEffect } from 'react';
import { api } from '../services/api';

const PharmacyNetwork = () => {
  // Get pharmacy ID from localStorage (from login)
  const [pharmacyId, setPharmacyId] = useState(() => {
    const storedId = localStorage.getItem('pharmacy_id');
    return storedId ? parseInt(storedId) : 1;
  });
  
  const [matches, setMatches] = useState([]);
  const [surplus, setSurplus] = useState([]);
  const [reorders, setReorders] = useState([]);
  const [nearbyPharmacies, setNearbyPharmacies] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('matches');
  const [inventory, setInventory] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Get current pharmacy name from localStorage
  const pharmacyName = localStorage.getItem('pharmacy_name') || 'Rama Pharmacy';

  // Set location based on pharmacy (simplified - in real app, fetch from database)
  const getLocationForPharmacy = (id) => {
    const locations = {
      1: { lat: 17.3850, lon: 78.4867 },  // Rama Pharmacy
      2: { lat: 17.4150, lon: 78.4367 },  // Lakshmi Medicals
      3: { lat: 17.4250, lon: 78.4167 }   // Sai Pharmacy
    };
    return locations[id] || locations[1];
  };

  const [location, setLocation] = useState(getLocationForPharmacy(pharmacyId));

  // Update location when pharmacy changes
  useEffect(() => {
    setLocation(getLocationForPharmacy(pharmacyId));
  }, [pharmacyId]);

  // Load all data initially
  useEffect(() => {
    loadData();
  }, [pharmacyId]);

  // Auto-refresh notifications every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [pharmacyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const inventoryData = await api.getInventory();
      setInventory(inventoryData);

      const matchesRes = await fetch(
        `http://localhost:8000/api/matching/matches?pharmacy_id=${pharmacyId}&lat=${location.lat}&lon=${location.lon}&radius_km=20`
      );
      const matchesData = await matchesRes.json();
      setMatches(matchesData.matches || []);

      const surplusRes = await fetch(`http://localhost:8000/api/matching/surplus/${pharmacyId}`);
      const surplusData = await surplusRes.json();
      setSurplus(surplusData.surplus_items || []);

      const reorderRes = await fetch(`http://localhost:8000/api/matching/reorder/${pharmacyId}`);
      const reorderData = await reorderRes.json();
      setReorders(reorderData.recommendations || []);

      const nearbyRes = await fetch(`http://localhost:8000/api/pharmacy-network/pharmacies/nearby?lat=${location.lat}&lon=${location.lon}&radius_km=10`);
      const nearbyData = await nearbyRes.json();
      setNearbyPharmacies(nearbyData || []);

      await refreshNotifications();

      const ordersRes = await fetch(`http://localhost:8000/api/orders/${pharmacyId}`);
      const ordersData = await ordersRes.json();
      setOrders(ordersData || []);
      
    } catch (error) {
      console.error('Error loading network data:', error);
      setMessage({ text: 'Error loading network data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Refresh only notifications (used for real-time updates)
  const refreshNotifications = async () => {
    try {
      const notifRes = await fetch(`http://localhost:8000/api/notifications/${pharmacyId}`);
      const notifData = await notifRes.json();
      setNotifications(notifData || []);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  // Accept Transfer with real-time notification update
  const acceptTransfer = async (match) => {
    try {
      const notifResponse = await fetch('http://localhost:8000/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacy_id: match.to_pharmacy_id,
          message: `${match.from_pharmacy} has offered ${match.quantity_needed} units of ${match.medicine}. Contact them to coordinate.`,
          type: 'transfer'
        })
      });
      
      if (notifResponse.ok) {
        const result = await notifResponse.json();
        setMessage({ 
          text: `✅ Transfer request sent! Notification ID: ${result.id}. ${match.to_pharmacy} has been notified.`, 
          type: 'success' 
        });
        await refreshNotifications();
      } else {
        const errorText = await notifResponse.text();
        setMessage({ text: `Transfer request failed: ${errorText}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error sending transfer request:', error);
      setMessage({ text: 'Error sending transfer request', type: 'error' });
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Place supplier order with real-time notification update
  const placeReorder = async (rec) => {
    try {
      const response = await fetch('http://localhost:8000/api/orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacy_id: pharmacyId,
          medicine_name: rec.medicine_name,
          quantity: rec.suggested_order,
          order_type: 'supplier_order'
        })
      });
      
      const order = await response.json();
      
      if (response.ok) {
        setMessage({ 
          text: `✅ Order placed successfully! Order ID: #${order.id} | Status: ${order.status} | ETA: ${order.eta_days} days`, 
          type: 'success' 
        });
        const ordersRes = await fetch(`http://localhost:8000/api/orders/${pharmacyId}`);
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
        await refreshNotifications();
      } else {
        setMessage({ text: `Order failed: ${order.detail || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setMessage({ text: 'Error placing order', type: 'error' });
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Offer surplus to network with real-time updates
  const offerSurplus = async (item) => {
    try {
      const response = await fetch('http://localhost:8000/api/surplus/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacy_id: pharmacyId,
          medicine_name: item.medicine_name,
          quantity: item.surplus_quantity,
          expiry_date: item.expiry_date
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ 
          text: `✅ ${item.surplus_quantity} units of ${item.medicine_name} offered to network! Listing ID: #${result.id}. Nearby pharmacies can now request it.`, 
          type: 'success' 
        });
        const surplusRes = await fetch(`http://localhost:8000/api/matching/surplus/${pharmacyId}`);
        const surplusData = await surplusRes.json();
        setSurplus(surplusData.surplus_items || []);
        await refreshNotifications();
      } else {
        setMessage({ text: `Failed to offer surplus: ${result.detail || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error offering surplus:', error);
      setMessage({ text: 'Error offering surplus', type: 'error' });
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const markNotificationRead = async (notifId) => {
    try {
      await fetch(`http://localhost:8000/api/notifications/${notifId}/read`, {
        method: 'PUT'
      });
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading network data...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Pharmacy Info Header */}
      <div style={{
        backgroundColor: '#e3f2fd',
        borderRadius: '12px',
        padding: '12px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div>
          <strong>🏪 Current Pharmacy:</strong> {pharmacyName} (ID: {pharmacyId})
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          🔔 Notifications update automatically every 10 seconds
        </div>
      </div>

      {/* Header with Notification Bell */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0 }}>🌐 Pharmacy Network</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Connected pharmacies - Smart redistribution matching</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            style={{
              padding: '10px',
              backgroundColor: '#f0f0f0',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '10px'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          
          {/* Notification Panel */}
          {showNotificationPanel && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: '0',
              width: '320px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                Notifications ({notifications.length})
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>
                  No notifications
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} style={{
                    padding: '12px 15px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: notif.is_read ? 'white' : '#f0fdf4'
                  }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}>{notif.message}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#999' }}>
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                      {notif.is_read === 0 && (
                        <button
                          onClick={() => markNotificationRead(notif.id)}
                          style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('matches')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'matches' ? '#2c3e50' : '#e0e0e0', color: activeTab === 'matches' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>🤝 Smart Matches ({matches.length})</button>
        <button onClick={() => setActiveTab('surplus')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'surplus' ? '#2c3e50' : '#e0e0e0', color: activeTab === 'surplus' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>📤 Your Surplus ({surplus.length})</button>
        <button onClick={() => setActiveTab('reorder')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'reorder' ? '#2c3e50' : '#e0e0e0', color: activeTab === 'reorder' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>📦 Reorder Recommendations ({reorders.length})</button>
        <button onClick={() => setActiveTab('nearby')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'nearby' ? '#2c3e50' : '#e0e0e0', color: activeTab === 'nearby' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>🏪 Nearby Pharmacies ({nearbyPharmacies.length})</button>
        <button onClick={() => setActiveTab('orders')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'orders' ? '#2c3e50' : '#e0e0e0', color: activeTab === 'orders' ? 'white' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>📋 My Orders ({orders.length})</button>
      </div>

      {/* Smart Matches Tab */}
      {activeTab === 'matches' && (
        <div>
          {matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
              <p>No redistribution matches found nearby.</p>
              <p style={{ fontSize: '14px', color: '#666' }}>When other pharmacies post requests, matches will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {matches.map((match, idx) => (
                <div key={idx} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', borderLeft: `4px solid ${getUrgencyColor(match.urgency)}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0' }}>💊 {match.medicine}</h3>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>From: <strong>{match.from_pharmacy}</strong> → To: <strong>{match.to_pharmacy}</strong></p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>📦 Quantity: {match.quantity_needed} units</p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>📍 Distance: {match.distance_km?.toFixed(1)} km</p>
                      <p style={{ margin: '8px 0', fontSize: '13px', backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px' }}>💡 {match.reason}</p>
                    </div>
                    <button onClick={() => acceptTransfer(match)} style={{ padding: '10px 20px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>✅ Accept Transfer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Your Surplus Tab */}
      {activeTab === 'surplus' && (
        <div>
          {surplus.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
              <p>No surplus items found.</p>
              <p style={{ fontSize: '14px', color: '#666' }}>Surplus = Stock - Demand - Safety Stock. Only positive surplus is shown.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
              {surplus.slice(0, 10).map((item, idx) => (
                <div key={idx} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: `1px solid ${item.expiry_safe ? '#22c55e' : '#f59e0b'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>💊 {item.medicine_name}</h3>
                    <span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '12px', backgroundColor: item.expiry_safe ? '#dcfce7' : '#fed7aa', color: item.expiry_safe ? '#166534' : '#9a3412' }}>{item.expiry_safe ? '✓ Expiry Safe' : '⚠️ Expiring Soon'}</span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>📦 Current Stock: <strong>{item.current_stock} units</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>📤 Surplus: <strong style={{ color: '#22c55e' }}>{item.surplus_quantity} units</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>📅 Expires: {item.expiry_date} ({item.days_until_expiry} days left)</p>
                  <button onClick={() => offerSurplus(item)} style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>📢 Offer to Network</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reorder Recommendations Tab */}
      {activeTab === 'reorder' && (
        <div>
          {reorders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
              <p>No reorder recommendations.</p>
              <p style={{ fontSize: '14px', color: '#666' }}>All stock levels are above reorder points.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reorders.map((rec, idx) => (
                <div key={idx} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', borderLeft: `4px solid ${rec.urgency === 'High' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0' }}>💊 {rec.medicine_name}</h3>
                      <p style={{ margin: '4px 0' }}>📦 Current Stock: <strong style={{ color: '#dc2626' }}>{rec.current_stock} units</strong></p>
                      <p style={{ margin: '4px 0' }}>📊 Reorder Point: {rec.reorder_point} units</p>
                      <p style={{ margin: '4px 0' }}>🎯 Suggested Order: <strong style={{ color: '#22c55e' }}>{rec.suggested_order} units</strong></p>
                      <p style={{ margin: '8px 0', fontSize: '13px', color: '#475569' }}>📝 {rec.reason}</p>
                    </div>
                    <button onClick={() => placeReorder(rec)} style={{ padding: '10px 20px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📦 Order Now</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nearby Pharmacies Tab */}
      {activeTab === 'nearby' && (
        <div>
          {nearbyPharmacies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
              <p>No nearby pharmacies found within 10 km.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {nearbyPharmacies.map((pharmacy, idx) => (
                <div key={idx} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0' }}>🏪 {pharmacy.name}</h3>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>📍 {pharmacy.address}</p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>📞 {pharmacy.phone}</p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>🚗 Distance: <strong>{pharmacy.distance_km} km</strong></p>
                    </div>
                    <button onClick={() => alert(`Contact ${pharmacy.name} at ${pharmacy.phone}`)} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📞 Contact</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
              <p>No orders placed yet.</p>
              <p style={{ fontSize: '14px', color: '#666' }}>Go to Reorder Recommendations tab to place an order.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map((order, idx) => (
                <div key={idx} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0' }}>📋 Order #{order.id}</h3>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>💊 Medicine: <strong>{order.medicine_name}</strong></p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>📦 Quantity: {order.quantity} units</p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>📊 Status: <span style={{ color: order.status === 'pending' ? '#f59e0b' : '#22c55e', fontWeight: 'bold' }}>{order.status.toUpperCase()}</span></p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>🚚 ETA: {order.eta_days} days</p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>📅 Ordered: {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '8px 16px', backgroundColor: order.status === 'pending' ? '#fef3c7' : '#dcfce7', borderRadius: '8px' }}>
                      {order.status === 'pending' ? '⏳ Processing' : '✅ Delivered'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How it works explanation */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', borderLeft: '4px solid #22c55e' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>🧠 How Smart Matching Works</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>📊 <strong>Surplus Calculation</strong> = Stock - Predicted Demand - Safety Stock</li>
          <li>📍 <strong>Nearby Pharmacies</strong> detected using distance formula</li>
          <li>🤝 <strong>Matches</strong> created when your surplus meets another pharmacy's request</li>
          <li>✅ <strong>Expiry Safe</strong> = more than 60 days remaining</li>
          <li>📦 <strong>Reorder Recommendation</strong> when stock falls below reorder point (50 units)</li>
          <li>🔔 <strong>Real Orders & Notifications</strong> are stored in database with status tracking</li>
          <li>🔄 <strong>Notifications auto-refresh every 10 seconds</strong> for real-time updates</li>
          <li>🔐 <strong>Each pharmacy has its own login</strong> and sees only their own data</li>
        </ul>
      </div>
    </div>
  );
};

export default PharmacyNetwork;