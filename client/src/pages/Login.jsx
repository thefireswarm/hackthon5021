import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/userSlice';
import axios from 'axios';

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const url = isRegister ? '/api/auth/register' : '/api/auth/login';
            const payload = isRegister
                ? { name, email, password, role }
                : { email, password };

            const res = await axios.post(url, payload);
            dispatch(loginSuccess({ user: res.data.user, token: res.data.token }));
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="glass-card p-8 w-full max-w-md animate-slide-up relative z-10">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 shadow-lg shadow-indigo-500/25">
                        <span className="text-2xl">🎓</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Remote Classroom</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {isRegister ? 'Create your account' : 'Welcome back!'}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg text-sm animate-shake" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('student')}
                                    className="p-3 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                        background: role === 'student' ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-dark)',
                                        border: role === 'student' ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        color: role === 'student' ? '#a5b4fc' : 'var(--text-secondary)'
                                    }}
                                >
                                    🎒 Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('teacher')}
                                    className="p-3 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                        background: role === 'teacher' ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-dark)',
                                        border: role === 'teacher' ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        color: role === 'teacher' ? '#67e8f9' : 'var(--text-secondary)'
                                    }}
                                >
                                    👨‍🏫 Teacher
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary w-full py-3 text-base"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            isRegister ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => { setIsRegister(!isRegister); setError(''); }}
                        className="text-sm hover:underline"
                        style={{ color: 'var(--primary)' }}
                    >
                        {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                    </button>
                </div>
            </div>
        </div>
    );
}
