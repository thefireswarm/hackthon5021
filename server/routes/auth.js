// ============================================================
// Authentication Routes – Register & Login
// ============================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb, persist } = require('../db');
const { JWT_SECRET } = require('../middlewares/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (!['teacher', 'student'].includes(role)) {
            return res.status(400).json({ error: 'Role must be teacher or student' });
        }

        const db = await getDb();

        // Check if email already exists
        const existing = db.exec('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0 && existing[0].values.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const id = uuidv4();
        const password_hash = await bcrypt.hash(password, 10);

        db.run('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [id, name, email, password_hash, role]);
        persist();

        const token = jwt.sign({ id, email, role, name }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id, name, email, role }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const db = await getDb();
        const result = db.exec('SELECT * FROM users WHERE email = ?', [email]);

        if (result.length === 0 || result[0].values.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const row = result[0].values[0];
        const cols = result[0].columns;
        const user = {};
        cols.forEach((col, i) => { user[col] = row[i]; });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
