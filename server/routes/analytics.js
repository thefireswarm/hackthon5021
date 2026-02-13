// ============================================================
// Analytics Routes – Engagement, attendance, focus, understanding
// ============================================================
const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// GET /api/analytics/:classId
router.get('/:classId', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const { classId } = req.params;

        // Get all enrolled students
        const studentsResult = db.exec(`
      SELECT u.id, u.name, u.email FROM users u
      JOIN enrollments e ON e.student_id = u.id
      WHERE e.class_id = ?
    `, [classId]);

        const students = [];
        if (studentsResult.length > 0) {
            const cols = studentsResult[0].columns;
            studentsResult[0].values.forEach(row => {
                const s = {};
                cols.forEach((col, i) => { s[col] = row[i]; });
                students.push(s);
            });
        }

        const analytics = students.map(student => {
            // Attendance (popup response rate)
            const popupResult = db.exec(
                'SELECT COUNT(*) as total, SUM(responded) as responded FROM popup_logs WHERE class_id = ? AND student_id = ?',
                [classId, student.id]
            );
            const totalPopups = popupResult.length > 0 ? popupResult[0].values[0][0] : 0;
            const respondedPopups = popupResult.length > 0 ? (popupResult[0].values[0][1] || 0) : 0;
            const attendanceScore = totalPopups > 0 ? respondedPopups / totalPopups : 1;

            // Understanding (question correctness)
            const questionResult = db.exec(`
        SELECT COUNT(*) as total,
        SUM(CASE WHEN o.is_correct = 1 THEN 1 ELSE 0 END) as correct
        FROM responses r
        JOIN options o ON o.id = r.option_id
        JOIN questions q ON q.id = r.question_id
        WHERE r.student_id = ? AND q.class_id = ?
      `, [student.id, classId]);
            const totalQuestions = questionResult.length > 0 ? questionResult[0].values[0][0] : 0;
            const correctAnswers = questionResult.length > 0 ? (questionResult[0].values[0][1] || 0) : 0;
            const understandingScore = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

            // Focus score (based on focus logs)
            const focusResult = db.exec(
                'SELECT SUM(duration) as total_focus FROM focus_logs WHERE student_id = ? AND class_id = ? AND event_type = ?',
                [student.id, classId, 'focus']
            );
            const blurResult = db.exec(
                'SELECT SUM(duration) as total_blur FROM focus_logs WHERE student_id = ? AND class_id = ? AND event_type = ?',
                [student.id, classId, 'blur']
            );
            const totalFocus = focusResult.length > 0 ? (focusResult[0].values[0][0] || 0) : 0;
            const totalBlur = blurResult.length > 0 ? (blurResult[0].values[0][0] || 0) : 0;
            const totalTime = totalFocus + totalBlur;
            const focusScore = totalTime > 0 ? totalFocus / totalTime : 1;

            // Engagement score (composite)
            const engagementScore = 0.5 * attendanceScore + 0.3 * focusScore + 0.2 * understandingScore;

            // Points
            const pointsResult = db.exec(
                'SELECT score FROM points WHERE student_id = ? AND class_id = ?',
                [student.id, classId]
            );
            const points = pointsResult.length > 0 && pointsResult[0].values.length > 0
                ? pointsResult[0].values[0][0] : 0;

            return {
                student: { id: student.id, name: student.name, email: student.email },
                attendanceScore: Math.round(attendanceScore * 100),
                understandingScore: Math.round(understandingScore * 100),
                focusScore: Math.round(focusScore * 100),
                engagementScore: Math.round(engagementScore * 100),
                isPresent: attendanceScore >= 0.8,
                points,
                totalPopups,
                respondedPopups,
                totalQuestions,
                correctAnswers
            };
        });

        // Class-level aggregates
        const totalStudents = analytics.length;
        const presentStudents = analytics.filter(a => a.isPresent).length;
        const avgEngagement = totalStudents > 0
            ? Math.round(analytics.reduce((sum, a) => sum + a.engagementScore, 0) / totalStudents) : 0;

        res.json({
            classId,
            summary: {
                totalStudents,
                presentStudents,
                absentStudents: totalStudents - presentStudents,
                avgEngagement,
                attendancePercentage: totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0
            },
            students: analytics
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/analytics/:classId/leaderboard
router.get('/:classId/leaderboard', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec(`
      SELECT p.score, u.name, u.id as student_id
      FROM points p
      JOIN users u ON u.id = p.student_id
      WHERE p.class_id = ?
      ORDER BY p.score DESC
    `, [req.params.classId]);

        const leaderboard = [];
        if (result.length > 0) {
            const cols = result[0].columns;
            result[0].values.forEach((row, idx) => {
                const entry = { rank: idx + 1 };
                cols.forEach((col, i) => { entry[col] = row[i]; });
                leaderboard.push(entry);
            });
        }

        res.json({ leaderboard });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
