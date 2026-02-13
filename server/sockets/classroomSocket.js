// ============================================================
// Classroom Socket Handler – WebRTC signaling, chat, engagement
// ============================================================
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');
const { v4: uuidv4 } = require('uuid');
const { getDb, persist } = require('../db');
const engagement = require('../services/engagementEngine');
const questionEngine = require('../services/questionEngine');

// Track online users per class: Map<classId, Map<socketId, { userId, userName, role }>>
const classRooms = new Map();

function setupClassroomSocket(io) {
    // JWT authentication middleware for Socket.IO
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.user.name} (${socket.user.role})`);

        // ── Join Classroom ──────────────────────────────
        socket.on('join-room', ({ classId }) => {
            socket.join(`class:${classId}`);
            socket.classId = classId;

            if (!classRooms.has(classId)) {
                classRooms.set(classId, new Map());
            }

            classRooms.get(classId).set(socket.id, {
                userId: socket.user.id,
                userName: socket.user.name,
                role: socket.user.role
            });

            // Track student for engagement
            if (socket.user.role === 'student') {
                engagement.addStudent(classId, socket.id, socket.user.id);
            }

            // Notify all participants
            const participants = Array.from(classRooms.get(classId).values());
            io.to(`class:${classId}`).emit('participants-update', participants);

            // Notify others that a new user joined (for WebRTC)
            socket.to(`class:${classId}`).emit('user-joined', {
                socketId: socket.id,
                userId: socket.user.id,
                userName: socket.user.name,
                role: socket.user.role
            });

            console.log(`[Socket] ${socket.user.name} joined class ${classId}`);
        });

        // ── Leave Classroom ─────────────────────────────
        socket.on('leave-room', () => {
            handleLeave(socket, io);
        });

        // ── Chat Message ────────────────────────────────
        socket.on('chat-message', ({ classId, message }) => {
            io.to(`class:${classId}`).emit('chat-message', {
                id: uuidv4(),
                userId: socket.user.id,
                userName: socket.user.name,
                role: socket.user.role,
                message,
                timestamp: Date.now()
            });
        });

        // ── Raise Hand ──────────────────────────────────
        socket.on('raise-hand', ({ classId }) => {
            io.to(`class:${classId}`).emit('hand-raised', {
                userId: socket.user.id,
                userName: socket.user.name
            });
        });

        // ── WebRTC Signaling ────────────────────────────
        socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
            io.to(targetSocketId).emit('webrtc-offer', {
                senderSocketId: socket.id,
                userId: socket.user.id,
                userName: socket.user.name,
                offer
            });
        });

        socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
            io.to(targetSocketId).emit('webrtc-answer', {
                senderSocketId: socket.id,
                answer
            });
        });

        socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit('webrtc-ice-candidate', {
                senderSocketId: socket.id,
                candidate
            });
        });

        // ── Engagement Popup Response ───────────────────
        socket.on('popup-response', async ({ classId }) => {
            await engagement.recordPopupResponse(classId, socket.user.id);
        });

        // ── Start Engagement (Teacher) ──────────────────
        socket.on('start-engagement', ({ classId }) => {
            if (socket.user.role === 'teacher') {
                engagement.startEngagement(io, classId);
            }
        });

        // ── Broadcast Question (Teacher) ────────────────
        socket.on('broadcast-question', async ({ questionId, classId }) => {
            if (socket.user.role !== 'teacher') return;

            const db = await getDb();
            const qResult = db.exec('SELECT * FROM questions WHERE id = ?', [questionId]);
            if (qResult.length === 0) return;

            const qCols = qResult[0].columns;
            const q = {};
            qCols.forEach((col, i) => { q[col] = qResult[0].values[0][i]; });

            const oResult = db.exec('SELECT * FROM options WHERE question_id = ?', [questionId]);
            q.options = [];
            if (oResult.length > 0) {
                const oCols = oResult[0].columns;
                q.options = oResult[0].values.map(row => {
                    const opt = {};
                    oCols.forEach((col, i) => { opt[col] = row[i]; });
                    return opt;
                });
            }

            questionEngine.broadcastQuestion(io, questionId, classId, q);
        });

        // ── Focus/Tab Tracking ──────────────────────────
        socket.on('focus-event', async ({ classId, eventType, duration }) => {
            const db = await getDb();
            db.run(
                'INSERT INTO focus_logs (id, student_id, class_id, duration, event_type) VALUES (?, ?, ?, ?, ?)',
                [uuidv4(), socket.user.id, classId, duration || 0, eventType]
            );
            persist();
        });

        // ── Screen Share ────────────────────────────────
        socket.on('screen-share-start', ({ classId }) => {
            socket.to(`class:${classId}`).emit('screen-share-started', {
                userId: socket.user.id,
                userName: socket.user.name,
                socketId: socket.id
            });
        });

        socket.on('screen-share-stop', ({ classId }) => {
            socket.to(`class:${classId}`).emit('screen-share-stopped', {
                userId: socket.user.id
            });
        });

        // ── Disconnect ──────────────────────────────────
        socket.on('disconnect', () => {
            handleLeave(socket, io);
            console.log(`[Socket] User disconnected: ${socket.user.name}`);
        });
    });
}

function handleLeave(socket, io) {
    const classId = socket.classId;
    if (!classId) return;

    socket.leave(`class:${classId}`);

    // Remove from classroom
    if (classRooms.has(classId)) {
        classRooms.get(classId).delete(socket.id);
        const participants = Array.from(classRooms.get(classId).values());
        io.to(`class:${classId}`).emit('participants-update', participants);

        // Notify others for WebRTC cleanup
        socket.to(`class:${classId}`).emit('user-left', {
            socketId: socket.id,
            userId: socket.user.id
        });

        // Clean up empty rooms
        if (classRooms.get(classId).size === 0) {
            classRooms.delete(classId);
            engagement.stopEngagement(classId);
        }
    }

    // Remove from engagement tracking
    engagement.removeStudent(classId, socket.id);
    socket.classId = null;
}

module.exports = { setupClassroomSocket };
