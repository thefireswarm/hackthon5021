import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearActiveQuestion } from '../store/classroomSlice';
import axios from 'axios';

export default function QuestionModal({ classId }) {
    const { activeQuestion } = useSelector(s => s.classroom);
    const { token } = useSelector(s => s.user);
    const dispatch = useDispatch();

    const [selectedOption, setSelectedOption] = useState(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [submitted, setSubmitted] = useState(false);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    useEffect(() => {
        if (!activeQuestion) return;
        setTimeLeft(activeQuestion.deadline || 60);
        setSelectedOption(null);
        setSubmitted(false);
        startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    dispatch(clearActiveQuestion());
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [activeQuestion]);

    const handleSubmit = async () => {
        if (!selectedOption || submitted) return;
        setSubmitted(true);
        clearInterval(timerRef.current);

        const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

        try {
            await axios.post('/api/questions/respond', {
                questionId: activeQuestion.questionId,
                optionId: selectedOption,
                timeTaken
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to submit answer:', err);
        }

        setTimeout(() => dispatch(clearActiveQuestion()), 2000);
    };

    if (!activeQuestion) return null;

    const progressPct = (timeLeft / (activeQuestion.deadline || 60)) * 100;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="glass-card p-6 max-w-lg w-full mx-4 animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        🧠 Quick Check
                    </h2>
                    <span className={`text-lg font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                        ⏱ {timeLeft}s
                    </span>
                </div>

                {/* Timer bar */}
                <div className="w-full h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: 'var(--bg-dark)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${progressPct}%`,
                            background: progressPct > 50 ? 'var(--primary)' : progressPct > 25 ? 'var(--warning)' : 'var(--danger)'
                        }}
                    />
                </div>

                {/* Question */}
                <p className="text-white text-base mb-5">{activeQuestion.text}</p>

                {/* Options */}
                <div className="space-y-3 mb-5">
                    {activeQuestion.options?.map((opt, idx) => (
                        <button
                            key={opt.id}
                            onClick={() => !submitted && setSelectedOption(opt.id)}
                            className="w-full text-left p-3.5 rounded-xl transition-all"
                            disabled={submitted}
                            style={{
                                background: selectedOption === opt.id
                                    ? 'rgba(99, 102, 241, 0.25)'
                                    : 'var(--bg-dark)',
                                border: selectedOption === opt.id
                                    ? '2px solid var(--primary)'
                                    : '1px solid var(--border)',
                                color: selectedOption === opt.id ? '#c7d2fe' : 'var(--text-primary)'
                            }}
                        >
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg mr-3 text-sm font-bold" style={{
                                background: selectedOption === opt.id ? 'var(--primary)' : 'var(--bg-elevated)',
                                color: 'white'
                            }}>
                                {String.fromCharCode(65 + idx)}
                            </span>
                            {opt.text}
                        </button>
                    ))}
                </div>

                {/* Submit */}
                {!submitted ? (
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary w-full py-3"
                        disabled={!selectedOption}
                    >
                        Submit Answer
                    </button>
                ) : (
                    <div className="text-center p-3 rounded-xl animate-fade-in" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
                        ✅ Answer submitted!
                    </div>
                )}
            </div>
        </div>
    );
}
