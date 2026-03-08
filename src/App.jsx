import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import EventDetailPage from './pages/EventDetailPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import CheckoutPage from './pages/CheckoutPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/event/:id" element={<EventDetailPage />} />
          <Route path="/admin" element={<AdminPage />} />
<Route path="/checkout/:eventId" element={<CheckoutPage />} />
          <Route path="/confirmation/:bookingReference" element={<BookingConfirmationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <footer className="footer">
          <div className="container">
            <p>&copy; 2024 Stadium Events. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;