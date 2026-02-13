import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearPopup } from '../store/classroomSlice';

export default function PopupCheck({ socket, classId }) {
    const { popup } = useSelector(s => s.classroom);
    const dispatch = useDispatch();
    const [timeLeft, setTimeLeft] = useState(15);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!popup) return;
        setTimeLeft(popup.deadline || 15);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    dispatch(clearPopup());
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [popup]);

    const handleRespond = () => {
        if (socket) {
            socket.emit('popup-response', { classId });
        }
        clearInterval(timerRef.current);
        dispatch(clearPopup());
    };

    if (!popup) return null;

    const progressPct = (timeLeft / (popup.deadline || 15)) * 100;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="glass-card p-8 max-w-sm w-full mx-4 animate-slide-up text-center">
                {/* Animated icon */}
                <div className="animate-pulse-glow inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
                    <span className="text-4xl">👋</span>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">Are you still here?</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Click the button to confirm your attendance
                </p>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--bg-dark)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${progressPct}%`,
                            background: progressPct > 50
                                ? 'linear-gradient(90deg, var(--success), #34d399)'
                                : progressPct > 25
                                    ? 'linear-gradient(90deg, var(--warning), #fbbf24)'
                                    : 'linear-gradient(90deg, var(--danger), #f87171)'
                        }}
                    />
                </div>

                <p className="text-2xl font-bold mb-4" style={{ color: timeLeft <= 5 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {timeLeft}s
                </p>

                <button
                    onClick={handleRespond}
                    className="btn btn-success w-full py-3 text-base"
                >
                    ✅ I'm Here!
                </button>
            </div>
        </div>
    );
}
