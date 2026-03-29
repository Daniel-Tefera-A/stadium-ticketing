import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './MyBookingsPage.css';

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const searchBookings = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Get all events first
      const eventsRes = await fetch(`${API_URL}/api/events`);
      const events = await eventsRes.json();

      // Get bookings for each event and filter by email
      const allBookings = [];
      for (const event of events) {
        const res = await fetch(`${API_URL}/api/bookings/event/${event.id}`);
        const eventBookings = await res.json();
        
        const userBookings = eventBookings.filter(b => 
          b.customer_email?.toLowerCase() === email.toLowerCase()
        ).map(b => ({
          ...b,
          eventName: event.name,
          eventDate: event.date,
          eventVenue: event.venue || 'Main Stadium'
        }));
        
        allBookings.push(...userBookings);
      }

      // Sort by date (newest first)
      allBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setBookings(allBookings);
      setSearched(true);
      
      if (allBookings.length === 0) {
        alert('No bookings found for this email address');
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      alert('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const viewBookingDetails = async (booking) => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${booking.booking_reference}`);
      const data = await response.json();
      setSelectedBooking(data);
    } catch (error) {
      alert('Failed to load booking details');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <div className="my-bookings-container">
        <h1>My Bookings</h1>

        <div className="email-search">
          <p>Enter the email address you used for booking:</p>
          <div className="search-box">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              onKeyPress={(e) => e.key === 'Enter' && searchBookings()}
              disabled={loading}
            />
            <button onClick={searchBookings} disabled={loading}>
              {loading ? <LoadingSpinner message="Searching..." /> : 'Find My Bookings'}
            </button>
          </div>
        </div>

        {searched && !loading && (
          <div className="bookings-results">
            {bookings.length === 0 ? (
              <div className="no-bookings">
                <p>No bookings found for {email}</p>
                <button onClick={() => navigate('/')} className="browse-events-btn">
                  Browse Events
                </button>
              </div>
            ) : (
              <>
                <h2>Found {bookings.length} booking(s)</h2>
                <div className="bookings-list">
                  {bookings.map(booking => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-card-header">
                        <span className={`status-badge ${booking.status || 'confirmed'}`}>
                          {booking.status || 'confirmed'}
                        </span>
                        <span className="booking-ref">{booking.booking_reference}</span>
                      </div>
                      
                      <div className="booking-card-body">
                        <h3>{booking.eventName}</h3>
                        <p>📅 {formatDate(booking.eventDate)}</p>
                        <p>📍 {booking.eventVenue}</p>
                        <p>🎫 {booking.seat_count || 1} ticket(s)</p>
                        <p>💰 ${(booking.total_amount || 0).toFixed(2)}</p>
                      </div>
                      
                      <div className="booking-card-footer">
                        <button
                          onClick={() => viewBookingDetails(booking)}
                          className="view-details-btn"
                        >
                          View Details
                        </button>
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => navigate(`/event/${booking.event_id}`)}
                            className="book-again-btn"
                          >
                            Book Again
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
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
                <h3>Event Information</h3>
                <p><strong>Event:</strong> {selectedBooking.event_name}</p>
                <p><strong>Date:</strong> {formatDate(selectedBooking.event_date)}</p>
                <p><strong>Venue:</strong> {selectedBooking.venue || 'Main Stadium'}</p>
              </div>
              <div className="detail-section">
                <h3>Your Information</h3>
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

export default MyBookingsPage;