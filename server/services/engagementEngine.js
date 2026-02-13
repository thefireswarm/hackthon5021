// ============================================================
// Engagement Engine – Random popup scheduling & tracking
// ============================================================
const { v4: uuidv4 } = require('uuid');
const { getDb, persist } = require('../db');

// Active class sessions: Map<classId, { interval, students: Set<socketId> }>
const activeSessions = new Map();

/**
 * Start engagement tracking for a class.
 * Schedules random popups every 3–7 minutes.
 */
function startEngagement(io, classId) {
    if (activeSessions.has(classId)) return;

    const session = { students: new Map(), popupCount: 0 };
    activeSessions.set(classId, session);

    // Schedule next popup
    function scheduleNextPopup() {
        const delay = (Math.floor(Math.random() * 5) + 3) * 60 * 1000; // 3–7 min
        session.timeout = setTimeout(async () => {
            session.popupCount++;
            const popupId = uuidv4();

            // Log popup for all students in this class
            const db = await getDb();
            for (const [socketId, studentId] of session.students) {
                db.run(
                    'INSERT INTO popup_logs (id, class_id, student_id, responded, timestamp) VALUES (?, ?, ?, 0, datetime(\'now\'))',
                    [uuidv4(), classId, studentId]
                );
            }
            persist();

            // Emit popup event to all students in the class room
            io.to(`class:${classId}`).emit('engagement-popup', {
                popupId,
                classId,
                timestamp: Date.now(),
                deadline: 15 // seconds to respond
            });

            // Schedule next
            scheduleNextPopup();
        }, delay);
    }

    scheduleNextPopup();
    console.log(`[Engagement] Started for class ${classId}`);
}

/**
 * Record a student's popup response.
 */
async function recordPopupResponse(classId, studentId) {
    const db = await getDb();
    // Update the latest unresponded popup for this student
    db.run(`
    UPDATE popup_logs SET responded = 1
    WHERE class_id = ? AND student_id = ? AND responded = 0
    ORDER BY timestamp DESC LIMIT 1
  `, [classId, studentId]);
    persist();
}

/**
 * Register a student in an active session.
 */
function addStudent(classId, socketId, studentId) {
    const session = activeSessions.get(classId);
    if (session) {
        session.students.set(socketId, studentId);
    }
}

/**
 * Remove a student from an active session.
 */
function removeStudent(classId, socketId) {
    const session = activeSessions.get(classId);
    if (session) {
        session.students.delete(socketId);
    }
}

/**
 * Stop engagement tracking for a class.
 */
function stopEngagement(classId) {
    const session = activeSessions.get(classId);
    if (session) {
        clearTimeout(session.timeout);
        activeSessions.delete(classId);
        console.log(`[Engagement] Stopped for class ${classId}`);
    }
}

/**
 * Get attendance score for a student in a class.
 */
async function getAttendanceScore(classId, studentId) {
    const db = await getDb();
    const result = db.exec(
        'SELECT COUNT(*) as total, SUM(responded) as responded FROM popup_logs WHERE class_id = ? AND student_id = ?',
        [classId, studentId]
    );
    if (result.length === 0) return { score: 1, total: 0, responded: 0 };
    const total = result[0].values[0][0];
    const responded = result[0].values[0][1] || 0;
    return {
        score: total > 0 ? responded / total : 1,
        total,
        responded
    };
}

module.exports = {
    startEngagement,
    stopEngagement,
    recordPopupResponse,
    addStudent,
    removeStudent,
    getAttendanceScore
};
