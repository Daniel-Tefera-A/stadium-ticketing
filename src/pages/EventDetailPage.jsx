import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import SeatMap from '../components/SeatMap';
import BookingCart from '../components/BookingCart';
import { getEvent } from '../services/api';
import './EventDetailPage.css';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showSeatMap, setShowSeatMap] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const data = await getEvent(id);
      setEvent(data);
      setError(null);
    } catch (err) {
      setError('Event not found or failed to load.');
    } finally {
      setLoading(false);
    }
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

  const handleSeatSelect = (seat) => {
  setSelectedSeats(prev => {
    // Check if seat is already selected
    const isSelected = prev.some(s => s.id === seat.id);
    
    if (isSelected) {
      // Remove from selection
      return prev.filter(s => s.id !== seat.id);
    } else {
      // Add to selection (but don't exceed max)
      if (prev.length >= 10) {
        alert('You can only select up to 10 seats');
        return prev;
      }
      return [...prev, seat];
    }
  });
};

  const handleRemoveSeat = (seatToRemove) => {
    setSelectedSeats(prev => prev.filter(seat => seat.id !== seatToRemove.id));
    
    fetch(`http://localhost:3000/api/seats/${seatToRemove.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'available', 
        heldUntil: null,
        eventId: id 
      })
    }).catch(err => console.error('Failed to release seat:', err));
  };

  const handleCheckout = () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }
    navigate(`/checkout/${id}`, { 
      state: { 
        selectedSeats, 
        event,
        totalAmount: selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
      } 
    });
  };

  if (loading) return <LoadingSpinner message="Loading event details..." />;
  
  if (error) return (
    <div className="container">
      <div className="error-message">{error}</div>
      <button onClick={() => navigate('/')} className="back-button">
        ← Back to Events
      </button>
    </div>
  );

  if (!event) return null;

  return (
    <main className="container">
      <button onClick={() => navigate('/')} className="back-button">
        ← Back to Events
      </button>

      <div className="event-detail">
        <div className="event-header">
          <h1>{event.name}</h1>
          <div className="event-image-large">
            {event.image_url ? (
              <img src={event.image_url} alt={event.name} />
            ) : (
              <div className="event-emoji-large">🎪</div>
            )}
          </div>
        </div>

        <div className="event-meta">
          <div className="meta-item">
            <span className="meta-label">📅 Date & Time:</span>
            <span className="meta-value">{formatDate(event.date)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">📍 Venue:</span>
            <span className="meta-value">{event.venue || 'Main Stadium'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">💰 Starting at:</span>
            <span className="meta-value">${event.base_price}</span>
          </div>
          {event.description && (
            <div className="meta-item description">
              <span className="meta-label">📝 Description:</span>
              <p className="meta-value">{event.description}</p>
            </div>
          )}
        </div>

        {!showSeatMap ? (
          <button 
            className="book-button" 
            onClick={() => setShowSeatMap(true)}
          >
            Select Seats
          </button>
        ) : (
          <>
            <SeatMap 
              eventId={id} 
              onSeatSelect={handleSeatSelect}
              selectedSeats={selectedSeats.map(s => s.id)}
              maxSelectable={10}
            />
            
            <BookingCart
              selectedSeats={selectedSeats}
              event={event}
              onRemoveSeat={handleRemoveSeat}
              onCheckout={handleCheckout}
            />
          </>
        )}
      </div>
    </main>
  );
};

export default EventDetailPage;