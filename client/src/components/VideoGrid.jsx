import { useRef, useEffect, useState } from 'react';

/**
 * VideoGrid displays local and remote video streams.
 * Uses simple WebRTC peer connections (no external library needed for basic signaling).
 */
export default function VideoGrid({ socket, classId, localStream, peers }) {
    const localVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    return (
        <div className="grid gap-3 p-3" style={{
            gridTemplateColumns: peers.length === 0
                ? '1fr'
                : peers.length <= 1
                    ? 'repeat(2, 1fr)'
                    : peers.length <= 3
                        ? 'repeat(2, 1fr)'
                        : 'repeat(3, 1fr)'
        }}>
            {/* Local video */}
            <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', aspectRatio: '16/9' }}>
                {localStream ? (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-2 text-2xl">
                                👤
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Camera off</p>
                        </div>
                    </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                    You
                </div>
            </div>

            {/* Remote peers */}
            {peers.map((peer) => (
                <PeerVideo key={peer.socketId} peer={peer} />
            ))}
        </div>
    );
}

function PeerVideo({ peer }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && peer.stream) {
            videoRef.current.srcObject = peer.stream;
        }
    }, [peer.stream]);

    return (
        <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', aspectRatio: '16/9' }}>
            {peer.stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
                            👤
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {peer.userName || 'Connecting...'}
                        </p>
                    </div>
                </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                {peer.userName || 'User'}
                {peer.role === 'teacher' && (
                    <span className="ml-1 px-1 rounded text-xs" style={{ background: 'var(--accent)', color: 'white' }}>Host</span>
                )}
            </div>
        </div>
    );
}
