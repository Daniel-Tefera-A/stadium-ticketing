import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import LoadingSpinner from '../components/LoadingSpinner';
import './CheckoutPage.css';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

const CheckoutForm = ({ amount, onSuccess, onError, bookingData, onSubmit }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setCardError('');

    if (!stripe || !elements) {
      setProcessing(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      setCardError(error.message);
      setProcessing(false);
    } else {
      // First create payment intent
      try {
        const paymentResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/create-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id,
            amount: amount
          })
        });

        const paymentData = await paymentResponse.json();

        if (paymentData.success) {
          // Then create booking
          onSubmit();
        } else {
          onError(paymentData.error);
        }
      } catch (err) {
        setCardError('Payment failed. Please try again.');
      }
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="form-group">
        <label>Card Details</label>
        <div className="card-element-container">
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' }
              },
              invalid: { color: '#9e2146' }
            }
          }} />
        </div>
        {cardError && <div className="error-message">{cardError}</div>}
      </div>
      
      <button 
        type="submit" 
        className="pay-button"
        disabled={!stripe || processing}
      >
        {processing ? <LoadingSpinner message="Processing..." /> : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
};

const CheckoutPage = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    confirmEmail: ''
  });
  const [errors, setErrors] = useState({});

  // Get state from navigation
  const { selectedSeats, event, totalAmount } = location.state || {};

  useEffect(() => {
    if (!selectedSeats || selectedSeats.length === 0) {
      navigate(`/event/${eventId}`);
    }
  }, [selectedSeats, eventId, navigate]);

  if (!selectedSeats || !event) {
    return null;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const calculateFees = () => {
    return totalAmount * 0.1;
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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const createBooking = async () => {
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

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();

      if (response.ok) {
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
        alert(data.error || 'Booking failed');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowPayment(true);
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
              <p>⏰ Seats are held for 10 minutes</p>
            </div>
          </div>

          {/* Customer Information & Payment */}
          <div className="checkout-form">
            {!showPayment ? (
              <>
                <h2>Your Information</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      className={errors.customerName ? 'error' : ''}
                      placeholder="John Doe"
                    />
                    {errors.customerName && <div className="error-message">{errors.customerName}</div>}
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      className={errors.customerEmail ? 'error' : ''}
                      placeholder="john@example.com"
                    />
                    {errors.customerEmail && <div className="error-message">{errors.customerEmail}</div>}
                  </div>

                  <div className="form-group">
                    <label>Confirm Email *</label>
                    <input
                      type="email"
                      name="confirmEmail"
                      value={formData.confirmEmail}
                      onChange={handleInputChange}
                      className={errors.confirmEmail ? 'error' : ''}
                      placeholder="john@example.com"
                    />
                    {errors.confirmEmail && <div className="error-message">{errors.confirmEmail}</div>}
                  </div>

                  <div className="form-group">
                    <label>Phone *</label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className={errors.customerPhone ? 'error' : ''}
                      placeholder="+1 234 567 8900"
                    />
                    {errors.customerPhone && <div className="error-message">{errors.customerPhone}</div>}
                  </div>

                  <button type="submit" className="submit-btn">
                    Continue to Payment
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2>Payment Details</h2>
                <Elements stripe={stripePromise}>
                  <CheckoutForm
                    amount={calculateGrandTotal()}
                    onSuccess={() => {}}
                    onError={setPaymentError}
                    onSubmit={createBooking}
                  />
                </Elements>
                {paymentError && <div className="error-message">{paymentError}</div>}
                
                <button 
                  onClick={() => setShowPayment(false)} 
                  className="back-btn"
                  style={{ marginTop: '1rem' }}
                >
                  ← Back to Information
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;