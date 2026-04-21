import React from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// Bar Chart Component
export const BarChart = ({ title, labels, data, colors, label }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: label || 'Stock Quantity',
        data: data,
        backgroundColor: colors || 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw.toLocaleString()} units`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        title: { display: true, text: 'Stock Quantity (units)', font: { size: 12 } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      }
    },
  };

  return (
    <div style={{ height: '320px', width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

// Pie Chart Component
export const PieChart = ({ title, labels, data, colors }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor: colors || ['#22c55e', '#eab308', '#f97316', '#ef4444', '#3b82f6'],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 10 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: ${context.raw} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

// Line Chart Component
export const LineChart = ({ title, labels, data, label, color }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: label || 'Demand (units)',
        data: data,
        borderColor: color || '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: color || '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 12 } }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Demand: ${context.raw} units`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        title: { display: true, text: 'Demand (units per month)', font: { size: 12 } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      }
    },
  };

  return (
    <div style={{ height: '320px', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};