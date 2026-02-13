// ============================================================
// Analytics Engine – Compute composite scores
// ============================================================
const { getDb } = require('../db');

/**
 * Calculate engagement score for a student in a class.
 * engagement = 0.5 * attendance + 0.3 * focus + 0.2 * understanding
 */
async function calculateEngagement(studentId, classId) {
    const db = await getDb();

    // Attendance score
    const popupResult = db.exec(
        'SELECT COUNT(*) as total, SUM(responded) as responded FROM popup_logs WHERE class_id = ? AND student_id = ?',
        [classId, studentId]
    );
    const totalPopups = popupResult.length > 0 ? popupResult[0].values[0][0] : 0;
    const respondedPopups = popupResult.length > 0 ? (popupResult[0].values[0][1] || 0) : 0;
    const attendance = totalPopups > 0 ? respondedPopups / totalPopups : 1;

    // Understanding score
    const qResult = db.exec(`
    SELECT COUNT(*) as total,
    SUM(CASE WHEN o.is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM responses r
    JOIN options o ON o.id = r.option_id
    JOIN questions q ON q.id = r.question_id
    WHERE r.student_id = ? AND q.class_id = ?
  `, [studentId, classId]);
    const totalQ = qResult.length > 0 ? qResult[0].values[0][0] : 0;
    const correctQ = qResult.length > 0 ? (qResult[0].values[0][1] || 0) : 0;
    const understanding = totalQ > 0 ? correctQ / totalQ : 0;

    // Focus score
    const focusR = db.exec(
        'SELECT SUM(duration) FROM focus_logs WHERE student_id = ? AND class_id = ? AND event_type = ?',
        [studentId, classId, 'focus']
    );
    const blurR = db.exec(
        'SELECT SUM(duration) FROM focus_logs WHERE student_id = ? AND class_id = ? AND event_type = ?',
        [studentId, classId, 'blur']
    );
    const focusTime = focusR.length > 0 ? (focusR[0].values[0][0] || 0) : 0;
    const blurTime = blurR.length > 0 ? (blurR[0].values[0][0] || 0) : 0;
    const totalTime = focusTime + blurTime;
    const focus = totalTime > 0 ? focusTime / totalTime : 1;

    const engagement = 0.5 * attendance + 0.3 * focus + 0.2 * understanding;

    return {
        attendance: Math.round(attendance * 100),
        understanding: Math.round(understanding * 100),
        focus: Math.round(focus * 100),
        engagement: Math.round(engagement * 100),
        isPresent: attendance >= 0.8
    };
}

module.exports = { calculateEngagement };
