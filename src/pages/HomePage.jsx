import React, { useState, useEffect } from 'react';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getEvents } from '../services/api';

const HomePage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading events..." />;
  
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;

  return (
    <main className="container">
      <section className="hero">
        <h2>Upcoming Events</h2>
        <p>Book tickets for the best events in town</p>
      </section>

      <div className="events-grid">
        {events.length === 0 ? (
          <p>No events scheduled yet.</p>
        ) : (
          events.map(event => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </main>
  );
};

export default HomePage;