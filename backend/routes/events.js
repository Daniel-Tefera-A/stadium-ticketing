const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Get all events
    router.get('/', (req, res) => {
        db.all('SELECT * FROM events ORDER BY date', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        });
    });

    // Get single event
    router.get('/:id', (req, res) => {
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
    router.post('/', (req, res) => {
        const { name, date, description, image_url, base_price } = req.body;
        
        if (!name || !date) {
            return res.status(400).json({ error: 'Name and date are required' });
        }

        db.run(
            'INSERT INTO events (name, date, description, image_url, base_price) VALUES (?, ?, ?, ?, ?)',
            [name, date, description, image_url || null, base_price || 0],
            function(err) {
                if (err) {
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

    // Delete event
    router.delete('/:id', (req, res) => {
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

    return router;
};