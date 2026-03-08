import React, { useState, useEffect } from 'react';
import './BookingCart.css';

const BookingCart = ({ selectedSeats, event, onRemoveSeat, onCheckout }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    console.log('Selected seats in cart:', selectedSeats);
  }, [selectedSeats]);

  const calculateTotal = () => {
    // FIXED: Add safety checks
    if (!selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return 0;
    }
    
    return selectedSeats.reduce((sum, seat) => {
      // Make sure seat.price is a number
      const price = Number(seat?.price) || 0;
      return sum + price;
    }, 0);
  };

  const calculateFees = () => {
    const total = calculateTotal();
    return total * 0.1; // 10% service fee
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateFees();
  };

  // FIXED: Helper function to safely format numbers
  const formatPrice = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0.00';
    }
    return value.toFixed(2);
  };

  if (!selectedSeats || selectedSeats.length === 0) {
    return (
      <div className="cart-container empty">
        <div className="cart-header" onClick={() => setIsExpanded(!isExpanded)}>
          <h3>🛒 Booking Cart</h3>
          <span className="cart-toggle">{isExpanded ? '▼' : '▲'}</span>
        </div>
        {isExpanded && (
          <div className="cart-empty">
            <p>No seats selected yet</p>
            <p className="cart-hint">Click on available seats to add them to your cart</p>
          </div>
        )}
      </div>
    );
  }

  const total = calculateTotal();
  const fees = calculateFees();
  const grandTotal = calculateGrandTotal();

  return (
    <div className={`cart-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="cart-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>🛒 Booking Cart ({selectedSeats.length} seats)</h3>
        <span className="cart-toggle">{isExpanded ? '▼' : '▲'}</span>
      </div>

      {isExpanded && (
        <>
          <div className="cart-items">
            {selectedSeats.map(seat => (
              <div key={seat.id} className="cart-item">
                <div className="seat-info">
                  <span className="seat-section">{seat?.section || 'N/A'}</span>
                  <span className="seat-location">
                    Row {seat?.row_number || '?'}, Seat {seat?.seat_number || '?'}
                  </span>
                </div>
                <div className="seat-price-actions">
                  <span className="seat-price">${formatPrice(seat?.price)}</span>
                  <button 
                    className="remove-seat"
                    onClick={() => onRemoveSeat(seat)}
                    title="Remove seat"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>${formatPrice(total)}</span>
            </div>
            <div className="summary-row">
              <span>Service Fee (10%):</span>
              <span>${formatPrice(fees)}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${formatPrice(grandTotal)}</span>
            </div>
          </div>

          <button className="checkout-btn" onClick={onCheckout}>
            Proceed to Checkout
          </button>

          <p className="cart-note">
            ⏰ Seats are held for 10 minutes. Complete checkout to confirm.
          </p>
        </>
      )}
    </div>
  );
};

export default BookingCart;