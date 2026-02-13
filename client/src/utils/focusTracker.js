/**
 * Focus Tracker – Uses Page Visibility API and blur/focus events
 * to track student attention and report to server.
 */

let lastFocusTime = Date.now();
let socket = null;
let classId = null;

function handleVisibilityChange() {
    if (!socket || !classId) return;

    const now = Date.now();
    const duration = Math.round((now - lastFocusTime) / 1000);

    if (document.hidden) {
        // Tab became hidden – user switched away
        socket.emit('focus-event', {
            classId,
            eventType: 'focus',
            duration
        });
        lastFocusTime = now;
    } else {
        // Tab became visible – user came back
        socket.emit('focus-event', {
            classId,
            eventType: 'blur',
            duration
        });
        lastFocusTime = now;
    }
}

function handleBlur() {
    if (!socket || !classId) return;
    const now = Date.now();
    const duration = Math.round((now - lastFocusTime) / 1000);
    socket.emit('focus-event', { classId, eventType: 'focus', duration });
    lastFocusTime = now;
}

function handleFocus() {
    if (!socket || !classId) return;
    const now = Date.now();
    const duration = Math.round((now - lastFocusTime) / 1000);
    socket.emit('focus-event', { classId, eventType: 'blur', duration });
    lastFocusTime = now;
}

export function startFocusTracking(socketInstance, activeClassId) {
    socket = socketInstance;
    classId = activeClassId;
    lastFocusTime = Date.now();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
}

export function stopFocusTracking() {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
    socket = null;
    classId = null;
}
