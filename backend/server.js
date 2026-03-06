const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL] 
      : ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL]
    : ["http://localhost:5173"],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// ==================== HELPER FUNCTIONS ====================

// Generate unique booking reference
function generateBookingReference() {
  return 'BK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// ==================== EVENTS ROUTES ====================

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events ORDER BY date'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single event
app.get('/api/events/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Event not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create event
app.post('/api/events', async (req, res) => {
  const { name, date, description, image_url, base_price, venue } = req.body;
  
  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO events (name, date, description, image_url, base_price, venue) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, date, description, image_url || null, base_price || 0, venue || 'Main Stadium']
    );
    
    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'Event created successfully' 
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
  const { name, date, description, image_url, base_price, venue } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE events SET name = $1, date = $2, description = $3, image_url = $4, base_price = $5, venue = $6 WHERE id = $7',
      [name, date, description, image_url, base_price, venue, req.params.id]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Event not found' });
    } else {
      res.json({ message: 'Event updated successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Event not found' });
    } else {
      res.json({ message: 'Event deleted successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (validPassword) {
      res.json({ 
        success: true, 
        message: 'Login successful',
        admin: { id: admin.id, username: admin.username }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SEATS ROUTES ====================

// Get all seats for an event
app.get('/api/seats/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM seats WHERE event_id = $1 ORDER BY section, row_number, seat_number',
      [eventId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching seats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate seats for an event
app.post('/api/seats/generate/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { sections } = req.body;

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({ error: 'Sections array is required' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing seats
    await client.query('DELETE FROM seats WHERE event_id = $1', [eventId]);
    
    // Insert new seats
    let totalSeats = 0;
    
    for (const section of sections) {
      if (!section.name || !section.rows || !section.seatsPerRow || !section.price) {
        throw new Error('Invalid section data');
      }
      
      for (let row = 1; row <= section.rows; row++) {
        for (let seat = 1; seat <= section.seatsPerRow; seat++) {
          await client.query(
            'INSERT INTO seats (event_id, section, row_number, seat_number, price) VALUES ($1, $2, $3, $4, $5)',
            [eventId, section.name, row, seat, section.price]
          );
          totalSeats++;
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Emit event that seats were generated
    io.to(`event-${eventId}`).emit('seats-generated', { eventId });
    
    res.json({ 
      message: 'Seats generated successfully',
      totalSeats 
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating seats:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update seat status
app.patch('/api/seats/:seatId/status', async (req, res) => {
  const { seatId } = req.params;
  const { status, heldUntil, bookingId, eventId } = req.body;

  try {
    const result = await pool.query(
      `UPDATE seats 
       SET status = $1, held_until = $2, booking_id = $3 
       WHERE id = $4 
       RETURNING *`,
      [status, heldUntil || null, bookingId || null, seatId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }
    
    // Emit update to all clients in the event room
    io.to(`event-${eventId || result.rows[0].event_id}`).emit('seat-update', {
      seatId: parseInt(seatId),
      status,
      heldUntil,
      seat: result.rows[0]
    });
    
    res.json({ 
      message: 'Seat status updated successfully',
      seatId: parseInt(seatId)
    });
    
  } catch (err) {
    console.error('Error updating seat status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update seat price
app.patch('/api/seats/:seatId/price', async (req, res) => {
  const { seatId } = req.params;
  const { price } = req.body;

  if (!price || price < 0) {
    return res.status(400).json({ error: 'Valid price is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE seats SET price = $1 WHERE id = $2',
      [price, seatId]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Seat not found' });
    } else {
      res.json({ message: 'Seat price updated successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update seat prices by section
app.patch('/api/seats/event/:eventId/section/:section/price', async (req, res) => {
  const { eventId, section } = req.params;
  const { price } = req.body;

  try {
    const result = await pool.query(
      'UPDATE seats SET price = $1 WHERE event_id = $2 AND section = $3',
      [price, eventId, section]
    );
    
    res.json({ 
      message: 'Section prices updated successfully',
      affectedRows: result.rowCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== BOOKINGS ROUTES ====================

// Create a booking
app.post('/api/bookings', async (req, res) => {
  const { eventId, customerName, customerEmail, customerPhone, seats } = req.body;
  
  if (!eventId || !customerName || !customerEmail || !seats || seats.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const bookingRef = generateBookingReference();
  const totalAmount = seats.reduce((sum, seat) => sum + seat.price, 0);

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert booking
    const bookingResult = await client.query(
      `INSERT INTO bookings 
       (event_id, customer_name, customer_email, customer_phone, total_amount, booking_reference) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [eventId, customerName, customerEmail, customerPhone, totalAmount, bookingRef]
    );
    
    const bookingId = bookingResult.rows[0].id;
    
    // Update seats
    for (const seat of seats) {
      await client.query(
        `UPDATE seats 
         SET status = 'booked', booking_id = $1, held_until = NULL 
         WHERE id = $2`,
        [bookingId, seat.id]
      );
    }
    
    await client.query('COMMIT');
    
    // Emit updates for all booked seats
    seats.forEach(seat => {
      io.to(`event-${eventId}`).emit('seat-update', {
        seatId: seat.id,
        status: 'booked',
        bookingId: bookingId
      });
    });
    
    res.status(201).json({
      message: 'Booking created successfully',
      bookingId,
      bookingReference: bookingRef,
      totalAmount
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get booking by reference
app.get('/api/bookings/:reference', async (req, res) => {
  try {
    const bookingResult = await pool.query(
      `SELECT b.*, e.name as event_name, e.date as event_date, e.venue 
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.booking_reference = $1`,
      [req.params.reference]
    );
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = bookingResult.rows[0];
    
    // Get seats for this booking
    const seatsResult = await pool.query(
      'SELECT * FROM seats WHERE booking_id = $1',
      [booking.id]
    );
    
    res.json({ ...booking, seats: seatsResult.rows });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bookings for an event (admin)
app.get('/api/bookings/event/:eventId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, COUNT(s.id) as seat_count 
       FROM bookings b
       LEFT JOIN seats s ON b.id = s.booking_id
       WHERE b.event_id = $1
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [req.params.eventId]
    );
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel booking
app.patch('/api/bookings/:id/cancel', async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update booking status
    await client.query(
      'UPDATE bookings SET status = $1 WHERE id = $2',
      ['cancelled', id]
    );
    
    // Release all seats for this booking
    await client.query(
      'UPDATE seats SET status = $1, booking_id = NULL WHERE booking_id = $2',
      ['available', id]
    );
    
    await client.query('COMMIT');
    
    res.json({ message: 'Booking cancelled successfully' });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================== STATS ROUTES ====================

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const [events, upcoming, bookings, seats, bookedSeats] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM events'),
      pool.query('SELECT COUNT(*) as upcoming FROM events WHERE date > NOW()'),
      pool.query('SELECT COUNT(*) as total, SUM(total_amount) as revenue FROM bookings'),
      pool.query('SELECT COUNT(*) as total FROM seats'),
      pool.query('SELECT COUNT(*) as booked FROM seats WHERE status = $1', ['booked'])
    ]);
    
    res.json({
      totalEvents: parseInt(events.rows[0].total),
      upcomingEvents: parseInt(upcoming.rows[0].upcoming),
      totalBookings: parseInt(bookings.rows[0].total) || 0,
      totalRevenue: parseFloat(bookings.rows[0].revenue) || 0,
      totalSeats: parseInt(seats.rows[0].total) || 0,
      bookedSeats: parseInt(bookedSeats.rows[0].booked) || 0
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== WEBSOCKET ====================

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`Client ${socket.id} joined event room: event-${eventId}`);
  });

  socket.on('leave-event', (eventId) => {
    socket.leave(`event-${eventId}`);
    console.log(`Client ${socket.id} left event room: event-${eventId}`);
  });

  socket.on('seat-held', (data) => {
    socket.to(`event-${data.eventId}`).emit('seat-update', {
      seatId: data.seatId,
      status: 'held',
      heldUntil: data.heldUntil
    });
  });

  socket.on('seat-released', (data) => {
    socket.to(`event-${data.eventId}`).emit('seat-update', {
      seatId: data.seatId,
      status: 'available',
      heldUntil: null
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
});

// ==================== START SERVER ====================

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server running`);
  console.log(`📊 Health check: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await pool.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, pool, io };