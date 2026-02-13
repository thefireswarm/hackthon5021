import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/userSlice';
import { setClasses } from '../store/classroomSlice';
import axios from 'axios';

export default function Home() {
    const { user, token } = useSelector(s => s.user);
    const { classes } = useSelector(s => s.classroom);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/classroom/list', { headers });
            dispatch(setClasses(res.data.classes));
        } catch (err) {
            console.error('Failed to fetch classes:', err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true); setError(''); setSuccess('');
        try {
            const res = await axios.post('/api/classroom/create', { title }, { headers });
            setSuccess(`Class created! Code: ${res.data.code}`);
            setTitle('');
            fetchClasses();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create class');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setLoading(true); setError(''); setSuccess('');
        try {
            const res = await axios.post('/api/classroom/join', { code }, { headers });
            setSuccess(`Joined class: ${res.data.title}`);
            setCode('');
            fetchClasses();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to join class');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
            {/* Header */}
            <header className="border-b" style={{ borderColor: 'var(--border)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)' }}>
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-lg">🎓</span>
                        </div>
                        <span className="text-lg font-bold text-white">Remote Classroom</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-white">{user?.name}</p>
                            <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
                                {user?.role === 'teacher' ? '👨‍🏫 Teacher' : '🎒 Student'}
                            </p>
                        </div>
                        <button onClick={() => dispatch(logout())} className="btn btn-ghost text-sm">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Messages */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl animate-shake" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 rounded-xl animate-fade-in" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7' }}>
                        {success}
                    </div>
                )}

                {/* Action Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    {/* Create Class (Teacher) */}
                    {user?.role === 'teacher' && (
                        <div className="glass-card p-6 animate-fade-in">
                            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>➕</span>
                                Create a Class
                            </h2>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Start a new virtual classroom</p>
                            <form onSubmit={handleCreate} className="flex gap-3">
                                <input
                                    type="text"
                                    className="input flex-1"
                                    placeholder="e.g. Physics 101"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                                <button className="btn btn-primary" disabled={loading}>Create</button>
                            </form>
                        </div>
                    )}

                    {/* Join Class (Student) */}
                    {user?.role === 'student' && (
                        <div className="glass-card p-6 animate-fade-in">
                            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>🔗</span>
                                Join a Class
                            </h2>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Enter your class code</p>
                            <form onSubmit={handleJoin} className="flex gap-3">
                                <input
                                    type="text"
                                    className="input flex-1 uppercase"
                                    placeholder="e.g. ABC123"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    required
                                />
                                <button className="btn btn-primary" disabled={loading}>Join</button>
                            </form>
                        </div>
                    )}
                </div>

                {/* My Classes */}
                <h2 className="text-xl font-bold text-white mb-4">
                    {user?.role === 'teacher' ? '📚 My Classes' : '📚 Enrolled Classes'}
                </h2>

                {classes.length === 0 ? (
                    <div className="glass-card p-10 text-center">
                        <p className="text-4xl mb-3">📭</p>
                        <p style={{ color: 'var(--text-secondary)' }}>No classes yet.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.map((cls, i) => (
                            <div
                                key={cls.id}
                                className="glass-card p-5 cursor-pointer hover:scale-[1.02] transition-transform animate-fade-in"
                                style={{ animationDelay: `${i * 0.1}s` }}
                                onClick={() => navigate(`/classroom/${cls.id}`)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                                        📖
                                    </div>
                                    {user?.role === 'teacher' && (
                                        <span className="px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                                            {cls.code}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-semibold text-white mb-1">{cls.title}</h3>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Click to enter classroom</p>

                                <div className="mt-3 flex gap-2">
                                    <button
                                        className="btn btn-primary flex-1 text-xs py-2"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/classroom/${cls.id}`); }}
                                    >
                                        🎥 Enter Class
                                    </button>
                                    {user?.role === 'teacher' && (
                                        <button
                                            className="btn btn-ghost text-xs py-2"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/${cls.id}`); }}
                                        >
                                            📊 Dashboard
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
