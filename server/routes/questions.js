// ============================================================
// Questions Routes – Create question, submit response, get results
// ============================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, persist } = require('../db');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// POST /api/questions/create  (Teacher creates a question with options)
router.post('/create', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: 'Only teachers can create questions' });
        }

        const { classId, text, options } = req.body;
        // options: [{ text: string, isCorrect: boolean }]
        if (!classId || !text || !options || options.length < 2) {
            return res.status(400).json({ error: 'classId, text, and at least 2 options required' });
        }

        const db = await getDb();
        const questionId = uuidv4();

        db.run('INSERT INTO questions (id, class_id, text) VALUES (?, ?, ?)',
            [questionId, classId, text]);

        const optionItems = options.map(opt => {
            const optId = uuidv4();
            db.run('INSERT INTO options (id, question_id, text, is_correct) VALUES (?, ?, ?, ?)',
                [optId, questionId, opt.text, opt.isCorrect ? 1 : 0]);
            return { id: optId, text: opt.text, isCorrect: opt.isCorrect };
        });

        persist();

        res.status(201).json({
            id: questionId,
            classId,
            text,
            options: optionItems
        });
    } catch (err) {
        console.error('Create question error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/questions/respond  (Student answers a question)
router.post('/respond', authMiddleware, async (req, res) => {
    try {
        const { questionId, optionId, timeTaken } = req.body;
        if (!questionId || !optionId) {
            return res.status(400).json({ error: 'questionId and optionId required' });
        }

        const db = await getDb();
        const id = uuidv4();

        // Check if already responded
        const existing = db.exec(
            'SELECT id FROM responses WHERE student_id = ? AND question_id = ?',
            [req.user.id, questionId]
        );
        if (existing.length > 0 && existing[0].values.length > 0) {
            return res.status(409).json({ error: 'Already answered this question' });
        }

        db.run(
            'INSERT INTO responses (id, student_id, question_id, option_id, time_taken) VALUES (?, ?, ?, ?, ?)',
            [id, req.user.id, questionId, optionId, timeTaken || null]
        );

        // Award points for correct answer
        const optResult = db.exec('SELECT is_correct FROM options WHERE id = ?', [optionId]);
        if (optResult.length > 0 && optResult[0].values[0][0] === 1) {
            // Get class_id from question
            const qResult = db.exec('SELECT class_id FROM questions WHERE id = ?', [questionId]);
            if (qResult.length > 0) {
                const classId = qResult[0].values[0][0];
                const pointExists = db.exec(
                    'SELECT id, score FROM points WHERE student_id = ? AND class_id = ?',
                    [req.user.id, classId]
                );
                if (pointExists.length > 0 && pointExists[0].values.length > 0) {
                    db.run('UPDATE points SET score = score + 10 WHERE student_id = ? AND class_id = ?',
                        [req.user.id, classId]);
                } else {
                    db.run('INSERT INTO points (id, student_id, class_id, score) VALUES (?, ?, ?, 10)',
                        [uuidv4(), req.user.id, classId]);
                }
            }
        }

        persist();

        res.json({ message: 'Response recorded' });
    } catch (err) {
        console.error('Respond error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/questions/:classId/results  (Teacher views results)
router.get('/:classId/results', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const { classId } = req.params;

        // Get all questions for this class
        const qResult = db.exec('SELECT * FROM questions WHERE class_id = ?', [classId]);
        if (qResult.length === 0) {
            return res.json({ questions: [] });
        }

        const questions = [];
        const qCols = qResult[0].columns;

        for (const qRow of qResult[0].values) {
            const q = {};
            qCols.forEach((col, i) => { q[col] = qRow[i]; });

            // Get options
            const oResult = db.exec('SELECT * FROM options WHERE question_id = ?', [q.id]);
            q.options = [];
            if (oResult.length > 0) {
                const oCols = oResult[0].columns;
                q.options = oResult[0].values.map(oRow => {
                    const opt = {};
                    oCols.forEach((col, i) => { opt[col] = oRow[i]; });
                    return opt;
                });
            }

            // Get responses
            const rResult = db.exec(`
        SELECT r.*, u.name as student_name FROM responses r
        JOIN users u ON u.id = r.student_id
        WHERE r.question_id = ?
      `, [q.id]);
            q.responses = [];
            if (rResult.length > 0) {
                const rCols = rResult[0].columns;
                q.responses = rResult[0].values.map(rRow => {
                    const resp = {};
                    rCols.forEach((col, i) => { resp[col] = rRow[i]; });
                    return resp;
                });
            }

            // Calculate stats
            const totalResponses = q.responses.length;
            const correctResponses = q.responses.filter(r => {
                const opt = q.options.find(o => o.id === r.option_id);
                return opt && opt.is_correct === 1;
            }).length;

            q.stats = {
                totalResponses,
                correctResponses,
                correctPercentage: totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0
            };

            questions.push(q);
        }

        res.json({ questions });
    } catch (err) {
        console.error('Get results error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
