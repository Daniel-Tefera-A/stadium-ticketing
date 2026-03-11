import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import SeatManager from '../components/SeatManager';
import { getEvents, createEvent, deleteEvent, login } from '../services/api';
import './AdminPage.css';

const AdminPage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedEventForSeats, setSelectedEventForSeats] = useState(null);
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  // Event form state
  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    description: '',
    base_price: 0,
    venue: 'Main Stadium'
  });

  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    setIsLoggedIn(adminLoggedIn);
    if (adminLoggedIn) {
      loadEvents();
    }
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      setEvents(data);
    } catch (error) {
      showMessage('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginChange = (e) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
    });
  };

  const handleEventChange = (e) => {
    setEventForm({
      ...eventForm,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(loginForm);
      localStorage.setItem('adminLoggedIn', 'true');
      setIsLoggedIn(true);
      showMessage('Login successful!', 'success');
      loadEvents();
    } catch (error) {
      showMessage('Invalid username or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    setIsLoggedIn(false);
    setEvents([]);
    showMessage('Logged out successfully', 'success');
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createEvent({
        ...eventForm,
        date: eventForm.date.replace('T', ' ')
      });
      showMessage('Event created successfully!', 'success');
      setEventForm({ name: '', date: '', description: '', base_price: 0, venue: 'Main Stadium' });
      loadEvents();
    } catch (error) {
      showMessage('Failed to create event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      setLoading(true);
      await deleteEvent(id);
      showMessage('Event deleted successfully', 'success');
      loadEvents();
    } catch (error) {
      showMessage('Failed to delete event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="container">
        <div className="admin-container">
          <h2>Admin Login</h2>
          
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={loginForm.username}
                onChange={handleLoginChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="demo-credentials">
            <p>Demo credentials:</p>
            <p>Username: admin</p>
            <p>Password: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="admin-container">
        <div className="admin-header">
          <h2>Admin Dashboard</h2>
          <div>
            <button 
              onClick={() => navigate('/admin-dashboard')} 
              className="dashboard-btn"
            >
              📊 View Analytics
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="create-event-section">
          <h3>Create New Event</h3>
          <form onSubmit={handleCreateEvent} className="event-form">
            <div className="form-group">
              <label htmlFor="name">Event Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={eventForm.name}
                onChange={handleEventChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date & Time *</label>
              <input
                type="datetime-local"
                id="date"
                name="date"
                value={eventForm.date}
                onChange={handleEventChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="venue">Venue</label>
              <input
                type="text"
                id="venue"
                name="venue"
                value={eventForm.venue}
                onChange={handleEventChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={eventForm.description}
                onChange={handleEventChange}
                rows="3"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="base_price">Base Price ($)</label>
              <input
                type="number"
                id="base_price"
                name="base_price"
                value={eventForm.base_price}
                onChange={handleEventChange}
                min="0"
                step="0.01"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="create-button"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </form>
        </div>

        <div className="events-list-section">
          <h3>Existing Events</h3>
          
          {loading && <LoadingSpinner message="Loading events..." />}

          {!loading && events.length === 0 && (
            <p className="no-events">No events created yet.</p>
          )}

          {!loading && events.length > 0 && (
            <ul className="event-list">
              {events.map(event => (
                <li key={event.id} className="event-item">
                  <div className="event-info">
                    <strong>{event.name}</strong>
                    <div className="event-meta">
                      {formatDate(event.date)} - ${event.base_price} - {event.venue || 'Main Stadium'}
                    </div>
                  </div>
                  <div className="event-actions">
                    <button
                      onClick={() => setSelectedEventForSeats(event)}
                      className="manage-seats-btn"
                    >
                      Manage Seats
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="delete-button"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selectedEventForSeats && (
        <SeatManager
          eventId={selectedEventForSeats.id}
          eventName={selectedEventForSeats.name}
          onClose={() => setSelectedEventForSeats(null)}
        />
      )}
    </div>
  );
};

export default AdminPage;