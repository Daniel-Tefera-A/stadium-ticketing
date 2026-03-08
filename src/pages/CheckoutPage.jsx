import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    confirmEmail: ''
  });
  const [errors, setErrors] = useState({});

  // Get state from navigation (passed from EventDetailPage)
  const { selectedSeats, event, totalAmount } = location.state || {};

  useEffect(() => {
    // Redirect if no seats selected (direct access to checkout)
    if (!selectedSeats || selectedSeats.length === 0) {
      navigate(`/event/${eventId}`);
    }
  }, [selectedSeats, eventId, navigate]);

  if (!selectedSeats || !event) {
    return null;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const calculateFees = () => {
    return totalAmount * 0.1; // 10% service fee
  };

  const calculateGrandTotal = () => {
    return totalAmount + calculateFees();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Full name is required';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Email is invalid';
    }

    if (formData.customerEmail !== formData.confirmEmail) {
      newErrors.confirmEmail = 'Emails do not match';
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required';
    } else if (!/^[\d\s\+\-\(\)]{10,}$/.test(formData.customerPhone)) {
      newErrors.customerPhone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        eventId: parseInt(eventId),
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        seats: selectedSeats.map(seat => ({
          id: seat.id,
          price: seat.price,
          section: seat.section,
          row: seat.row_number,
          seat: seat.seat_number
        }))
      };

      console.log('Submitting booking:', bookingData);

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();

      if (response.ok) {
        // Success! Navigate to confirmation page
        navigate(`/confirmation/${data.bookingReference}`, {
          state: {
            bookingReference: data.bookingReference,
            customerEmail: formData.customerEmail,
            event,
            selectedSeats,
            totalAmount: data.totalAmount
          }
        });
      } else {
        alert(data.error || 'Booking failed. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <div className="checkout-container">
        <h1>Complete Your Booking</h1>

        <div className="checkout-layout">
          {/* Order Summary */}
          <div className="checkout-summary">
            <h2>Order Summary</h2>
            
            <div className="checkout-event">
              <h3>{event.name}</h3>
              <p>📅 {formatDate(event.date)}</p>
              <p>📍 {event.venue || 'Main Stadium'}</p>
            </div>

            <div className="checkout-seats">
              <h4>Selected Seats ({selectedSeats.length})</h4>
              {selectedSeats.map(seat => (
                <div key={seat.id} className="checkout-seat-item">
                  <span>
                    <strong>{seat.section}</strong> - Row {seat.row_number}, Seat {seat.seat_number}
                  </span>
                  <span className="seat-price">${seat.price}</span>
                </div>
              ))}
            </div>

            <div className="checkout-total">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Service Fee (10%):</span>
                <span>${calculateFees().toFixed(2)}</span>
              </div>
              <div className="total-row grand-total">
                <span>Total:</span>
                <span>${calculateGrandTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="checkout-note">
              <p>⏰ Seats are held for 10 minutes. Complete booking to confirm.</p>
            </div>
          </div>

          {/* Customer Information Form */}
          <div className="checkout-form">
            <h2>Your Information</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="customerName">Full Name *</label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className={errors.customerName ? 'error' : ''}
                  disabled={loading}
                  placeholder="John Doe"
                />
                {errors.customerName && (
                  <div className="error-message">{errors.customerName}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="customerEmail">Email Address *</label>
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  className={errors.customerEmail ? 'error' : ''}
                  disabled={loading}
                  placeholder="john@example.com"
                />
                {errors.customerEmail && (
                  <div className="error-message">{errors.customerEmail}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmEmail">Confirm Email *</label>
                <input
                  type="email"
                  id="confirmEmail"
                  name="confirmEmail"
                  value={formData.confirmEmail}
                  onChange={handleInputChange}
                  className={errors.confirmEmail ? 'error' : ''}
                  disabled={loading}
                  placeholder="john@example.com"
                />
                {errors.confirmEmail && (
                  <div className="error-message">{errors.confirmEmail}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="customerPhone">Phone Number *</label>
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  className={errors.customerPhone ? 'error' : ''}
                  disabled={loading}
                  placeholder="+1 234 567 8900"
                />
                {errors.customerPhone && (
                  <div className="error-message">{errors.customerPhone}</div>
                )}
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? <LoadingSpinner message="Processing..." /> : 'Confirm & Pay'}
              </button>

              <p className="terms-note">
                By completing this booking, you agree to our 
                <a href="/terms"> Terms of Service</a> and 
                <a href="/privacy"> Privacy Policy</a>.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;