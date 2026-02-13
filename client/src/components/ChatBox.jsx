import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addChatMessage } from '../store/classroomSlice';

export default function ChatBox({ socket, classId }) {
    const [message, setMessage] = useState('');
    const { chatMessages } = useSelector(s => s.classroom);
    const { user } = useSelector(s => s.user);
    const dispatch = useDispatch();
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket) return;
        socket.emit('chat-message', { classId, message: message.trim() });
        setMessage('');
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    💬 Live Chat
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                        {chatMessages.length}
                    </span>
                </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: '400px' }}>
                {chatMessages.length === 0 && (
                    <p className="text-center text-sm py-8" style={{ color: 'var(--text-secondary)' }}>No messages yet</p>
                )}
                {chatMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`animate-fade-in ${msg.userId === user?.id ? 'ml-6' : 'mr-6'}`}
                    >
                        <div
                            className="rounded-xl px-3 py-2"
                            style={{
                                background: msg.userId === user?.id
                                    ? 'rgba(99, 102, 241, 0.2)'
                                    : 'var(--bg-elevated)',
                            }}
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold" style={{ color: msg.role === 'teacher' ? '#67e8f9' : '#a5b4fc' }}>
                                    {msg.userName}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-sm text-white break-words">{msg.message}</p>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="input flex-1 text-sm"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary text-sm px-4">
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
