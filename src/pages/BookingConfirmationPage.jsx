import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './BookingConfirmationPage.css';

const BookingConfirmationPage = () => {
  const { bookingReference } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // If we have state from navigation, use it
    if (location.state) {
      setBooking(location.state);
      setLoading(false);
    } else {
      // Otherwise fetch from API (for direct links/sharing)
      fetchBookingDetails();
    }
  }, [bookingReference]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingReference}`);
      if (!response.ok) throw new Error('Booking not found');
      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error('Failed to fetch booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container">
        <LoadingSpinner message="Loading your booking..." />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container">
        <div className="confirmation-container error">
          <div className="error-icon">❌</div>
          <h1>Booking Not Found</h1>
          <p>The booking reference "{bookingReference}" doesn't exist.</p>
          <button onClick={() => navigate('/')} className="action-button primary">
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="confirmation-container">
        <div className="success-icon">✅</div>
        <h1>Booking Confirmed!</h1>
        <p className="booking-ref">Reference: {booking.bookingReference || bookingReference}</p>

        <div className="confirmation-details">
          <div className="detail-section">
            <h3>Event Details</h3>
            <div className="detail-row">
              <span className="detail-label">Event:</span>
              <span className="detail-value">{booking.event?.name || booking.event_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{formatDate(booking.event?.date || booking.event_date)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Venue:</span>
              <span className="detail-value">{booking.event?.venue || 'Main Stadium'}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Customer Details</h3>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{booking.customerName || booking.customer_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{booking.customerEmail || booking.customer_email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">{booking.customerPhone || booking.customer_phone}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Seat Details</h3>
            <div className="seats-list">
              {(booking.selectedSeats || booking.seats || []).map((seat, index) => (
                <div key={index} className="seat-item">
                  <span className="seat-section">{seat.section}</span>
                  <span className="seat-location">
                    Row {seat.row_number || seat.row}, Seat {seat.seat_number || seat.seat}
                  </span>
                  <span className="seat-price">${seat.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section total">
            <div className="detail-row">
              <span className="detail-label">Total Amount:</span>
              <span className="total-amount">
                ${(booking.totalAmount || booking.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="confirmation-message">
          <p>✨ A confirmation email has been sent to {booking.customerEmail || booking.customer_email}</p>
          <p>📱 Please show this screen or the printed ticket at the entrance.</p>
        </div>

        <div className="action-buttons">
          <button onClick={handlePrint} className="action-button print">
            🖨️ Print Ticket
          </button>
          <button onClick={() => navigate('/')} className="action-button primary">
            Browse More Events
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;