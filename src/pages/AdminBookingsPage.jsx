import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdminBookingsPage.css';

const AdminBookingsPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalTickets: 0
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (!adminLoggedIn) {
      navigate('/admin');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load events
      const eventsRes = await fetch(`${API_URL}/api/events`);
      const eventsData = await eventsRes.json();
      setEvents(eventsData);

      // Load all bookings
      const allBookings = [];
      for (const event of eventsData) {
        const bookingsRes = await fetch(`${API_URL}/api/bookings/event/${event.id}`);
        const eventBookings = await bookingsRes.json();
        allBookings.push(...eventBookings.map(b => ({
          ...b,
          eventName: event.name,
          eventId: event.id,
          eventDate: event.date
        })));
      }

      setBookings(allBookings);
      
      // Calculate stats
      const totalBookings = allBookings.length;
      const totalRevenue = allBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const totalTickets = allBookings.reduce((sum, b) => sum + (b.seat_count || 1), 0);
      
      setStats({ totalBookings, totalRevenue, totalTickets });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = selectedEvent === 'all' 
    ? bookings 
    : bookings.filter(b => b.eventId === parseInt(selectedEvent));

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewBooking = async (booking) => {
    try {
      // Fetch full booking details with seats
      const response = await fetch(`${API_URL}/api/bookings/${booking.booking_reference}`);
      const data = await response.json();
      setSelectedBooking(data);
    } catch (error) {
      alert('Failed to load booking details');
    }
  };

  const handleCancelBooking = async (bookingId, bookingRef) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH'
      });

      if (response.ok) {
        alert(`Booking ${bookingRef} cancelled successfully`);
        loadData(); // Reload data
        setSelectedBooking(null);
      } else {
        alert('Failed to cancel booking');
      }
    } catch (error) {
      alert('Error cancelling booking');
    }
  };

  if (loading) return <LoadingSpinner message="Loading bookings..." />;

  return (
    <div className="container">
      <div className="admin-bookings-container">
        <div className="bookings-header">
          <h1>Booking Management</h1>
          <button onClick={() => navigate('/admin')} className="back-to-admin-btn">
            ← Back to Admin
          </button>
        </div>

        {/* Stats Dashboard */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <span className="stat-label">Total Bookings</span>
              <span className="stat-value">{stats.totalBookings}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <span className="stat-label">Total Revenue</span>
              <span className="stat-value">${stats.totalRevenue.toFixed(2)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎫</div>
            <div className="stat-content">
              <span className="stat-label">Tickets Sold</span>
              <span className="stat-value">{stats.totalTickets}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="event-filter">Filter by Event:</label>
            <select
              id="event-filter"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bookings-table-container">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Event</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Seats</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-data">No bookings found</td>
                </tr>
              ) : (
                filteredBookings.map(booking => (
                  <tr key={booking.id} className={booking.status === 'cancelled' ? 'cancelled-row' : ''}>
                    <td className="booking-ref">{booking.booking_reference}</td>
                    <td>{booking.eventName}</td>
                    <td>
                      <div>{booking.customer_name}</div>
                      <small>{booking.customer_email}</small>
                    </td>
                    <td>{formatDate(booking.created_at)}</td>
                    <td className="text-center">{booking.seat_count || 1}</td>
                    <td className="text-right">${(booking.total_amount || 0).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${booking.status || 'confirmed'}`}>
                        {booking.status || 'confirmed'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleViewBooking(booking)}
                        className="view-btn"
                      >
                        View
                      </button>
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id, booking.booking_reference)}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="close-modal-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Booking Information</h3>
                <p><strong>Reference:</strong> {selectedBooking.booking_reference}</p>
                <p><strong>Status:</strong> {selectedBooking.status}</p>
                <p><strong>Date:</strong> {formatDate(selectedBooking.created_at)}</p>
                <p><strong>Total:</strong> ${(selectedBooking.total_amount || 0).toFixed(2)}</p>
              </div>
              <div className="detail-section">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> {selectedBooking.customer_name}</p>
                <p><strong>Email:</strong> {selectedBooking.customer_email}</p>
                <p><strong>Phone:</strong> {selectedBooking.customer_phone || 'N/A'}</p>
              </div>
              <div className="detail-section">
                <h3>Seats</h3>
                <div className="seats-grid">
                  {selectedBooking.seats?.map(seat => (
                    <div key={seat.id} className="seat-card">
                      <strong>{seat.section}</strong> - Row {seat.row_number}, Seat {seat.seat_number}
                      <span className="seat-price">${seat.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedBooking.status !== 'cancelled' && (
                <button
                  onClick={() => handleCancelBooking(selectedBooking.id, selectedBooking.booking_reference)}
                  className="cancel-booking-btn"
                >
                  Cancel Booking
                </button>
              )}
              <button onClick={() => setSelectedBooking(null)} className="close-modal-footer-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingsPage;