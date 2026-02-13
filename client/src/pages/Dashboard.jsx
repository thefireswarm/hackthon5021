import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { AttendanceBar, EngagementPie, ScoresBar, QuestionCorrectness } from '../components/AnalyticsCharts';
import Leaderboard from '../components/Leaderboard';

export default function Dashboard() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const { token, user } = useSelector(s => s.user);

    const [analytics, setAnalytics] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 15000); // Auto-refresh
        return () => clearInterval(interval);
    }, [classId]);

    const fetchAll = async () => {
        try {
            const [analyticsRes, questionsRes, leaderboardRes] = await Promise.all([
                axios.get(`/api/analytics/${classId}`, { headers }),
                axios.get(`/api/questions/${classId}/results`, { headers }),
                axios.get(`/api/analytics/${classId}/leaderboard`, { headers })
            ]);
            setAnalytics(analyticsRes.data);
            setQuestions(questionsRes.data.questions);
            setLeaderboard(leaderboardRes.data.leaderboard);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-dark)' }}>
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
                </div>
            </div>
        );
    }

    const students = analytics?.students || [];
    const summary = analytics?.summary || {};

    const tabs = [
        { id: 'overview', label: '📊 Overview', icon: '' },
        { id: 'students', label: '👥 Students', icon: '' },
        { id: 'questions', label: '🧠 Questions', icon: '' },
        { id: 'leaderboard', label: '🏆 Leaderboard', icon: '' },
    ];

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
            {/* Header */}
            <header className="border-b" style={{ borderColor: 'var(--border)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)' }}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="btn btn-ghost text-sm py-1.5 px-3">
                            ← Home
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">📊 Analytics Dashboard</h1>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Real-time class performance</p>
                        </div>
                    </div>
                    <button onClick={fetchAll} className="btn btn-ghost text-sm">🔄 Refresh</button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Students', value: summary.totalStudents || 0, icon: '👥', color: '#6366f1' },
                        { label: 'Present', value: summary.presentStudents || 0, icon: '✅', color: '#10b981' },
                        { label: 'Absent', value: summary.absentStudents || 0, icon: '❌', color: '#ef4444' },
                        { label: 'Avg Engagement', value: `${summary.avgEngagement || 0}%`, icon: '📈', color: '#06b6d4' },
                    ].map((card, i) => (
                        <div key={i} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">{card.icon}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: `${card.color}20`, color: card.color }}>{card.label}</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tab navigation */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="btn text-sm py-2 px-4 whitespace-nowrap"
                            style={{
                                background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                border: activeTab === tab.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                                color: activeTab === tab.id ? '#a5b4fc' : 'var(--text-secondary)'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {activeTab === 'overview' && (
                    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="glass-card p-5">
                            <AttendanceBar students={students} />
                        </div>
                        <div className="glass-card p-5">
                            <EngagementPie students={students} />
                        </div>
                        <div className="glass-card p-5 md:col-span-2">
                            <ScoresBar students={students} />
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="glass-card overflow-hidden animate-fade-in">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ background: 'var(--bg-elevated)' }}>
                                        {['Student', 'Attendance', 'Understanding', 'Focus', 'Engagement', 'Status', 'Points'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s, i) => (
                                        <tr key={s.student.id} className="border-t animate-fade-in" style={{ borderColor: 'var(--border)', animationDelay: `${i * 0.05}s` }}>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-white">{s.student.name}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.student.email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ScoreBadge value={s.attendanceScore} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <ScoreBadge value={s.understandingScore} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <ScoreBadge value={s.focusScore} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <ScoreBadge value={s.engagementScore} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                                                    background: s.isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                    color: s.isPresent ? '#6ee7b7' : '#fca5a5'
                                                }}>
                                                    {s.isPresent ? 'Present' : 'Absent'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{s.points}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {students.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-3xl mb-2">📭</p>
                                <p style={{ color: 'var(--text-secondary)' }}>No students enrolled yet</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="glass-card p-5">
                            <QuestionCorrectness questions={questions} />
                        </div>

                        {questions.map((q, i) => (
                            <div key={q.id} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <h3 className="text-sm font-semibold text-white mb-2">Q{i + 1}: {q.text}</h3>
                                <div className="flex gap-4 text-sm mb-3">
                                    <span style={{ color: '#6ee7b7' }}>✅ {q.stats?.correctPercentage}% correct</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>{q.stats?.totalResponses} responses</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {q.options?.map(opt => (
                                        <div key={opt.id} className="p-2 rounded-lg text-xs" style={{
                                            background: opt.is_correct ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-dark)',
                                            border: opt.is_correct ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                                            color: opt.is_correct ? '#6ee7b7' : 'var(--text-secondary)'
                                        }}>
                                            {opt.text} {opt.is_correct ? '✓' : ''}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {questions.length === 0 && (
                            <div className="glass-card p-10 text-center">
                                <p className="text-3xl mb-2">🧠</p>
                                <p style={{ color: 'var(--text-secondary)' }}>No questions asked yet</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'leaderboard' && (
                    <div className="glass-card p-5 max-w-lg mx-auto animate-fade-in">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            🏆 Class Leaderboard
                        </h2>
                        <Leaderboard leaderboard={leaderboard} />
                    </div>
                )}
            </main>
        </div>
    );
}

function ScoreBadge({ value }) {
    const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
    return (
        <span className="text-sm font-bold" style={{ color }}>
            {value}%
        </span>
    );
}
