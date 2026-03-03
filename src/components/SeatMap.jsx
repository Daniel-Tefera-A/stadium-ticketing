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

  useEffect(() => {
    fetchSeats();
    joinEvent(eventId);

    if (socket) {
      socket.on('seat-update', handleSeatUpdate);
      socket.on('seats-generated', () => {
        fetchSeats(); // Reload seats when generated
      });
    }

    const interval = setInterval(fetchSeats, 30000);

    return () => {
      clearInterval(interval);
      leaveEvent(eventId);
      if (socket) {
        socket.off('seat-update', handleSeatUpdate);
        socket.off('seats-generated');
      }
    };
  }, [eventId]);

  const handleSeatUpdate = (update) => {
    setSeats(prevSeats => 
      prevSeats.map(seat => 
        seat.id === update.seatId 
          ? { ...seat, status: update.status, held_until: update.heldUntil }
          : seat
      )
    );
  };

  const fetchSeats = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/seats/event/${eventId}`);
      const data = await response.json();
      setSeats(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load seats:', err);
      setError('Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seats.length > 0) {
      const grouped = {};
      seats.forEach(seat => {
        if (!grouped[seat.section]) {
          grouped[seat.section] = {};
        }
        if (!grouped[seat.section][seat.row_number]) {
          grouped[seat.section][seat.row_number] = [];
        }
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

  const canSelectSeat = useCallback((seat) => {
    const status = getSeatStatus(seat);
    if (status === 'booked' || status === 'held') return false;
    if (selectedSeats.length >= maxSelectable && !selectedSeats.includes(seat.id)) {
      return false;
    }
    return true;
  }, [getSeatStatus, selectedSeats, maxSelectable]);

  const handleSeatClick = async (seat) => {
    if (!canSelectSeat(seat)) {
      if (selectedSeats.length >= maxSelectable) {
        alert(`You can only select up to ${maxSelectable} seats`);
      }
      return;
    }

    const isSelected = selectedSeats.includes(seat.id);
    
    // Optimistic update
    onSeatSelect(seat);

    try {
      if (!isSelected) {
        const holdUntil = new Date(Date.now() + 10 * 60 * 1000);
        await fetch(`http://localhost:3000/api/seats/${seat.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'held', 
            heldUntil: holdUntil.toISOString(),
            eventId 
          })
        });
        
        if (socket) {
          socket.emit('seat-held', {
            seatId: seat.id,
            eventId,
            heldUntil: holdUntil.toISOString()
          });
        }
      } else {
        await fetch(`http://localhost:3000/api/seats/${seat.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'available', 
            heldUntil: null,
            eventId 
          })
        });

        if (socket) {
          socket.emit('seat-released', {
            seatId: seat.id,
            eventId
          });
        }
      }
    } catch (err) {
      console.error('Failed to update seat:', err);
      onSeatSelect(seat);
      alert('Failed to update seat. Please try again.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.shiftKey) {
      setSelectionMode('multiple');
    }
  };

  const handleKeyUp = (e) => {
    if (!e.shiftKey) {
      setSelectionMode('single');
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (loading) return <div className="seatmap-loading">Loading seat map...</div>;
  if (error) return <div className="seatmap-error">{error}</div>;
  if (seats.length === 0) return <div className="seatmap-empty">No seats configured for this event</div>;

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
            <span>Temporarily Held</span>
          </div>
        </div>
        <div className="selection-mode">
          Mode: {selectionMode === 'multiple' ? '🟢 Multiple Select' : '🔵 Single Select'}
          <span className="mode-hint">(Hold Shift for multiple)</span>
        </div>
      </div>

      <div className="stage-indicator">🎪 STAGE 🎪</div>

      <div className="sections-container">
        {Object.entries(groupedSeats).map(([sectionName, rows]) => (
          <div key={sectionName} className="section">
            <h3 className="section-title">{sectionName} Section</h3>
            {Object.entries(rows).map(([rowNum, rowSeats]) => (
              <div key={rowNum} className="row">
                <span className="row-label">Row {rowNum}</span>
                <div className="seats">
                  {rowSeats.map(seat => {
                    const status = getSeatStatus(seat);
                    const selectable = canSelectSeat(seat);
                    return (
                      <button
                        key={seat.id}
                        className={`seat ${status} ${hoveredSeat === seat.id ? 'hovered' : ''}`}
                        onClick={() => handleSeatClick(seat)}
                        onMouseEnter={() => setHoveredSeat(seat.id)}
                        onMouseLeave={() => setHoveredSeat(null)}
                        disabled={!selectable}
                        title={`${seat.section} Row ${seat.row_number} Seat ${seat.seat_number}\nPrice: $${seat.price}\n${status}`}
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
    </div>
  );
};

export default SeatMap;