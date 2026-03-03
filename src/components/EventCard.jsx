import React from 'react';
import { useNavigate } from 'react-router-dom';

const EventCard = ({ event }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="event-card" onClick={() => navigate(`/event/${event.id}`)}>
      <div className="event-image">
        {event.image_url ? <img src={event.image_url} alt={event.name} /> : '🎪'}
      </div>
      <div className="event-info">
        <h3>{event.name}</h3>
        <div className="event-date">📅 {formatDate(event.date)}</div>
        <div className="event-price">${event.base_price}</div>
      </div>
    </div>
  );
};

export default EventCard;