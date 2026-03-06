const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // Create tables in order
    console.log('Creating tables...');
    
    // Events table
    await pool.query(`
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
    console.log('✅ Events table ready');

    // Admins table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admins table ready');

    // Bookings table
    await pool.query(`
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
    console.log('✅ Bookings table ready');

    // Seats table
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, section, row_number, seat_number)
      )
    `);
    console.log('✅ Seats table ready');

    // Create indexes for performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_seats_event ON seats(event_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(customer_email)`);
    console.log('✅ Indexes created');

    // Check and insert sample data
    console.log('Checking for sample data...');

    // Insert default admin if not exists
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admins WHERE username = $1', ['admin']);
    if (parseInt(adminCheck.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('✅ Default admin created (admin/admin123)');
    }

    // Insert sample events if none exist
    const eventsCheck = await pool.query('SELECT COUNT(*) FROM events');
    if (parseInt(eventsCheck.rows[0].count) === 0) {
      const sampleEvents = [
        ['Summer Music Festival', '2024-06-15 18:00:00', 'Annual music festival with top artists', null, 50, 'Main Stadium'],
        ['International Football Match', '2024-06-20 20:00:00', 'Country A vs Country B - Championship Final', null, 75, 'Main Stadium'],
        ['Comedy Night', '2024-06-25 19:30:00', 'Stand-up comedy special with famous comedians', null, 35, 'Comedy Hall'],
        ['Rock Concert', '2024-07-01 20:00:00', 'Best rock bands of the decade', null, 65, 'Main Stadium'],
        ['Theater Play', '2024-07-05 19:00:00', 'Shakespeare\'s Hamlet', null, 45, 'Theater Hall']
      ];

      for (const event of sampleEvents) {
        await pool.query(
          'INSERT INTO events (name, date, description, image_url, base_price, venue) VALUES ($1, $2, $3, $4, $5, $6)',
          event
        );
      }
      console.log('✅ Sample events added');
    }

    console.log('\n🎉 Database initialization completed successfully!\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization
initializeDatabase();