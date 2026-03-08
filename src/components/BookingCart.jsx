import React, { useState, useEffect } from 'react';
import './BookingCart.css';

const BookingCart = ({ selectedSeats, event, onRemoveSeat, onCheckout }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // ✅ FIXED: useEffect inside the component, not floating outside
  useEffect(() => {
    console.log('Selected seats in cart:', selectedSeats);
  }, [selectedSeats]);

  const calculateTotal = () => {
    return selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  };

  const calculateFees = () => {
    return calculateTotal() * 0.1; // 10% service fee
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateFees();
  };

  if (selectedSeats.length === 0) {
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
                  <span className="seat-section">{seat.section}</span>
                  <span className="seat-location">
                    Row {seat.row_number}, Seat {seat.seat_number}
                  </span>
                </div>
                <div className="seat-price-actions">
                  <span className="seat-price">${seat.price}</span>
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
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Service Fee (10%):</span>
              <span>${calculateFees().toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${calculateGrandTotal().toFixed(2)}</span>
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