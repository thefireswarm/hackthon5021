// ============================================================
// Question Engine – Broadcast questions, collect answers, evaluate
// ============================================================
const { v4: uuidv4 } = require('uuid');
const { getDb, persist } = require('../db');

// Active questions: Map<questionId, { classId, deadline, timer }>
const activeQuestions = new Map();

/**
 * Broadcast a question to all students in a class.
 * Automatically closes after 60 seconds.
 */
function broadcastQuestion(io, questionId, classId, questionData) {
    const deadline = Date.now() + 60 * 1000; // 60 seconds

    const qEntry = {
        classId,
        deadline,
        questionId
    };

    // Send question to all students in the class
    io.to(`class:${classId}`).emit('question-popup', {
        questionId,
        text: questionData.text,
        options: questionData.options.map(o => ({ id: o.id, text: o.text })), // Don't send isCorrect
        deadline: 60
    });

    // Auto-close after 60 seconds
    qEntry.timer = setTimeout(() => {
        io.to(`class:${classId}`).emit('question-closed', { questionId });
        activeQuestions.delete(questionId);

        // Broadcast results to teacher
        getResultsForQuestion(questionId).then(results => {
            io.to(`class:${classId}`).emit('question-results', results);
        });
    }, 60 * 1000);

    activeQuestions.set(questionId, qEntry);
    console.log(`[Question] Broadcast question ${questionId} to class ${classId}`);
}

/**
 * Get results for a specific question.
 */
async function getResultsForQuestion(questionId) {
    const db = await getDb();

    // Get question info
    const qResult = db.exec('SELECT * FROM questions WHERE id = ?', [questionId]);
    if (qResult.length === 0) return null;

    const qCols = qResult[0].columns;
    const question = {};
    qCols.forEach((col, i) => { question[col] = qResult[0].values[0][i]; });

    // Get options
    const oResult = db.exec('SELECT * FROM options WHERE question_id = ?', [questionId]);
    question.options = [];
    if (oResult.length > 0) {
        const oCols = oResult[0].columns;
        question.options = oResult[0].values.map(row => {
            const opt = {};
            oCols.forEach((col, i) => { opt[col] = row[i]; });
            return opt;
        });
    }

    // Get responses with student names
    const rResult = db.exec(`
    SELECT r.*, u.name as student_name FROM responses r 
    JOIN users u ON u.id = r.student_id
    WHERE r.question_id = ?
  `, [questionId]);
    question.responses = [];
    if (rResult.length > 0) {
        const rCols = rResult[0].columns;
        question.responses = rResult[0].values.map(row => {
            const resp = {};
            rCols.forEach((col, i) => { resp[col] = row[i]; });
            return resp;
        });
    }

    // Calculate stats
    const total = question.responses.length;
    const correct = question.responses.filter(r => {
        const opt = question.options.find(o => o.id === r.option_id);
        return opt && opt.is_correct === 1;
    }).length;

    // Option distribution
    const distribution = {};
    question.options.forEach(opt => {
        distribution[opt.id] = {
            text: opt.text,
            count: question.responses.filter(r => r.option_id === opt.id).length,
            isCorrect: opt.is_correct === 1
        };
    });

    return {
        questionId,
        text: question.text,
        totalResponses: total,
        correctResponses: correct,
        correctPercentage: total > 0 ? Math.round((correct / total) * 100) : 0,
        distribution
    };
}

module.exports = {
    broadcastQuestion,
    getResultsForQuestion,
    activeQuestions
};
