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

  useEffect(() => {
    let isMounted = true;
    
    const loadSeats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/seats/event/${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch seats');
        const data = await response.json();
        if (isMounted) {
          setSeats(data);
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
        ? { ...seat, status: update.status, held_until: update.heldUntil }
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
      </div>

      <div className="stage-indicator">🎪 STAGE 🎪</div>

      {Object.entries(groupedSeats).map(([section, rows]) => (
        <div key={section} className="section">
          <h3>{section}</h3>
          {Object.entries(rows).map(([rowNum, rowSeats]) => (
            <div key={rowNum} className="row">
              <span className="row-label">Row {rowNum}</span>
              <div className="seats">
                {rowSeats.map(seat => (
                  <button
                    key={seat.id}
                    type="button"
                    className={`seat ${getSeatStatus(seat)}`}
                    onClick={() => handleSeatClick(seat)}
                    disabled={getSeatStatus(seat) === 'booked' || getSeatStatus(seat) === 'held'}
                  >
                    {seat.seat_number}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SeatMap;