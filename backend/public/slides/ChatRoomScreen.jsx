// ============================================
// CHAT ROOM SCREEN — patient chats with a single doctor.
// Doctor ID is read from sessionStorage so we don't extend AppContext.
// Polls /api/chat/patient/poll/:doctorId every 3 seconds.
// ============================================

window.ChatRoomScreen = () => {
    const { useState, useEffect, useRef } = React;
    const { navigateTo, showNotification } = window.useApp();
    const doctorId = sessionStorage.getItem('swa_chat_with_doctor');

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [doctorName, setDoctorName] = useState('Doctor');
    const [errorMsg, setErrorMsg] = useState(null);
    const lastSeen = useRef(null);
    const scrollerRef = useRef(null);

    const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('token') });

    useEffect(() => {
        if (!doctorId) { navigateTo('doctor-visits'); return; }
        (async () => {
            try {
                const tRes = await fetch('/api/chat/patient/threads', { headers: authHeader() });
                const tData = await tRes.json();
                const t = (tData.threads || []).find(t => t.doctorId === doctorId);
                if (t) setDoctorName(t.doctor && t.doctor.name ? t.doctor.name : 'Doctor');

                const mRes = await fetch('/api/chat/patient/messages/' + doctorId, { headers: authHeader() });
                const mData = await mRes.json();
                if (mData.success) {
                    setMessages(mData.messages || []);
                    lastSeen.current = mData.messages && mData.messages.length
                        ? mData.messages[mData.messages.length - 1].createdAt
                        : new Date().toISOString();
                } else {
                    setErrorMsg(mData.message || 'Could not load chat');
                }
            } catch (e) {
                setErrorMsg('Network error');
            }
        })();
    }, []);

    useEffect(() => {
        if (!doctorId) return;
        const id = setInterval(async () => {
            try {
                const q = lastSeen.current ? '?since=' + encodeURIComponent(lastSeen.current) : '';
                const res = await fetch('/api/chat/patient/poll/' + doctorId + q, { headers: authHeader() });
                const data = await res.json();
                if (data.success) {
                    if (data.messages && data.messages.length) {
                        setMessages(prev => [...prev, ...data.messages]);
                        lastSeen.current = data.messages[data.messages.length - 1].createdAt;
                    } else if (data.now) {
                        lastSeen.current = data.now;
                    }
                }
            } catch (e) {}
        }, 3000);
        return () => clearInterval(id);
    }, [doctorId]);

    useEffect(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }, [messages.length]);

    const send = async () => {
        const text = input.trim();
        if (!text || !doctorId) return;
        setSending(true);
        try {
            const res = await fetch('/api/chat/patient/send', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
                body: JSON.stringify({ doctorId: doctorId, text: text })
            });
            const data = await res.json();
            if (data.success && data.message) {
                setMessages(prev => [...prev, data.message]);
                lastSeen.current = data.message.createdAt;
                setInput('');
            } else {
                showNotification(data.message || 'Send failed', 'error');
            }
        } catch (e) {
            showNotification('Network error', 'error');
        } finally {
            setSending(false);
        }
    };

    const S = {
        page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f6f7f9' },
        header: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb' },
        back: { background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#0f766e' },
        nameWrap: { flex: 1 },
        name: { fontSize: 15, fontWeight: 700, color: '#0f172a' },
        sub: { fontSize: 11, color: '#64748b' },
        msgs: { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 },
        empty: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 32 },
        msg: (isMe) => ({
            maxWidth: '78%',
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            background: isMe ? '#0d9488' : '#fff',
            color: isMe ? '#fff' : '#0f172a',
            border: isMe ? 'none' : '1px solid #e5e7eb',
            borderRadius: 14,
            padding: '8px 12px',
            fontSize: 14
        }),
        time: { fontSize: 10, opacity: 0.7, marginTop: 4 },
        composer: { padding: 12, background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 },
        input: { flex: 1, padding: '10px 14px', borderRadius: 999, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' },
        sendBtn: { padding: '10px 18px', borderRadius: 999, border: 'none', background: '#0d9488', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
    };

    return (
        <div style={S.page}>
            <div style={S.header}>
                <button onClick={() => navigateTo('doctor-visits')} style={S.back}>←</button>
                <div style={S.nameWrap}>
                    <div style={S.name}>{doctorName}</div>
                    <div style={S.sub}>Active conversation</div>
                </div>
            </div>

            <div ref={scrollerRef} style={S.msgs}>
                {errorMsg && <p style={{ ...S.empty, color: '#dc2626' }}>{errorMsg}</p>}
                {!errorMsg && messages.length === 0 && (
                    <p style={S.empty}>No messages yet. Say hello to your doctor.</p>
                )}
                {messages.map(m => (
                    <div key={m._id} style={S.msg(m.senderRole === 'patient')}>
                        <div>{m.text}</div>
                        <div style={S.time}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ))}
            </div>

            <div style={S.composer}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                    disabled={sending}
                    style={S.input}
                />
                <button onClick={send} disabled={sending || !input.trim()} style={{ ...S.sendBtn, opacity: (sending || !input.trim()) ? 0.5 : 1 }}>
                    Send
                </button>
            </div>
        </div>
    );
};
