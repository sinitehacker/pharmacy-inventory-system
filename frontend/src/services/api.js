// API Service with Mock Data

// Helper function to get future dates
function getFutureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Mock data with dynamic dates (always in future)
let mockInventory = [
  {
    id: 1,
    name: "Paracetamol 500mg",
    quantity: 150,
    expiry_date: getFutureDate(75)
  },
  {
    id: 2,
    name: "Amoxicillin 250mg",
    quantity: 45,
    expiry_date: getFutureDate(40)
  },
  {
    id: 3,
    name: "Cetirizine 10mg",
    quantity: 200,
    expiry_date: getFutureDate(140)
  },
  {
    id: 4,
    name: "Aspirin 75mg",
    quantity: 12,
    expiry_date: getFutureDate(15)
  },
  {
    id: 5,
    name: "Vitamin C 500mg",
    quantity: 80,
    expiry_date: getFutureDate(120)
  },
  {
    id: 6,
    name: "Ranitidine",
    quantity: 17,
    expiry_date: getFutureDate(60)
  }
];

let nextId = 7;

// API Functions
export const api = {
  async getInventory() {
    await delay(500);
    return [...mockInventory];
  },

  async addMedicine(medicine) {
    await delay(500);
    const newMedicine = {
      id: nextId++,
      name: medicine.name,
      quantity: parseInt(medicine.quantity),
      expiry_date: medicine.expiry_date
    };
    mockInventory.push(newMedicine);
    return newMedicine;
  },

  async updateMedicine(id, updates) {
    await delay(500);
    const index = mockInventory.findIndex(item => item.id === id);
    if (index !== -1) {
      mockInventory[index] = { ...mockInventory[index], ...updates };
      return mockInventory[index];
    }
    throw new Error('Medicine not found');
  },

  async recordSale(sale) {
    await delay(500);
    const medicine = mockInventory.find(item => item.id === sale.medicineId);
    if (medicine) {
      medicine.quantity -= sale.quantity;
      return { success: true, newQuantity: medicine.quantity };
    }
    throw new Error('Medicine not found');
  },

  async getForecast() {
    await delay(500);
    return {
      message: "Based on sales patterns, consider ordering more Paracetamol and Amoxicillin next month.",
      recommendations: [
        { medicine: "Paracetamol 500mg", recommendedOrder: 100 },
        { medicine: "Amoxicillin 250mg", recommendedOrder: 50 }
      ]
    };
  },

  async deleteMedicine(id) {
    await delay(500);
    const index = mockInventory.findIndex(item => item.id === id);
    if (index !== -1) {
      mockInventory.splice(index, 1);
      return { success: true, message: "Medicine deleted successfully" };
    }
    throw new Error('Medicine not found');
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}