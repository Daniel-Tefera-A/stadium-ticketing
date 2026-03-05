const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173","https://stadium-ticketing.vercel.app"
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = 3000;

// Middleware
app.use(cors({
  origin: "http://localhost:5173", "https://stadium-ticketing.vercel.app"
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    
    // Create tables
    createTables();
  }
});

// Create all tables
function createTables() {
  // Events table
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

  // Admins table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seats table
  db.run(`
    CREATE TABLE IF NOT EXISTS seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      section TEXT NOT NULL,
      row_number INTEGER NOT NULL,
      seat_number INTEGER NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'available',
      held_until DATETIME,
      booking_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings (id)
    )
  `);

  // Bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      total_amount DECIMAL(10,2) NOT NULL,
      booking_reference TEXT UNIQUE,
      status TEXT DEFAULT 'confirmed',
      payment_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events (id)
    )
  `);

  console.log('✅ Database tables created/verified');

  // Insert sample data if empty
  initializeSampleData();
}

// Initialize sample data
function initializeSampleData() {
  // Insert default admin if none exists
  db.get("SELECT COUNT(*) as count FROM admins", (err, row) => {
    if (err) {
      console.error('Error checking admins:', err);
      return;
    }
    
    if (row && row.count === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        ['admin', hashedPassword],
        (err) => {
          if (err) {
            console.error('Error creating admin:', err);
          } else {
            console.log('✅ Default admin created (username: admin, password: admin123)');
          }
        }
      );
    }
  });

  // Insert sample events if none exists
  db.get("SELECT COUNT(*) as count FROM events", (err, row) => {
    if (err) {
      console.error('Error checking events:', err);
      return;
    }
    
    if (row && row.count === 0) {
      const sampleEvents = [
        ['Summer Music Festival', '2024-06-15 18:00', 'Annual music festival with top artists', null, 50, 'Main Stadium'],
        ['International Football Match', '2024-06-20 20:00', 'Country A vs Country B - Championship Final', null, 75, 'Main Stadium'],
        ['Comedy Night', '2024-06-25 19:30', 'Stand-up comedy special with famous comedians', null, 35, 'Comedy Hall'],
        ['Rock Concert', '2024-07-01 20:00', 'Best rock bands of the decade', null, 65, 'Main Stadium'],
        ['Theater Play', '2024-07-05 19:00', 'Shakespeare\'s Hamlet', null, 45, 'Theater Hall']
      ];
      
      const stmt = db.prepare('INSERT INTO events (name, date, description, image_url, base_price, venue) VALUES (?, ?, ?, ?, ?, ?)');
      sampleEvents.forEach(event => stmt.run(event));
      stmt.finalize();
      console.log('✅ Sample events added');
    }
  });
}

// ==================== ROUTES ====================

// ===== EVENTS ROUTES =====
// Get all events
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date', (err, rows) => {
    if (err) {
      console.error('Error fetching events:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get single event
app.get('/api/events/:id', (req, res) => {
  db.get('SELECT * FROM events WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Event not found' });
    } else {
      res.json(row);
    }
  });
});

// Create event
app.post('/api/events', (req, res) => {
  const { name, date, description, image_url, base_price, venue } = req.body;
  
  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  db.run(
    'INSERT INTO events (name, date, description, image_url, base_price, venue) VALUES (?, ?, ?, ?, ?, ?)',
    [name, date, description, image_url || null, base_price || 0, venue || 'Main Stadium'],
    function(err) {
      if (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ error: err.message });
      } else {
        res.status(201).json({ 
          id: this.lastID,
          message: 'Event created successfully' 
        });
      }
    }
  );
});

// Update event
app.put('/api/events/:id', (req, res) => {
  const { name, date, description, image_url, base_price, venue } = req.body;
  
  db.run(
    'UPDATE events SET name = ?, date = ?, description = ?, image_url = ?, base_price = ?, venue = ? WHERE id = ?',
    [name, date, description, image_url, base_price, venue, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Event not found' });
      } else {
        res.json({ message: 'Event updated successfully' });
      }
    }
  );
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  db.run('DELETE FROM events WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Event not found' });
    } else {
      res.json({ message: 'Event deleted successfully' });
    }
  });
});

// ===== ADMIN ROUTES =====
// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
    } else {
      const validPassword = bcrypt.compareSync(password, admin.password_hash);
      if (validPassword) {
        res.json({ 
          success: true, 
          message: 'Login successful',
          admin: { id: admin.id, username: admin.username }
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    }
  });
});

// ===== SEATS ROUTES =====
// Get all seats for an event
app.get('/api/seats/event/:eventId', (req, res) => {
  const { eventId } = req.params;
  
  db.all(
    'SELECT * FROM seats WHERE event_id = ? ORDER BY section, row_number, seat_number',
    [eventId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching seats:', err);
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

// Generate default seats for an event
app.post('/api/seats/generate/:eventId', (req, res) => {
  const { eventId } = req.params;
  const { sections } = req.body;

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({ error: 'Sections array is required' });
  }

  // First, check if seats already exist
  db.get('SELECT COUNT(*) as count FROM seats WHERE event_id = ?', [eventId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (row && row.count > 0) {
      // Delete existing seats first (optional - you might want to keep this)
      db.run('DELETE FROM seats WHERE event_id = ?', [eventId], (delErr) => {
        if (delErr) {
          return res.status(500).json({ error: delErr.message });
        }
        insertSeats();
      });
    } else {
      insertSeats();
    }
  });

  function insertSeats() {
    const stmt = db.prepare(
      'INSERT INTO seats (event_id, section, row_number, seat_number, price) VALUES (?, ?, ?, ?, ?)'
    );

    sections.forEach(section => {
      if (!section.name || !section.rows || !section.seatsPerRow || !section.price) {
        return res.status(400).json({ error: 'Invalid section data' });
      }

      for (let row = 1; row <= section.rows; row++) {
        for (let seat = 1; seat <= section.seatsPerRow; seat++) {
          stmt.run(eventId, section.name, row, seat, section.price);
        }
      }
    });

    stmt.finalize((err) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        // Emit event that seats were generated
        io.to(`event-${eventId}`).emit('seats-generated', { eventId });
        res.json({ 
          message: 'Seats generated successfully',
          totalSeats: sections.reduce((sum, s) => sum + (s.rows * s.seatsPerRow), 0)
        });
      }
    });
  }
});

// Update seat status (hold/release/book)
app.patch('/api/seats/:seatId/status', (req, res) => {
  const { seatId } = req.params;
  const { status, heldUntil, bookingId, eventId } = req.body;

  let query = 'UPDATE seats SET status = ?';
  const params = [status];

  if (heldUntil !== undefined) {
    query += ', held_until = ?';
    params.push(heldUntil);
  }

  if (bookingId !== undefined) {
    query += ', booking_id = ?';
    params.push(bookingId);
  }

  query += ' WHERE id = ?';
  params.push(seatId);

  db.run(query, params, function(err) {
    if (err) {
      console.error('Error updating seat status:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Seat not found' });
    } else {
      // Get the updated seat to return
      db.get('SELECT * FROM seats WHERE id = ?', [seatId], (err, seat) => {
        if (!err && seat) {
          // Emit update to all clients in the event room
          io.to(`event-${eventId || seat.event_id}`).emit('seat-update', {
            seatId: parseInt(seatId),
            status,
            heldUntil,
            seat: seat
          });
        }
      });
      
      res.json({ 
        message: 'Seat status updated successfully',
        seatId: parseInt(seatId)
      });
    }
  });
});

// Update seat price
app.patch('/api/seats/:seatId/price', (req, res) => {
  const { seatId } = req.params;
  const { price } = req.body;

  if (!price || price < 0) {
    return res.status(400).json({ error: 'Valid price is required' });
  }

  db.run(
    'UPDATE seats SET price = ? WHERE id = ?',
    [price, seatId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Seat not found' });
      } else {
        res.json({ message: 'Seat price updated successfully' });
      }
    }
  );
});

// Bulk update seat prices by section
app.patch('/api/seats/event/:eventId/section/:section/price', (req, res) => {
  const { eventId, section } = req.params;
  const { price } = req.body;

  db.run(
    'UPDATE seats SET price = ? WHERE event_id = ? AND section = ?',
    [price, eventId, section],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ 
          message: 'Section prices updated successfully',
          affectedRows: this.changes
        });
      }
    }
  );
});

// ===== BOOKINGS ROUTES =====
// Create a booking
app.post('/api/bookings', (req, res) => {
  const { eventId, customerName, customerEmail, customerPhone, seats } = req.body;
  
  if (!eventId || !customerName || !customerEmail || !seats || seats.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate unique booking reference
  const bookingRef = 'BK' + Date.now().toString(36).toUpperCase();

  // Calculate total amount
  const totalAmount = seats.reduce((sum, seat) => sum + seat.price, 0);

  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Insert booking
    db.run(
      'INSERT INTO bookings (event_id, customer_name, customer_email, customer_phone, total_amount, booking_reference) VALUES (?, ?, ?, ?, ?, ?)',
      [eventId, customerName, customerEmail, customerPhone, totalAmount, bookingRef],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          console.error('Error creating booking:', err);
          return res.status(500).json({ error: err.message });
        }

        const bookingId = this.lastID;

        // Update seats with booking ID
        const seatStmt = db.prepare(
          'UPDATE seats SET status = ?, booking_id = ?, held_until = NULL WHERE id = ?'
        );

        let success = true;
        seats.forEach(seat => {
          seatStmt.run('booked', bookingId, seat.id, (err) => {
            if (err) success = false;
          });
        });

        seatStmt.finalize();

        if (!success) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update seats' });
        }

        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

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
        });
      }
    );
  });
});

// Get booking by reference
app.get('/api/bookings/:reference', (req, res) => {
  db.get(`
    SELECT b.*, e.name as event_name, e.date as event_date 
    FROM bookings b
    JOIN events e ON b.event_id = e.id
    WHERE b.booking_reference = ?
  `, [req.params.reference], (err, booking) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
    } else {
      // Get seats for this booking
      db.all('SELECT * FROM seats WHERE booking_id = ?', [booking.id], (err, seats) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ ...booking, seats });
        }
      });
    }
  });
});

// Get all bookings for an event (admin)
app.get('/api/bookings/event/:eventId', (req, res) => {
  db.all(`
    SELECT b.*, COUNT(s.id) as seat_count 
    FROM bookings b
    LEFT JOIN seats s ON b.id = s.booking_id
    WHERE b.event_id = ?
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `, [req.params.eventId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Cancel booking
app.patch('/api/bookings/:id/cancel', (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update booking status
    db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', id], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }

      // Release all seats for this booking
      db.run('UPDATE seats SET status = ?, booking_id = NULL WHERE booking_id = ?', ['available', id], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          res.json({ message: 'Booking cancelled successfully' });
        });
      });
    });
  });
});

// ===== STATS ROUTES =====
// Get dashboard stats (admin)
app.get('/api/stats', (req, res) => {
  const stats = {};

  db.serialize(() => {
    // Total events
    db.get('SELECT COUNT(*) as total FROM events', (err, row) => {
      stats.totalEvents = row ? row.total : 0;
    });

    // Upcoming events
    db.get('SELECT COUNT(*) as upcoming FROM events WHERE date > datetime("now")', (err, row) => {
      stats.upcomingEvents = row ? row.upcoming : 0;
    });

    // Total bookings
    db.get('SELECT COUNT(*) as total, SUM(total_amount) as revenue FROM bookings', (err, row) => {
      stats.totalBookings = row ? row.total : 0;
      stats.totalRevenue = row ? row.revenue || 0 : 0;
    });

    // Total seats
    db.get('SELECT COUNT(*) as total FROM seats', (err, row) => {
      stats.totalSeats = row ? row.total : 0;
    });

    // Booked seats
    db.get('SELECT COUNT(*) as booked FROM seats WHERE status = "booked"', (err, row) => {
      stats.bookedSeats = row ? row.booked : 0;
      
      // Send response after last query
      res.json(stats);
    });
  });
});

// ==================== WEBSOCKET ====================

// WebSocket connection handling
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
    // Broadcast to all others in the room that seat is held
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: db.open ? 'connected' : 'disconnected'
  });
});

// ==================== START SERVER ====================

server.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server running`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = { app, server, db, io };