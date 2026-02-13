import { Bar, Pie, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement,
    ArcElement, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale, LinearScale, BarElement,
    ArcElement, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
);

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#94a3b8', font: { size: 11 } }
        }
    },
    scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(71,85,105,0.3)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(71,85,105,0.3)' } }
    }
};

export function AttendanceBar({ students }) {
    const data = {
        labels: students.map(s => s.student.name),
        datasets: [{
            label: 'Attendance %',
            data: students.map(s => s.attendanceScore),
            backgroundColor: students.map(s => s.isPresent ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
            borderColor: students.map(s => s.isPresent ? '#10b981' : '#ef4444'),
            borderWidth: 1,
            borderRadius: 6,
        }]
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar data={data} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Attendance Score', color: '#f1f5f9' } } }} />
        </div>
    );
}

export function EngagementPie({ students }) {
    const present = students.filter(s => s.isPresent).length;
    const absent = students.length - present;

    const data = {
        labels: ['Active', 'Inactive'],
        datasets: [{
            data: [present, absent],
            backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(239, 68, 68, 0.7)'],
            borderColor: ['#10b981', '#ef4444'],
            borderWidth: 2,
        }]
    };

    return (
        <div style={{ height: '300px' }}>
            <Pie data={data} options={{ ...chartOptions, scales: undefined, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Active vs Inactive', color: '#f1f5f9' } } }} />
        </div>
    );
}

export function ScoresBar({ students }) {
    const data = {
        labels: students.map(s => s.student.name),
        datasets: [
            {
                label: 'Engagement',
                data: students.map(s => s.engagementScore),
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Understanding',
                data: students.map(s => s.understandingScore),
                backgroundColor: 'rgba(6, 182, 212, 0.6)',
                borderColor: '#06b6d4',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Focus',
                data: students.map(s => s.focusScore),
                backgroundColor: 'rgba(245, 158, 11, 0.6)',
                borderColor: '#f59e0b',
                borderWidth: 1,
                borderRadius: 4,
            }
        ]
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar data={data} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Performance Scores', color: '#f1f5f9' } } }} />
        </div>
    );
}

export function QuestionCorrectness({ questions }) {
    if (!questions || questions.length === 0) return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No questions yet</p>;

    const data = {
        labels: questions.map((q, i) => `Q${i + 1}`),
        datasets: [{
            label: 'Correct %',
            data: questions.map(q => q.stats?.correctPercentage || 0),
            backgroundColor: 'rgba(16, 185, 129, 0.6)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 6,
        }]
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar data={data} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Question Correctness', color: '#f1f5f9' } } }} />
        </div>
    );
}
