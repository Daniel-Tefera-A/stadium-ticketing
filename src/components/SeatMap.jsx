import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import './SeatMap.css';

const SeatMap = ({ eventId, onSeatSelect, selectedSeats = [], maxSelectable = 10 }) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedSeats, setGroupedSeats] = useState({});
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [selectionMode, setSelectionMode] = useState('single');
  const { socket, isConnected, joinEvent, leaveEvent } = useSocket();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Helper function to safely format price
  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0.00';
    const num = Number(price);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadSeats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/seats/event/${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch seats');
        const data = await response.json();
        
        // Ensure all seats have valid numbers
        const sanitizedData = data.map(seat => ({
          ...seat,
          price: Number(seat.price) || 0,
          row_number: Number(seat.row_number) || 0,
          seat_number: Number(seat.seat_number) || 0
        }));
        
        if (isMounted) {
          setSeats(sanitizedData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSeats();
    joinEvent(eventId);

    if (socket) {
      socket.on('seat-update', handleSeatUpdate);
    }

    const interval = setInterval(loadSeats, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      leaveEvent(eventId);
      if (socket) {
        socket.off('seat-update', handleSeatUpdate);
      }
    };
  }, [eventId]);

  const handleSeatUpdate = useCallback((update) => {
    setSeats(prev => prev.map(seat => 
      seat.id === update.seatId 
        ? { 
            ...seat, 
            status: update.status, 
            held_until: update.heldUntil,
            price: Number(seat.price) || 0 // Ensure price stays a number
          }
        : seat
    ));
  }, []);

  useEffect(() => {
    if (seats.length > 0) {
      const grouped = {};
      seats.forEach(seat => {
        if (!grouped[seat.section]) grouped[seat.section] = {};
        if (!grouped[seat.section][seat.row_number]) grouped[seat.section][seat.row_number] = [];
        grouped[seat.section][seat.row_number].push(seat);
      });
      setGroupedSeats(grouped);
    }
  }, [seats]);

  const getSeatStatus = useCallback((seat) => {
    if (selectedSeats.includes(seat.id)) return 'selected';
    if (seat.status === 'booked') return 'booked';
    if (seat.status === 'held') {
      if (seat.held_until && new Date(seat.held_until) < new Date()) {
        return 'available';
      }
      return 'held';
    }
    return 'available';
  }, [selectedSeats]);

  const handleSeatClick = async (seat) => {
    // Prevent any default behavior
    event?.preventDefault();
    event?.stopPropagation();

    const status = getSeatStatus(seat);
    if (status === 'booked' || status === 'held') return;
    
    if (selectedSeats.length >= maxSelectable && !selectedSeats.includes(seat.id)) {
      alert(`You can only select up to ${maxSelectable} seats`);
      return;
    }

    // Just call the parent handler - don't do any navigation
    onSeatSelect(seat);
  };

  const handleKeyDown = (e) => {
    if (e.shiftKey) setSelectionMode('multiple');
  };

  const handleKeyUp = (e) => {
    if (!e.shiftKey) setSelectionMode('single');
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (loading) return <div className="seatmap-loading">Loading seats...</div>;
  if (error) return <div className="seatmap-error">Error: {error}</div>;
  if (seats.length === 0) return <div className="seatmap-empty">No seats configured</div>;

  return (
    <div className="seatmap-container">
      <div className="seatmap-header">
        <div className="connection-status">
          {isConnected ? '🟢 Live' : '🔴 Offline'}
        </div>
        <div className="seatmap-legend">
          <div className="legend-item">
            <div className="seat-example available"></div>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <div className="seat-example selected"></div>
            <span>Selected ({selectedSeats.length}/{maxSelectable})</span>
          </div>
          <div className="legend-item">
            <div className="seat-example booked"></div>
            <span>Booked</span>
          </div>
          <div className="legend-item">
            <div className="seat-example held"></div>
            <span>Held</span>
          </div>
        </div>
        <div className="selection-mode">
          Mode: {selectionMode === 'multiple' ? '🟢 Multiple' : '🔵 Single'}
          <span className="mode-hint">(Hold Shift)</span>
        </div>
      </div>

      <div className="stage-indicator">🎪 STAGE 🎪</div>

      {Object.entries(groupedSeats).map(([sectionName, rows]) => (
        <div key={sectionName} className="section">
          <h3 className="section-title">{sectionName}</h3>
          {Object.entries(rows).map(([rowNum, rowSeats]) => (
            <div key={rowNum} className="row">
              <span className="row-label">Row {rowNum}</span>
              <div className="seats">
                {rowSeats.map(seat => {
                  const status = getSeatStatus(seat);
                  const price = Number(seat.price) || 0;
                  
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      className={`seat ${status} ${hoveredSeat === seat.id ? 'hovered' : ''}`}
                      onClick={() => handleSeatClick(seat)}
                      onMouseEnter={() => setHoveredSeat(seat.id)}
                      onMouseLeave={() => setHoveredSeat(null)}
                      disabled={status === 'booked' || status === 'held'}
                      title={`${seat.section} Row ${seat.row_number} Seat ${seat.seat_number}\nPrice: $${formatPrice(price)}`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SeatMap;