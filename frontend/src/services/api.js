// API Service - Connected to Real Backend

const API_BASE_URL = 'http://localhost:8000/api';

// Helper function to get pharmacy_id from localStorage
const getPharmacyId = () => {
  return localStorage.getItem('pharmacy_id') || 1;
};

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

// Inventory APIs with pharmacy_id
export const inventoryAPI = {
  getAllMedicines: () => {
    const pharmacyId = getPharmacyId();
    return apiCall(`/inventory/medicines?pharmacy_id=${pharmacyId}`);
  },
  addMedicine: (medicineData) => {
    const pharmacyId = getPharmacyId();
    return apiCall(`/inventory/medicines?pharmacy_id=${pharmacyId}`, {
      method: 'POST',
      body: JSON.stringify({
        name: medicineData.name,
        generic_name: medicineData.generic_name || '',
        category: medicineData.category || '',
        manufacturer: medicineData.manufacturer || ''
      })
    });
  },
  addBatch: (batchData) => {
    const pharmacyId = getPharmacyId();
    return apiCall(`/inventory/batches?pharmacy_id=${pharmacyId}`, {
      method: 'POST',
      body: JSON.stringify(batchData)
    });
  },
  recordSale: (saleData) => {
    const pharmacyId = getPharmacyId();
    return apiCall(`/inventory/sales?pharmacy_id=${pharmacyId}`, {
      method: 'POST',
      body: JSON.stringify(saleData)
    });
  },
  deleteMedicine: (id) => {
    const pharmacyId = getPharmacyId();
    return apiCall(`/inventory/medicines/${id}?pharmacy_id=${pharmacyId}`, {
      method: 'DELETE'
    });
  }
};

// Analytics APIs (these don't need pharmacy_id as they use risk report)
export const analyticsAPI = {
  getDashboard: () => apiCall('/analytics/dashboard'),
  getStats: () => apiCall('/analytics/dashboard/stats'),
  getAdvisories: () => apiCall('/analytics/advisories'),
  getHighRisk: () => apiCall('/analytics/high-risk'),
  getExpiryAlerts: (days = 30) => apiCall(`/analytics/expiry-alerts?days=${days}`),
  getRiskReport: () => apiCall('/analytics/risk-report'),
  getForecast: (medicineName) => apiCall(`/analytics/forecast/${medicineName}`)
};

// Main API object for components
export const api = {
  async getInventory() {
    try {
      const medicines = await inventoryAPI.getAllMedicines();
      console.log(`Fetched ${medicines.length} medicines for pharmacy ${getPharmacyId()}`);
      return medicines.map(med => ({
        id: med.id,
        name: med.name,
        quantity: med.batches?.reduce((sum, b) => sum + (b.quantity || 0), 0) || 0,
        expiry_date: med.batches?.[0]?.expiry_date || '2025-12-31',
        generic_name: med.generic_name,
        category: med.category,
        manufacturer: med.manufacturer,
        batches: med.batches || []
      }));
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      return [];
    }
  },

  async addMedicine(medicine) {
    try {
      const newMedicine = await inventoryAPI.addMedicine(medicine);
      if (medicine.quantity && medicine.expiry_date) {
        await inventoryAPI.addBatch({
          medicine_id: newMedicine.id,
          batch_number: medicine.batch_number || `BATCH_${Date.now()}`,
          expiry_date: medicine.expiry_date,
          quantity: parseInt(medicine.quantity),
          purchase_price: medicine.purchase_price || 0,
          selling_price: medicine.selling_price || 0
        });
      }
      return {
        id: newMedicine.id,
        name: newMedicine.name,
        quantity: parseInt(medicine.quantity) || 0,
        expiry_date: medicine.expiry_date || '2025-12-31'
      };
    } catch (error) {
      console.error('Failed to add medicine:', error);
      throw error;
    }
  },

  async recordSale(sale) {
    try {
      const result = await inventoryAPI.recordSale({
        medicine_id: sale.medicineId,
        batch_id: sale.batchId || null,
        quantity: sale.quantity,
        sale_date: new Date().toISOString().split('T')[0],
        price_per_unit: sale.price || 0,
        total_amount: (sale.price || 0) * sale.quantity
      });
      return { success: true, newQuantity: sale.quantity, result };
    } catch (error) {
      console.error('Failed to record sale:', error);
      throw error;
    }
  },

  async getForecast() {
    try {
      const dashboard = await analyticsAPI.getDashboard();
      const highRisk = await analyticsAPI.getHighRisk();
      
      let message = "Based on analytics, ";
      const recommendations = [];
      
      if (dashboard.critical_alerts > 0) {
        message += `there are ${dashboard.critical_alerts} critical expiry alerts. `;
      }
      
      if (highRisk && highRisk.length > 0) {
        message += `${highRisk.length} medicines require immediate attention. `;
        recommendations.push(...highRisk.slice(0, 3).map(risk => ({
          medicine: risk.medicine_name,
          recommendedOrder: 0,
          action: "Immediate action needed - expiring soon"
        })));
      }
      
      if (dashboard.reorder_needed > 0) {
        message += `${dashboard.reorder_needed} medicines need reordering.`;
      }
      
      if (recommendations.length === 0 && dashboard.critical_alerts === 0) {
        message = "All medicines are within acceptable inventory levels. Continue monitoring expiry dates.";
      }
      
      return { message, recommendations };
    } catch (error) {
      console.error('Failed to get forecast:', error);
      return {
        message: "Unable to fetch forecast. Please check backend connection.",
        recommendations: []
      };
    }
  },

  async deleteMedicine(id) {
    try {
      await inventoryAPI.deleteMedicine(id);
      return { success: true, message: "Medicine deleted successfully" };
    } catch (error) {
      console.error('Delete failed:', error);
      return { success: false, message: "Delete failed" };
    }
  }
};

export default api;