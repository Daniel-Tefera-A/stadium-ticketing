const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Get all seats for an event
    router.get('/event/:eventId', (req, res) => {
        const { eventId } = req.params;
        
        db.all(
            'SELECT * FROM seats WHERE event_id = ? ORDER BY row_number, seat_number',
            [eventId],
            (err, rows) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json(rows);
                }
            }
        );
    });

    // Generate default seats for an event
    router.post('/generate/:eventId', (req, res) => {
        const { eventId } = req.params;
        const { sections } = req.body; // e.g., [{ name: 'VIP', rows: 5, seatsPerRow: 10, price: 150 }]

        // First, check if seats already exist
        db.get('SELECT COUNT(*) as count FROM seats WHERE event_id = ?', [eventId], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (row.count > 0) {
                return res.status(400).json({ error: 'Seats already exist for this event' });
            }

            // Generate seats
            const stmt = db.prepare(
                'INSERT INTO seats (event_id, section, row_number, seat_number, price) VALUES (?, ?, ?, ?, ?)'
            );

            sections.forEach(section => {
                for (let row = 1; row <= section.rows; row++) {
                    for (let seat = 1; seat <= section.seatsPerRow; seat++) {
                        stmt.run(eventId, section.name, row, seat, section.price);
                    }
                }
            });

            stmt.finalize();
            res.json({ message: 'Seats generated successfully' });
        });
    });

    // Update seat status (hold/release/book)
    router.patch('/:seatId/status', (req, res) => {
        const { seatId } = req.params;
        const { status, heldUntil, bookingId } = req.body;

        let query = 'UPDATE seats SET status = ?';
        const params = [status];

        if (heldUntil) {
            query += ', held_until = ?';
            params.push(heldUntil);
        }

        if (bookingId) {
            query += ', booking_id = ?';
            params.push(bookingId);
        }

        query += ' WHERE id = ?';
        params.push(seatId);

        db.run(query, params, function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Seat not found' });
            } else {
                res.json({ message: 'Seat status updated successfully' });
            }
        });
    });

    // Update seat price (admin only)
    router.patch('/:seatId/price', (req, res) => {
        const { seatId } = req.params;
        const { price } = req.body;

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

    return router;
};