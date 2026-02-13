export default function Leaderboard({ leaderboard }) {
    if (!leaderboard || leaderboard.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-3xl mb-2">🏆</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No scores yet</p>
            </div>
        );
    }

    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="space-y-2">
            {leaderboard.map((entry, idx) => (
                <div
                    key={entry.student_id}
                    className="flex items-center gap-3 p-3 rounded-xl animate-fade-in transition-all hover:scale-[1.01]"
                    style={{
                        background: idx < 3 ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-dark)',
                        border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                        animationDelay: `${idx * 0.05}s`
                    }}
                >
                    {/* Rank */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold" style={{
                        background: idx < 3 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)'
                    }}>
                        {idx < 3 ? medals[idx] : <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.rank}</span>}
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                        <p className="text-sm font-medium text-white">{entry.name}</p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                        <span className="text-lg font-bold" style={{ color: idx === 0 ? '#fbbf24' : 'var(--primary)' }}>
                            {entry.score}
                        </span>
                        <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>pts</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
