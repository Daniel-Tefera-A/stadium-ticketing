const express = require('express');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { sendEmail } = require('./services/emailService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ==================== DATABASE SELECTION ====================
// Choose database based on environment and availability
let db;
let isPostgreSQL = false;

// Function to test PostgreSQL connection
async function testPostgreSQLConnection() {
  if (!process.env.DATABASE_URL) return false;
  
  const testPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000
  });
  
  try {
    await testPool.connect();
    await testPool.end();
    return true;
  } catch (err) {
    console.log('PostgreSQL not available, using SQLite fallback');
    return false;
  }
}

// Initialize appropriate database
async function initDatabase() {
  const postgresAvailable = await testPostgreSQLConnection();
  
  if (postgresAvailable && process.env.NODE_ENV === 'production') {
    // Use PostgreSQL for production
    isPostgreSQL = true;
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('✅ Using PostgreSQL database (Production mode)');
    await createPostgresTables();
  } else {
    // Use SQLite for offline/local development
    isPostgreSQL = false;
    const sqlitePath = process.env.SQLITE_PATH || './database.db';
    db = new sqlite3.Database(sqlitePath, (err) => {
      if (err) {
        console.error('SQLite connection error:', err);
      } else {
        console.log('✅ Using SQLite database (Offline/Local mode)');
      }
    });
    createSQLiteTables();
  }
}

// ==================== POSTGRESQL TABLES ====================
async function createPostgresTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date TIMESTAMP NOT NULL,
        description TEXT,
        image_url TEXT,
        base_price DECIMAL(10,2) DEFAULT 0,
        venue VARCHAR(255) DEFAULT 'Main Stadium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        total_amount DECIMAL(10,2) NOT NULL,
        booking_reference VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        section VARCHAR(100) NOT NULL,
        row_number INTEGER NOT NULL,
        seat_number INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'available',
        held_until TIMESTAMP,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ PostgreSQL tables ready');
    await initializeSampleData();
  } catch (err) {
    console.error('Error creating PostgreSQL tables:', err);
  }
}

