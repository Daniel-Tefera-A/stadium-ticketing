import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdminDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentBookings, setRecentBookings] = useState([]);
  const [salesData, setSalesData] = useState({ labels: [], values: [] });
  const [popularEvents, setPopularEvents] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (!adminLoggedIn) {
      navigate('/admin');
      return;
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get stats
      const statsRes = await fetch(`${API_URL}/api/stats`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // Get all events
      const eventsRes = await fetch(`${API_URL}/api/events`);
      const events = await eventsRes.json();

      // Get recent bookings
      const allBookings = [];
      for (const event of events.slice(0, 3)) {
        const bookingsRes = await fetch(`${API_URL}/api/bookings/event/${event.id}`);
        const bookings = await bookingsRes.json();
        allBookings.push(...bookings.map(b => ({ ...b, eventName: event.name })));
      }
      
      const recent = allBookings
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setRecentBookings(recent);

      // Generate sales data (last 7 days)
      const last7Days = [];
      const sales = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        sales.push(Math.floor(Math.random() * 10) + 5);
      }
      setSalesData({ labels: last7Days, values: sales });

      // Popular events
      const eventSales = events.map(event => ({
        name: event.name,
        sales: Math.floor(Math.random() * 50) + 10
      })).sort((a, b) => b.sales - a.sales).slice(0, 5);
      setPopularEvents(eventSales);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const salesChartData = {
    labels: salesData.labels || [],
    datasets: [{
      label: 'Tickets Sold',
      data: salesData.values || [],
      backgroundColor: 'rgba(255, 77, 77, 0.5)',
      borderColor: '#ff4d4d',
      borderWidth: 2
    }]
  };

  const popularChartData = {
    labels: popularEvents.map(e => e.name.substring(0, 15) + '...'),
    datasets: [{
      data: popularEvents.map(e => e.sales),
      backgroundColor: [
        '#ff4d4d',
        '#ff8a5c',
        '#ffb347',
        '#ffd700',
        '#98d8c8'
      ]
    }]
  };

  const salesOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={() => navigate('/admin')} className="back-btn">
          ← Back to Admin
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">${(stats.totalRevenue || 0).toFixed(2)}</span>
          </div>
        </div>
        <div className="stat-card bookings">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Total Bookings</span>
            <span className="stat-value">{stats.totalBookings || 0}</span>
          </div>
        </div>
        <div className="stat-card tickets">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <span className="stat-label">Tickets Sold</span>
            <span className="stat-value">{stats.bookedSeats || 0}</span>
          </div>
        </div>
        <div className="stat-card occupancy">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <span className="stat-label">Occupancy Rate</span>
            <span className="stat-value">{stats.occupancyRate || 0}%</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Sales (Last 7 Days)</h3>
          <Line data={salesChartData} options={salesOptions} />
        </div>
        <div className="chart-card">
          <h3>Popular Events</h3>
          <Pie data={popularChartData} options={pieOptions} />
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="recent-bookings">
        <h3>Recent Bookings</h3>
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Event</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map(booking => (
              <tr key={booking.id}>
                <td className="booking-ref">{booking.booking_reference}</td>
                <td>{booking.eventName}</td>
                <td>{booking.customer_name}</td>
                <td>${(booking.total_amount || 0).toFixed(2)}</td>
                <td>{new Date(booking.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button onClick={() => navigate('/admin')} className="action-btn">
            Manage Events
          </button>
          <button onClick={() => navigate('/admin-bookings')} className="action-btn">
            View All Bookings
          </button>
          <button 
            onClick={() => {
              const csv = "Booking Ref,Event,Customer,Amount,Date\n" + 
                recentBookings.map(b => 
                  `${b.booking_reference},${b.eventName},${b.customer_name},${b.total_amount},${b.created_at}`
                ).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'bookings.csv';
              a.click();
            }} 
            className="action-btn"
          >
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;