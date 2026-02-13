// ============================================================
// Classroom Routes – Create, Join, List
// ============================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, persist } = require('../db');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Generate a random 6-character class code
function generateClassCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/classroom/create  (Teacher only)
router.post('/create', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: 'Only teachers can create classes' });
        }

        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Class title is required' });
        }

        const db = await getDb();
        const id = uuidv4();
        const code = generateClassCode();

        db.run('INSERT INTO classes (id, teacher_id, title, code) VALUES (?, ?, ?, ?)',
            [id, req.user.id, title, code]);
        persist();

        res.status(201).json({ id, title, code, teacher_id: req.user.id });
    } catch (err) {
        console.error('Create class error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/classroom/join  (Student only)
router.post('/join', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ error: 'Only students can join classes' });
        }

        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Class code is required' });
        }

        const db = await getDb();
        const result = db.exec('SELECT * FROM classes WHERE code = ?', [code.toUpperCase()]);

        if (result.length === 0 || result[0].values.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const row = result[0].values[0];
        const cols = result[0].columns;
        const cls = {};
        cols.forEach((col, i) => { cls[col] = row[i]; });

        // Check if already enrolled
        const enrolled = db.exec(
            'SELECT id FROM enrollments WHERE class_id = ? AND student_id = ?',
            [cls.id, req.user.id]
        );
        if (enrolled.length > 0 && enrolled[0].values.length > 0) {
            return res.json({ message: 'Already enrolled', classId: cls.id, title: cls.title });
        }

        const enrollId = uuidv4();
        db.run('INSERT INTO enrollments (id, class_id, student_id) VALUES (?, ?, ?)',
            [enrollId, cls.id, req.user.id]);
        persist();

        res.status(201).json({ message: 'Enrolled successfully', classId: cls.id, title: cls.title });
    } catch (err) {
        console.error('Join class error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/classroom/list
router.get('/list', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        let result;

        if (req.user.role === 'teacher') {
            result = db.exec('SELECT * FROM classes WHERE teacher_id = ?', [req.user.id]);
        } else {
            result = db.exec(`
        SELECT c.* FROM classes c
        JOIN enrollments e ON e.class_id = c.id
        WHERE e.student_id = ?
      `, [req.user.id]);
        }

        const classes = [];
        if (result.length > 0) {
            const cols = result[0].columns;
            result[0].values.forEach(row => {
                const obj = {};
                cols.forEach((col, i) => { obj[col] = row[i]; });
                classes.push(obj);
            });
        }

        res.json({ classes });
    } catch (err) {
        console.error('List classes error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/classroom/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec('SELECT * FROM classes WHERE id = ?', [req.params.id]);

        if (result.length === 0 || result[0].values.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const cols = result[0].columns;
        const row = result[0].values[0];
        const cls = {};
        cols.forEach((col, i) => { cls[col] = row[i]; });

        // Get enrolled students
        const students = db.exec(`
      SELECT u.id, u.name, u.email FROM users u
      JOIN enrollments e ON e.student_id = u.id
      WHERE e.class_id = ?
    `, [req.params.id]);

        const studentList = [];
        if (students.length > 0) {
            const sCols = students[0].columns;
            students[0].values.forEach(r => {
                const obj = {};
                sCols.forEach((col, i) => { obj[col] = r[i]; });
                studentList.push(obj);
            });
        }

        res.json({ ...cls, students: studentList });
    } catch (err) {
        console.error('Get class error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
