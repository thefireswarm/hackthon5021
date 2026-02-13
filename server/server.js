// ============================================================
// Server Entry Point
// ============================================================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');
const { setupClassroomSocket } = require('./sockets/classroomSocket');

// ── Express App ─────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.IO ───────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// ── Middleware ───────────────────────────────────────
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    credentials: true
}));
app.use(express.json());

// ── API Routes ──────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classroom', require('./routes/classroom'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/analytics', require('./routes/analytics'));

// ── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Initialize ──────────────────────────────────────
async function start() {
    await getDb(); // Initialize database
    setupClassroomSocket(io); // Setup socket handlers

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════╗
║       Remote Classroom Platform - Server         ║
║──────────────────────────────────────────────────║
║   🌐  HTTP:   http://localhost:${PORT}              ║
║   🔌  WS:     ws://localhost:${PORT}                ║
║   📊  Health: http://localhost:${PORT}/api/health    ║
╚══════════════════════════════════════════════════╝
    `);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