// ==================== SQLITE TABLES ====================
function createSQLiteTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        base_price REAL DEFAULT 0,
        venue TEXT DEFAULT 'Main Stadium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT,
        total_amount REAL NOT NULL,
        booking_reference TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'confirmed',
        payment_status TEXT DEFAULT 'pending',
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events (id)
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS seats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        section TEXT NOT NULL,
        row_number INTEGER NOT NULL,
        seat_number INTEGER NOT NULL,
        price REAL NOT NULL,
        status TEXT DEFAULT 'available',
        held_until DATETIME,
        booking_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings (id)
      )
    `);
    
    console.log('✅ SQLite tables ready');
    initializeSampleData();
  });
}

// ==================== SAMPLE DATA ====================
async function initializeSampleData() {
  if (isPostgreSQL) {
    // Check if events exist
    const eventsCheck = await db.query('SELECT COUNT(*) FROM events');
    if (parseInt(eventsCheck.rows[0].count) === 0) {
      const sampleEvents = [
        ['Summer Music Festival', '2024-06-15 18:00:00', 'Annual music festival', null, 50, 'Main Stadium'],
        ['International Football Match', '2024-06-20 20:00:00', 'Championship Final', null, 75, 'Main Stadium'],
        ['Comedy Night', '2024-06-25 19:30:00', 'Stand-up comedy', null, 35, 'Comedy Hall']
      ];
      
      for (const event of sampleEvents) {
        await db.query(
          'INSERT INTO events (name, date, description, image_url, base_price, venue) VALUES ($1, $2, $3, $4, $5, $6)',
          event
        );
      }
      console.log('✅ Sample events added');
    }
    
    // Check if admin exists
    const adminCheck = await db.query('SELECT COUNT(*) FROM admins WHERE username = $1', ['admin']);
    if (parseInt(adminCheck.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', ['admin', hashedPassword]);
      console.log('✅ Admin created (admin/admin123)');
    }
  } else {
    // SQLite sample data
    db.get("SELECT COUNT(*) as count FROM events", (err, row) => {
      if (row && row.count === 0) {
        const sampleEvents = [
          ['Summer Music Festival', '2024-06-15 18:00', 'Annual music festival', null, 50, 'Main Stadium'],
          ['International Football Match', '2024-06-20 20:00', 'Championship Final', null, 75, 'Main Stadium'],
          ['Comedy Night', '2024-06-25 19:30', 'Stand-up comedy', null, 35, 'Comedy Hall']
        ];
        
        const stmt = db.prepare('INSERT INTO events (name, date, description, image_url, base_price, venue) VALUES (?, ?, ?, ?, ?, ?)');
        sampleEvents.forEach(event => stmt.run(event));
        stmt.finalize();
        console.log('✅ Sample events added');
      }
    });
    
    db.get("SELECT COUNT(*) as count FROM admins WHERE username = 'admin'", (err, row) => {
      if (row && row.count === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hashedPassword]);
        console.log('✅ Admin created (admin/admin123)');
      }
    });
  }
}

// ==================== HELPER FUNCTIONS ====================
function generateBookingReference() {
  return 'BK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase();
}

function formatEventDate(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ==================== QUERY WRAPPER ====================
// This makes both PostgreSQL and SQLite work with the same code
async function query(sql, params = []) {
  if (isPostgreSQL) {
    const result = await db.query(sql, params);
    return { rows: result.rows };
  } else {
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows });
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    });
  }
}

// ==================== SOCKET.IO SETUP ====================
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL] 
      : ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL]
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// ==================== API ROUTES ====================

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const result = await query('SELECT * FROM events ORDER BY date');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single event
app.get('/api/events/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM events WHERE id = ?', [req.params.id]);
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
    const result = await query(
      'INSERT INTO events (name, date, description, image_url, base_price, venue) VALUES (?, ?, ?, ?, ?, ?)',
      [name, date, description, image_url || null, base_price || 0, venue || 'Main Stadium']
    );
    res.status(201).json({ id: result.lastID, message: 'Event created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  try {
    await query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await query('SELECT * FROM admins WHERE username = ?', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (validPassword) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get seats for event
app.get('/api/seats/event/:eventId', async (req, res) => {
  try {
    const result = await query('SELECT * FROM seats WHERE event_id = ? ORDER BY section, row_number, seat_number', [req.params.eventId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate seats
app.post('/api/seats/generate/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { sections } = req.body;
  
  try {
    await query('DELETE FROM seats WHERE event_id = ?', [eventId]);
    let totalSeats = 0;
    for (const section of sections) {
      for (let row = 1; row <= section.rows; row++) {
        for (let seat = 1; seat <= section.seatsPerRow; seat++) {
          await query(
            'INSERT INTO seats (event_id, section, row_number, seat_number, price) VALUES (?, ?, ?, ?, ?)',
            [eventId, section.name, row, seat, section.price]
          );
          totalSeats++;
        }
      }
    }
    res.json({ message: 'Seats generated', totalSeats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update seat status
app.patch('/api/seats/:seatId/status', async (req, res) => {
  const { seatId } = req.params;
  const { status, heldUntil, eventId } = req.body;
  try {
    await query('UPDATE seats SET status = ?, held_until = ? WHERE id = ?', [status, heldUntil || null, seatId]);
    io.to(`event-${eventId}`).emit('seat-update', { seatId: parseInt(seatId), status, heldUntil });
    res.json({ message: 'Seat status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
  const { eventId, customerName, customerEmail, customerPhone, seats } = req.body;
  const bookingRef = generateBookingReference();
  const totalAmount = seats.reduce((sum, seat) => sum + seat.price, 0);
  
  try {
    const result = await query(
      'INSERT INTO bookings (event_id, customer_name, customer_email, customer_phone, total_amount, booking_reference) VALUES (?, ?, ?, ?, ?, ?)',
      [eventId, customerName, customerEmail, customerPhone, totalAmount, bookingRef]
    );
    const bookingId = result.lastID;
    
    for (const seat of seats) {
      await query('UPDATE seats SET status = "booked", booking_id = ? WHERE id = ?', [bookingId, seat.id]);
    }
    
    res.status(201).json({ bookingReference: bookingRef, totalAmount: totalAmount * 1.1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get booking by reference
app.get('/api/bookings/:reference', async (req, res) => {
  try {
    const bookingResult = await query(
      'SELECT b.*, e.name as event_name, e.date as event_date FROM bookings b JOIN events e ON b.event_id = e.id WHERE b.booking_reference = ?',
      [req.params.reference]
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const seatsResult = await query('SELECT * FROM seats WHERE booking_id = ?', [bookingResult.rows[0].id]);
    res.json({ ...bookingResult.rows[0], seats: seatsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: isPostgreSQL ? 'PostgreSQL' : 'SQLite',
    mode: isPostgreSQL ? 'production' : 'offline/local'
  });
});

// ==================== WEBSOCKET ====================
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join-event', (eventId) => socket.join(`event-${eventId}`));
  socket.on('leave-event', (eventId) => socket.leave(`event-${eventId}`));
  socket.on('seat-held', (data) => socket.to(`event-${data.eventId}`).emit('seat-update', data));
  socket.on('seat-released', (data) => socket.to(`event-${data.eventId}`).emit('seat-update', data));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// ==================== START SERVER ====================
async function startServer() {
  await initDatabase();
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Database: ${isPostgreSQL ? 'PostgreSQL' : 'SQLite'}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health\n`);
  });
}

startServer();

module.exports = { app, server, db, io };