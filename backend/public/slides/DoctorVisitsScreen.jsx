// ============================================
// DOCTOR VISITS SCREEN
// Lists doctors who have looked up this patient. Tap the chat icon to open
// ChatRoomScreen pre-loaded with that doctor.
// Uses inline styles because the patient SPA is vanilla CSS, not Tailwind.
// ============================================

window.DoctorVisitsScreen = () => {
    const { useState, useEffect } = React;
    const { navigateTo, showNotification } = window.useApp();
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        (async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigateTo('signin'); return; }
            try {
                const res = await fetch('/api/patient/doctor-visits', {
                    headers: { Authorization: 'Bearer ' + token }
                });
                const data = await res.json();
                if (data.success) setVisits(data.visits || []);
                else setErrorMsg(data.message || 'Failed to load');
            } catch (e) {
                setErrorMsg('Network error. Is the backend running?');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const openChat = (doctorId) => {
        sessionStorage.setItem('swa_chat_with_doctor', doctorId);
        navigateTo('chat-room');
    };

    const S = {
        page: { minHeight: '100vh', background: '#f6f7f9', paddingBottom: 100 },
        header: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 5 },
        back: { background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#0f766e' },
        title: { fontSize: 18, fontWeight: 700, margin: 0 },
        list: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
        empty: { background: '#fff', borderRadius: 12, padding: 28, textAlign: 'center', color: '#64748b', border: '1px solid #e5e7eb' },
        emptyIcon: { fontSize: 40, marginBottom: 8 },
        card: { background: '#fff', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb' },
        cardLeft: { flex: 1, minWidth: 0 },
        name: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 },
        meta: { fontSize: 12, color: '#64748b' },
        verified: { color: '#16a34a' },
        chatBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: '#0d9488', color: '#fff', border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
    };

    return (
        <div style={S.page}>
            <div style={S.header}>
                <button onClick={() => navigateTo('profile')} style={S.back}>←</button>
                <h2 style={S.title}>Doctor Visits</h2>
            </div>

            <div style={S.list}>
                {loading && <p style={{ color: '#64748b', padding: 8 }}>Loading...</p>}

                {!loading && errorMsg && (
                    <div style={S.empty}>
                        <div style={S.emptyIcon}>⚠️</div>
                        <p>{errorMsg}</p>
                    </div>
                )}

                {!loading && !errorMsg && visits.length === 0 && (
                    <div style={S.empty}>
                        <div style={S.emptyIcon}>🩺</div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>No doctor visits yet</p>
                        <p style={{ fontSize: 12 }}>
                            Doctors who view your records will appear here. Share your Patient&nbsp;ID with your doctor.
                        </p>
                    </div>
                )}

                {!loading && visits.map(v => (
                    <div key={v.linkId} style={S.card}>
                        <div style={S.cardLeft}>
                            <div style={S.name}>{v.doctor.name}</div>
                            <div style={S.meta}>
                                {v.doctor.specialization || '—'}
                                {v.doctor.isVerified && <span style={S.verified}> • ✅ Verified</span>}
                            </div>
                            {v.doctor.clinic && (
                                <div style={S.meta}>
                                    📍 {v.doctor.clinic}{v.doctor.city ? ', ' + v.doctor.city : ''}
                                </div>
                            )}
                            <div style={{ ...S.meta, color: '#94a3b8', marginTop: 4 }}>
                                Last viewed: {new Date(v.lastViewedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <button onClick={() => openChat(v.doctor.id)} title="Chat with doctor" style={S.chatBtn}>💬</button>
                    </div>
                ))}
            </div>
        </div>
    );
};
