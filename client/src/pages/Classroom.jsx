import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import {
    setParticipants, addChatMessage, setPopup,
    setActiveQuestion, setQuestionResults, addHandRaised,
    resetClassroom
} from '../store/classroomSlice';
import VideoGrid from '../components/VideoGrid';
import ChatBox from '../components/ChatBox';
import PopupCheck from '../components/PopupCheck';
import QuestionModal from '../components/QuestionModal';
import { startFocusTracking, stopFocusTracking } from '../utils/focusTracker';
import axios from 'axios';

export default function Classroom() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user, token } = useSelector(s => s.user);
    const { participants, questionResults } = useSelector(s => s.classroom);

    const [socket, setSocket] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [classInfo, setClassInfo] = useState(null);
    const [showChat, setShowChat] = useState(true);
    const [showCreateQ, setShowCreateQ] = useState(false);

    // Question creation state (teacher)
    const [qText, setQText] = useState('');
    const [qOptions, setQOptions] = useState([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
    ]);

    const peersRef = useRef(new Map());
    const peerConnectionsRef = useRef(new Map());
    const localStreamRef = useRef(null);

    // Keep the ref in sync with state
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    // Fetch class info
    useEffect(() => {
        axios.get(`/api/classroom/${classId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setClassInfo(res.data))
            .catch(() => navigate('/'));
    }, [classId]);

    // Get local media stream FIRST, then initialize Socket.IO + WebRTC
    useEffect(() => {
        let newSocket = null;
        let cancelled = false;

        async function init() {
            // Step 1: Get camera/mic
            let stream = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                setLocalStream(stream);
                localStreamRef.current = stream;
            } catch (err) {
                console.warn('Camera/mic not available:', err);
            }

            // Step 2: Connect socket AFTER media is ready
            newSocket = io('http://localhost:5000', { auth: { token } });

            newSocket.on('connect', () => {
                console.log('Socket connected');
                newSocket.emit('join-room', { classId });
                if (user.role === 'teacher') {
                    newSocket.emit('start-engagement', { classId });
                }
            });

            // Participants update
            newSocket.on('participants-update', (data) => {
                dispatch(setParticipants(data));
            });

            // Chat
            newSocket.on('chat-message', (msg) => {
                dispatch(addChatMessage(msg));
            });

            // Hand raised
            newSocket.on('hand-raised', (data) => {
                dispatch(addHandRaised(data));
            });

            // Engagement popup
            newSocket.on('engagement-popup', (data) => {
                dispatch(setPopup(data));
            });

            // Question popup
            newSocket.on('question-popup', (data) => {
                dispatch(setActiveQuestion(data));
            });

            // Question closed
            newSocket.on('question-closed', () => { });

            // Question results
            newSocket.on('question-results', (data) => {
                dispatch(setQuestionResults(data));
            });

            // Class ended by teacher
            newSocket.on('class-ended', ({ message, endedBy }) => {
                alert(`Class ended by ${endedBy}`);
                const s = localStreamRef.current;
                if (s) s.getTracks().forEach(t => t.stop());
                peerConnectionsRef.current.forEach(pc => pc.close());
                peerConnectionsRef.current.clear();
                stopFocusTracking();
                dispatch(resetClassroom());
                navigate('/');
            });

            // WebRTC signaling — uses localStreamRef to always get the current stream
            newSocket.on('user-joined', async ({ socketId, userId, userName, role }) => {
                console.log(`User joined: ${userName}`);
                const pc = createPeerConnection(newSocket, socketId, userName, role);
                peerConnectionsRef.current.set(socketId, pc);

                const s = localStreamRef.current;
                if (s) {
                    s.getTracks().forEach(track => pc.addTrack(track, s));
                }

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                newSocket.emit('webrtc-offer', { targetSocketId: socketId, offer });
            });

            newSocket.on('webrtc-offer', async ({ senderSocketId, userId, userName, offer }) => {
                const pc = createPeerConnection(newSocket, senderSocketId, userName);
                peerConnectionsRef.current.set(senderSocketId, pc);

                const s = localStreamRef.current;
                if (s) {
                    s.getTracks().forEach(track => pc.addTrack(track, s));
                }

                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                newSocket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer });
            });

            newSocket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
                const pc = peerConnectionsRef.current.get(senderSocketId);
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                }
            });

            newSocket.on('webrtc-ice-candidate', async ({ senderSocketId, candidate }) => {
                const pc = peerConnectionsRef.current.get(senderSocketId);
                if (pc && candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
            });

            newSocket.on('user-left', ({ socketId }) => {
                const pc = peerConnectionsRef.current.get(socketId);
                if (pc) pc.close();
                peerConnectionsRef.current.delete(socketId);
                peersRef.current.delete(socketId);
                setPeers(Array.from(peersRef.current.values()));
            });

            setSocket(newSocket);

            // Start focus tracking for students
            if (user.role === 'student') {
                startFocusTracking(newSocket, classId);
            }
        }

        init();

        return () => {
            cancelled = true;
            stopFocusTracking();
            if (newSocket) {
                newSocket.emit('leave-room');
                newSocket.disconnect();
            }
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            const s = localStreamRef.current;
            if (s) s.getTracks().forEach(t => t.stop());
            dispatch(resetClassroom());
        };
    }, []);

    function createPeerConnection(sock, socketId, userName, role) {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                sock.emit('webrtc-ice-candidate', { targetSocketId: socketId, candidate: e.candidate });
            }
        };

        pc.ontrack = (e) => {
            const peerData = { socketId, userName, role, stream: e.streams[0] };
            peersRef.current.set(socketId, peerData);
            setPeers(Array.from(peersRef.current.values()));
        };

        return pc;
    }

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
            setIsVideoOff(!isVideoOff);
        }
    };

    const raiseHand = () => {
        if (socket) socket.emit('raise-hand', { classId });
    };

    const leaveClass = () => {
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        navigate('/');
    };

    const endClass = () => {
        if (!socket || user?.role !== 'teacher') return;
        if (!window.confirm('Are you sure you want to end this class? All participants will be disconnected.')) return;
        socket.emit('end-class', { classId });
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        navigate('/');
    };

    // Create and broadcast question (Teacher)
    const handleCreateQuestion = async () => {
        if (!qText.trim() || qOptions.filter(o => o.text.trim()).length < 2) return;
        const correctCount = qOptions.filter(o => o.isCorrect).length;
        if (correctCount === 0) return;

        try {
            const res = await axios.post('/api/questions/create', {
                classId,
                text: qText,
                options: qOptions.filter(o => o.text.trim())
            }, { headers: { Authorization: `Bearer ${token}` } });

            // Broadcast via socket
            socket.emit('broadcast-question', { questionId: res.data.id, classId });
            setShowCreateQ(false);
            setQText('');
            setQOptions([
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
            ]);
        } catch (err) {
            console.error('Failed to create question:', err);
        }
    };

    return (
        <div className="h-screen flex flex-col" style={{ background: 'var(--bg-dark)' }}>
            {/* Top bar */}
            <header className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(15, 23, 42, 0.9)' }}>
                <div className="flex items-center gap-3">
                    <button onClick={leaveClass} className="btn btn-ghost text-sm py-1.5 px-3">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-sm font-semibold text-white">{classInfo?.title || 'Classroom'}</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {participants.length} participant{participants.length !== 1 ? 's' : ''}
                            {classInfo?.code && <span className="ml-2 font-mono">Code: {classInfo.code}</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {user?.role === 'teacher' && (
                        <>
                            <button onClick={() => setShowCreateQ(true)} className="btn btn-primary text-xs py-1.5">
                                📝 Ask Question
                            </button>
                            <button onClick={() => navigate(`/dashboard/${classId}`)} className="btn btn-ghost text-xs py-1.5">
                                📊 Dashboard
                            </button>
                            <button onClick={endClass} className="btn btn-danger text-xs py-1.5">
                                🛑 End Class
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video area */}
                <div className="flex-1 overflow-y-auto">
                    <VideoGrid
                        socket={socket}
                        classId={classId}
                        localStream={localStream}
                        peers={peers}
                    />

                    {/* Question results (shown to teacher) */}
                    {questionResults && user?.role === 'teacher' && (
                        <div className="mx-3 mt-2 glass-card p-4 animate-fade-in">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-white">📊 Question Results</h3>
                                <button onClick={() => dispatch(setQuestionResults(null))} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Dismiss</button>
                            </div>
                            <p className="text-sm text-white mb-2">{questionResults.text}</p>
                            <div className="flex gap-4 text-sm">
                                <span style={{ color: '#6ee7b7' }}>✅ {questionResults.correctPercentage}% correct</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{questionResults.totalResponses} responses</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - Chat */}
                {showChat && (
                    <div className="w-80 border-l flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                        {/* Participants */}
                        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                                👥 PARTICIPANTS ({participants.length})
                            </h3>
                            <div className="flex flex-wrap gap-1">
                                {participants.map((p, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{
                                        background: p.role === 'teacher' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                        color: p.role === 'teacher' ? '#67e8f9' : '#a5b4fc'
                                    }}>
                                        {p.userName}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <ChatBox socket={socket} classId={classId} />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom controls */}
            <div className="flex items-center justify-center gap-3 py-3 border-t" style={{ borderColor: 'var(--border)', background: 'rgba(15, 23, 42, 0.9)' }}>
                <button
                    onClick={toggleMute}
                    className={`btn ${isMuted ? 'btn-danger' : 'btn-ghost'} text-sm py-2 px-4`}
                >
                    {isMuted ? '🔇 Unmute' : '🎤 Mute'}
                </button>
                <button
                    onClick={toggleVideo}
                    className={`btn ${isVideoOff ? 'btn-danger' : 'btn-ghost'} text-sm py-2 px-4`}
                >
                    {isVideoOff ? '📷 Camera On' : '📹 Camera Off'}
                </button>
                {user?.role === 'student' && (
                    <button onClick={raiseHand} className="btn btn-ghost text-sm py-2 px-4">
                        ✋ Raise Hand
                    </button>
                )}
                <button
                    onClick={() => setShowChat(!showChat)}
                    className="btn btn-ghost text-sm py-2 px-4"
                >
                    {showChat ? '💬 Hide Chat' : '💬 Show Chat'}
                </button>
                <button onClick={leaveClass} className="btn btn-danger text-sm py-2 px-4">
                    📞 Leave
                </button>
            </div>

            {/* Modals */}
            <PopupCheck socket={socket} classId={classId} />
            <QuestionModal classId={classId} />

            {/* Create Question Modal (Teacher) */}
            {showCreateQ && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="glass-card p-6 max-w-lg w-full mx-4 animate-slide-up">
                        <h2 className="text-lg font-bold text-white mb-4">📝 Create Question</h2>

                        <div className="mb-4">
                            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Question</label>
                            <textarea
                                className="input"
                                rows={2}
                                placeholder="Enter your question..."
                                value={qText}
                                onChange={(e) => setQText(e.target.value)}
                            />
                        </div>

                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Options (check the correct one)</label>
                        <div className="space-y-2 mb-4">
                            {qOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={opt.isCorrect}
                                        onChange={() => {
                                            const newOpts = [...qOptions];
                                            newOpts[idx] = { ...newOpts[idx], isCorrect: !newOpts[idx].isCorrect };
                                            setQOptions(newOpts);
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <input
                                        type="text"
                                        className="input flex-1"
                                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                        value={opt.text}
                                        onChange={(e) => {
                                            const newOpts = [...qOptions];
                                            newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                                            setQOptions(newOpts);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowCreateQ(false)} className="btn btn-ghost flex-1">Cancel</button>
                            <button onClick={handleCreateQuestion} className="btn btn-primary flex-1">
                                🚀 Broadcast
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
