// ============================================
// DOCTOR DASHBOARD - Full Portal
// Matches patient portal colors, animations, UX
// ============================================

// ══════════════════════════════════════
//  SUB-COMPONENTS (Moved outside to prevent re-mounting)
// ══════════════════════════════════════

const Sidebar = ({ sidebarOpen, setSidebarOpen, activePage, setActivePage, doctor, initials, handleLogout, AppLogo }) => (
    <React.Fragment>
        {sidebarOpen && <div className="doc-sidebar-overlay animate-fade-in" onClick={() => setSidebarOpen(false)} />}
        <aside className={`doc-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="doc-sidebar-header">
                <AppLogo size={36} />
                <div className="doc-sidebar-brand">
                    <span className="doc-sidebar-brand-name">Swa-Astha</span>
                    <span className="doc-sidebar-brand-sub">Doctor Portal</span>
                </div>
            </div>
            <div className="doc-sidebar-sep" />
            <nav className="doc-sidebar-nav">
                {[
                    { key: 'home', label: 'Dashboard', icon: '🏠' },
                    ...(doctor?.verificationStatus === 'approved' ? [{ key: 'chat', label: 'Patient Chats', icon: '💬' }] : []),
                    ...(doctor?.verificationStatus !== 'approved' ? [{ key: 'verification', label: doctor?.verificationStatus === 'under_review' ? 'Approval Status' : 'Verification', icon: '🛡️' }] : []),
                    { key: 'profile', label: 'Profile', icon: '👤' },
                    { key: 'settings', label: 'Settings', icon: '⚙️' },
                ].map(item => (
                    <button
                        key={item.key}
                        className={`doc-sidebar-item ${activePage === item.key ? 'active' : ''}`}
                        onClick={() => { setActivePage(item.key); setSidebarOpen(false); }}
                    >
                        <span className="doc-sidebar-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="doc-sidebar-footer">
                <div className="doc-sidebar-sep" />
                <div className="doc-sidebar-doctor">
                    <div className="doc-sidebar-avatar">{initials}</div>
                    <div className="doc-sidebar-doctor-info">
                        <span className="doc-sidebar-doctor-name">{doctor?.name || 'Doctor'}</span>
                        <span className="doc-sidebar-doctor-spec">{doctor?.specialization || 'Specialist'}</span>
                    </div>
                </div>
                {doctor?.verificationStatus === 'approved' && (
                    <div className="doc-verified-badge-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
                        Verified
                    </div>
                )}
                {doctor?.verificationStatus === 'under_review' && (
                    <div className="doc-verified-badge-sm" style={{background:'#fef3c7',color:'#92400e'}}>
                        ⏳ Pending Approval
                    </div>
                )}
                {doctor?.verificationStatus === 'rejected' && (
                    <div className="doc-verified-badge-sm" style={{background:'#fee2e2',color:'#991b1b'}}>
                        ✕ Rejected
                    </div>
                )}
                <button className="doc-sidebar-logout" onClick={handleLogout}>
                    <span>🚪</span> Logout
                </button>
            </div>
        </aside>
    </React.Fragment>
);

const TopBar = ({ setSidebarOpen, setActivePage, activePage, initials }) => (
    <header className="doc-topbar">
        <button className="doc-topbar-menu" onClick={() => setSidebarOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="doc-topbar-breadcrumb">
            <span className="doc-breadcrumb-link" onClick={() => setActivePage('home')}>Dashboard</span>
            {activePage !== 'home' && (
                <React.Fragment>
                    <span className="doc-breadcrumb-sep">›</span>
                    <span className="doc-breadcrumb-current">
                        {activePage === 'patient' ? 'Patient History' : activePage === 'profile' ? 'Profile' : activePage === 'verification' ? 'Verification' : activePage === 'chat' ? 'Patient Chats' : 'Settings'}
                    </span>
                </React.Fragment>
            )}
        </div>
        <div className="doc-topbar-avatar" onClick={() => setActivePage('profile')}>{initials}</div>
    </header>
);

// ============================================
// DOCTOR ↔ PATIENT CHAT PAGE (polling every 3s)
// Threads = patients this doctor has previously looked up (DoctorPatientLink rows).
// ============================================
const DoctorChatPage = () => {
    const [threads, setThreads] = React.useState([]);
    const [threadsLoading, setThreadsLoading] = React.useState(true);
    const [activePatientId, setActivePatientId] = React.useState(null);
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [sending, setSending] = React.useState(false);
    const lastSeen = React.useRef(null);
    const scrollerRef = React.useRef(null);

    const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('doctor_token')}` });

    const loadThreads = async () => {
        try {
            const res = await fetch('/api/chat/doctor/threads', { headers: authHeader() });
            const data = await res.json();
            if (data.success) setThreads(data.threads || []);
        } catch (e) {}
        finally { setThreadsLoading(false); }
    };
    React.useEffect(() => { loadThreads(); }, []);

    const openThread = async (patientId) => {
        setActivePatientId(patientId);
        setMessages([]);
        try {
            const res = await fetch(`/api/chat/doctor/messages/${patientId}`, { headers: authHeader() });
            const data = await res.json();
            if (data.success) {
                setMessages(data.messages || []);
                lastSeen.current = data.messages?.length
                    ? data.messages[data.messages.length - 1].createdAt
                    : new Date().toISOString();
            }
        } catch (e) {}
    };

    // Poll new messages every 3s
    React.useEffect(() => {
        if (!activePatientId) return;
        const id = setInterval(async () => {
            try {
                const since = lastSeen.current ? `?since=${encodeURIComponent(lastSeen.current)}` : '';
                const res = await fetch(`/api/chat/doctor/poll/${activePatientId}${since}`, { headers: authHeader() });
                const data = await res.json();
                if (data.success) {
                    if (data.messages?.length) {
                        setMessages(prev => [...prev, ...data.messages]);
                        lastSeen.current = data.messages[data.messages.length - 1].createdAt;
                    } else if (data.now) {
                        lastSeen.current = data.now;
                    }
                }
            } catch (e) {}
        }, 3000);
        return () => clearInterval(id);
    }, [activePatientId]);

    React.useEffect(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }, [messages.length]);

    const send = async () => {
        const text = input.trim();
        if (!text || !activePatientId) return;
        setSending(true);
        try {
            const res = await fetch('/api/chat/doctor/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ patientId: activePatientId, text })
            });
            const data = await res.json();
            if (data.success && data.message) {
                setMessages(prev => [...prev, data.message]);
                lastSeen.current = data.message.createdAt;
                setInput('');
                // Refresh threads to update lastMessage preview
                loadThreads();
            }
        } catch (e) {}
        finally { setSending(false); }
    };

    const activeThread = threads.find(t => t.patientId === activePatientId);

    return (
        <div className="doc-page animate-fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', gap: 12 }}>
            {/* Thread list */}
            <aside style={{
                width: 280, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                <div style={{ padding: 14, borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Conversations</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Patients you have looked up</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {threadsLoading && <p style={{ padding: 14, fontSize: 13, color: '#64748b' }}>Loading...</p>}
                    {!threadsLoading && threads.length === 0 && (
                        <p style={{ padding: 14, fontSize: 13, color: '#64748b' }}>
                            No patients yet. Look up a patient by ID from the Dashboard.
                        </p>
                    )}
                    {threads.map(t => (
                        <button
                            key={t.patientId}
                            onClick={() => openThread(t.patientId)}
                            style={{
                                width: '100%', textAlign: 'left', border: 'none',
                                background: activePatientId === t.patientId ? '#f1f5f9' : 'transparent',
                                padding: '12px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                display: 'flex', alignItems: 'flex-start', gap: 10
                            }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%', background: '#0d948822',
                                color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, flexShrink: 0
                            }}>{(t.patient?.name || '?').charAt(0)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {t.patient?.name || 'Patient'}
                                    </span>
                                    {t.unread > 0 && (
                                        <span style={{
                                            background: '#0d9488', color: '#fff', borderRadius: 12,
                                            fontSize: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center'
                                        }}>{t.unread}</span>
                                    )}
                                </div>
                                <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                                    {t.patient?.patientCode}
                                </div>
                                {t.lastMessage && (
                                    <div style={{
                                        fontSize: 11, color: '#64748b',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2
                                    }}>
                                        {t.lastMessage.senderRole === 'doctor' ? 'You: ' : ''}{t.lastMessage.text}
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Conversation panel */}
            <main style={{
                flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {!activePatientId ? (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', color: '#94a3b8'
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                        <p style={{ fontSize: 13 }}>Pick a patient to start chatting.</p>
                    </div>
                ) : (
                    <React.Fragment>
                        <div style={{ padding: 14, borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{activeThread?.patient?.name || 'Patient'}</div>
                            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                                {activeThread?.patient?.patientCode}
                            </div>
                        </div>
                        <div ref={scrollerRef} style={{
                            flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
                            background: '#f8fafc'
                        }}>
                            {messages.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 24 }}>
                                    No messages yet.
                                </p>
                            )}
                            {messages.map(m => (
                                <div
                                    key={m._id}
                                    style={{
                                        maxWidth: '70%',
                                        alignSelf: m.senderRole === 'doctor' ? 'flex-end' : 'flex-start',
                                        background: m.senderRole === 'doctor' ? '#0d9488' : '#fff',
                                        color: m.senderRole === 'doctor' ? '#fff' : '#111',
                                        border: m.senderRole === 'doctor' ? 'none' : '1px solid #e5e7eb',
                                        borderRadius: 14,
                                        padding: '8px 12px',
                                        fontSize: 13
                                    }}
                                >
                                    <div>{m.text}</div>
                                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && send()}
                                disabled={sending}
                                style={{
                                    flex: 1, padding: '10px 14px', borderRadius: 999,
                                    border: '1px solid #e5e7eb', fontSize: 13, outline: 'none'
                                }}
                            />
                            <button
                                onClick={send}
                                disabled={sending || !input.trim()}
                                style={{
                                    padding: '10px 18px', borderRadius: 999, border: 'none',
                                    background: '#0d9488', color: '#fff', fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer', opacity: sending || !input.trim() ? 0.5 : 1
                                }}
                            >Send</button>
                        </div>
                    </React.Fragment>
                )}
            </main>
        </div>
    );
};

const DashboardHome = ({ doctor, setActivePage, stats, recentPatients, searchQuery, setSearchQuery, searchPatient, patientLoading }) => (
    <div className="doc-page animate-fade-in">
        {/* Verification Banner */}
        {doctor?.verificationStatus === 'pending' && (
            <div className="doc-verification-banner" onClick={() => setActivePage('verification')}>
                <div className="doc-verification-banner-left">
                    <div className="doc-verification-banner-icon">🛡️</div>
                    <div>
                        <h3 className="doc-verification-banner-title">Complete Your Profile Verification</h3>
                        <p className="doc-verification-banner-desc">Verify your identity and credentials to unlock all features and build trust with patients.</p>
                    </div>
                </div>
                <button className="doc-verification-banner-btn">Verify Now →</button>
            </div>
        )}
        {doctor?.verificationStatus === 'under_review' && (
            <div className="doc-verification-banner" style={{borderColor:'#f59e0b',background:'linear-gradient(135deg,#fffbeb,#fef3c7)'}} onClick={() => setActivePage('verification')}>
                <div className="doc-verification-banner-left">
                    <div className="doc-verification-banner-icon">⏳</div>
                    <div>
                        <h3 className="doc-verification-banner-title" style={{color:'#92400e'}}>Verification Under Review</h3>
                        <p className="doc-verification-banner-desc" style={{color:'#a16207'}}>Your application has been submitted and is being reviewed by our team. You will be notified once approved.</p>
                    </div>
                </div>
            </div>
        )}
        {doctor?.verificationStatus === 'rejected' && (
            <div className="doc-verification-banner" style={{borderColor:'#ef4444',background:'linear-gradient(135deg,#fef2f2,#fee2e2)'}} onClick={() => setActivePage('verification')}>
                <div className="doc-verification-banner-left">
                    <div className="doc-verification-banner-icon">❌</div>
                    <div>
                        <h3 className="doc-verification-banner-title" style={{color:'#991b1b'}}>Verification Rejected</h3>
                        <p className="doc-verification-banner-desc" style={{color:'#b91c1c'}}>Your application was not approved. Please resubmit with correct details.</p>
                    </div>
                </div>
                <button className="doc-verification-banner-btn" style={{background:'#ef4444'}}>Resubmit →</button>
            </div>
        )}

        {/* Welcome Banner */}
        <div className="doc-welcome-banner">
            <div className="doc-welcome-text">
                <h1 className="doc-welcome-title">
                    Welcome back, {doctor?.name || 'Doctor'}
                    {doctor?.isVerified && (
                        <span className="doc-verified-inline">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2FA4A9" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
                        </span>
                    )}
                </h1>
                <p className="doc-welcome-sub">
                    {doctor?.specialization || 'Specialist'} at {doctor?.clinicName || 'Your Clinic'}{doctor?.city ? `, ${doctor.city}` : ''}
                </p>
            </div>
        </div>

        {/* Patient Search - LOCKED if not verified */}
        <div className="doc-card">
            <h2 className="doc-card-title">🔍 Search Patient Records</h2>
            <p className="doc-card-desc">Enter a patient's Swa-Astha ID to access their medical history</p>
            {doctor?.verificationStatus !== 'approved' ? (
                <div className="doc-locked-overlay">
                    <div className="doc-locked-icon">🔒</div>
                    <div className="doc-locked-message">You must complete profile verification to search or view patient details.</div>
                    <button className="btn-auth doctor-btn" onClick={() => setActivePage('verification')}>Verify Now</button>
                </div>
            ) : (
                <>
                <form className="doc-search-bar" onSubmit={(e) => { e.preventDefault(); searchPatient(); }}>
                    <div className="doc-search-input-wrap">
                        <svg className="doc-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                            className="doc-search-input"
                            placeholder="Enter Patient ID (e.g. SWA-364457)"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false"
                        />
                    </div>
                    <button type="submit" className="doc-search-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Search
                    </button>
                </form>
                <div className="doc-demo-ids">
                    {recentPatients.length > 0 ? (
                        <>
                            <span className="doc-demo-label">Recent patients:</span>
                            {recentPatients.map(p => (
                                <button key={p.patientId} className="doc-demo-btn" onClick={() => { setSearchQuery(p.patientId); searchPatient(p.patientId); }}
                                    title={p.name}>{p.patientId}</button>
                            ))}
                        </>
                    ) : (
                        <span className="doc-demo-label" style={{opacity:0.5}}>No registered patients yet</span>
                    )}
                </div>
                </>
            )}
        </div>

        {/* Stats */}
        <div className="doc-stats-grid">
            {stats.map(s => (
                <div key={s.label} className="doc-stat-card">
                    <div className="doc-stat-top">
                        <div>
                            <p className="doc-stat-label">{s.label}</p>
                            <p className="doc-stat-value">{s.value}</p>
                            <p className="doc-stat-change">{s.change}</p>
                        </div>
                        <div className="doc-stat-icon">{s.icon}</div>
                    </div>
                </div>
            ))}
        </div>

        {/* Recent Patients - LOCKED if not verified */}
        <div className="doc-card">
            <h2 className="doc-card-title">📊 Recent Patients</h2>
            <p className="doc-card-desc">Recently registered patients on Swa-Astha</p>
            {doctor?.verificationStatus !== 'approved' ? (
                <div className="doc-locked-overlay">
                    <div className="doc-locked-icon">🔒</div>
                    <div className="doc-locked-message">You must complete profile verification to view patient details.</div>
                    <button className="btn-auth doctor-btn" onClick={() => setActivePage('verification')}>Verify Now</button>
                </div>
            ) : (
                <div className="doc-activity-list">
                    {recentPatients.length > 0 ? recentPatients.map((item, i) => (
                        <div key={i} className="doc-activity-item" style={{cursor:'pointer'}} onClick={() => { setSearchQuery(item.patientId); searchPatient(item.patientId); }}>
                            <div className="doc-activity-left">
                                <div className="doc-activity-avatar">
                                    {(item.name || '?').split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="doc-activity-name">{item.name}</p>
                                    <p className="doc-activity-action">Click to view records</p>
                                </div>
                            </div>
                            <div className="doc-activity-right">
                                <p className="doc-activity-id">{item.patientId}</p>
                            </div>
                        </div>
                    )) : (
                        <p style={{textAlign:'center', opacity:0.5, padding:'20px 0'}}>No patients registered yet. Patients will appear here after signing up.</p>
                    )}
                </div>
            )}
        </div>
    </div>
);

const ReviewField = ({ label, value }) => (
    <div className="doc-review-field">
        <span className="doc-review-label">{label}</span>
        <span className="doc-review-value">{value || '---'}</span>
    </div>
);

const FileUploadZone = ({ label, fileData, fileKey, onRemove, kycFileRefs, handleFileSelect }) => (
    <div className={`doc-upload-zone ${fileData ? 'has-file' : ''}`} onClick={() => { if (!fileData) kycFileRefs[fileKey].current.click(); }}>
        <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            ref={kycFileRefs[fileKey]}
            onChange={handleFileSelect(fileKey)}
        />
        {!fileData ? (
            <React.Fragment>
                <div className="doc-upload-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                </div>
                <p className="doc-upload-label">{label}</p>
                <p className="doc-upload-hint">Click to upload</p>
                <p className="doc-upload-hint">PDF, JPG, PNG up to 5MB</p>
            </React.Fragment>
        ) : (
            <div className="doc-upload-file">
                <div className="doc-upload-file-info">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2FA4A9" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <div>
                        <p className="doc-upload-filename">{fileData.name}</p>
                        <p className="doc-upload-filesize">{fileData.size}</p>
                    </div>
                </div>
                <button className="doc-upload-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove file">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        )}
    </div>
);

const VerificationPage = ({ 
    doctor, kycStep, setKycStep, kycForm, setKycForm, kycLoading, 
    handleKycChange, handleKycNext, handleKycSubmit, kycFiles, setKycFiles, 
    kycFileRefs, handleFileSelect, specializations, setActivePage 
}) => {
    const kycSteps = ['Basic Details', 'Documents', 'Review'];
    const canProceedStep0 = kycForm.specialization && kycForm.experience && kycForm.clinicName && kycForm.city;
    const canProceedStep1 = kycForm.regNumber && kycForm.degree;

    return (
        <div className="doc-page animate-fade-in">
            {/* Pending Approval State */}
            {doctor?.verificationStatus === 'under_review' && (
                <div className="doc-card" style={{ maxWidth: '700px', textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏳</div>
                    <h2 className="doc-card-title" style={{ margin: '0 0 8px' }}>Application Under Review</h2>
                    <p className="doc-card-desc" style={{ margin: '0 0 20px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                        Your verification application has been submitted successfully. Our team is reviewing your credentials and documents.
                    </p>
                    <div style={{ background: '#f0fdfa', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #99f6e4' }}>
                        <p style={{ margin: 0, color: '#0f766e', fontSize: '14px' }}>
                            <strong>What happens next?</strong><br />
                            Our team manually reviews every doctor application to ensure patient safety. You'll be notified once approved.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 20px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Status</p>
                            <p style={{ margin: '4px 0 0', fontWeight: 600, color: '#f59e0b' }}>⏳ Pending Review</p>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 20px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Doctor ID</p>
                            <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--teal-accent)' }}>{doctor?.doctorId}</p>
                        </div>
                    </div>
                    <button className="doc-step-back-btn" style={{ marginTop: '24px' }} onClick={() => setActivePage('home')}>← Back to Dashboard</button>
                </div>
            )}

            {/* Rejected State */}
            {doctor?.verificationStatus === 'rejected' && kycStep === 0 && (
                <div className="doc-card" style={{ maxWidth: '700px', textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>❌</div>
                    <h2 className="doc-card-title" style={{ margin: '0 0 8px', color: '#dc2626' }}>Application Rejected</h2>
                    <p className="doc-card-desc" style={{ margin: '0 0 20px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                        Your verification application was not approved. Please review your details and resubmit.
                    </p>
                    <button className="btn-auth doctor-btn" onClick={() => setKycStep(1)}>
                        Resubmit Application →
                    </button>
                    <button className="doc-step-back-btn" style={{ marginTop: '12px' }} onClick={() => setActivePage('home')}>← Back to Dashboard</button>
                </div>
            )}

            {/* KYC Form — show for unverified or rejected (resubmitting) */}
            {(doctor?.verificationStatus === 'pending' || (doctor?.verificationStatus === 'rejected' && kycStep > 0)) && (
                <div className="doc-card" style={{ maxWidth: '700px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '28px' }}>🛡️</span>
                        <div>
                            <h2 className="doc-card-title" style={{ margin: 0 }}>Profile Verification</h2>
                            <p className="doc-card-desc" style={{ margin: 0 }}>Complete the KYC process to get verified</p>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div className="doc-step-indicator">
                        {kycSteps.map((label, i) => {
                            const completed = i < kycStep;
                            const active = i === kycStep;
                            return (
                                <React.Fragment key={i}>
                                    <div className={`doc-step ${completed ? 'completed' : ''} ${active ? 'active' : ''}`}>
                                        <div className="doc-step-circle">
                                            {completed ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            ) : (
                                                <span>{i + 1}</span>
                                            )}
                                        </div>
                                        <span className="doc-step-label">{label}</span>
                                    </div>
                                    {i < kycSteps.length - 1 && <div className={`doc-step-line ${i < kycStep ? 'completed' : ''}`} />}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* STEP 0: Basic Details */}
                    {kycStep === 0 && (
                        <div className="doc-signup-step animate-fade-in">
                            <h3 className="doc-step-title">Personal & Professional Info</h3>
                            <div className="doc-form-grid">
                                <div className="doc-field full">
                                    <label>Email</label>
                                    <input type="email" placeholder="doctor@email.com" value={kycForm.email} onChange={handleKycChange('email')} spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                                </div>
                                <div className="doc-field">
                                    <label>Specialization <span className="req">*</span></label>
                                    <select value={kycForm.specialization} onChange={handleKycChange('specialization')}>
                                        <option value="">Select specialization</option>
                                        {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="doc-field">
                                    <label>Experience (years) <span className="req">*</span></label>
                                    <input placeholder="e.g. 5" value={kycForm.experience} onChange={handleKycChange('experience')} maxLength={3} spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                                </div>
                                <div className="doc-field full">
                                    <label>Gender</label>
                                    <div className="doc-gender-group">
                                        {['male', 'female', 'other'].map(g => (
                                            <button key={g} type="button" className={`doc-gender-btn ${kycForm.gender === g ? 'active' : ''}`} onClick={() => setKycForm(prev => ({ ...prev, gender: g }))}>
                                                {g.charAt(0).toUpperCase() + g.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="doc-field">
                                    <label>Clinic / Hospital <span className="req">*</span></label>
                                    <input placeholder="Clinic name" value={kycForm.clinicName} onChange={handleKycChange('clinicName')} spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                                </div>
                                <div className="doc-field">
                                    <label>City <span className="req">*</span></label>
                                    <input placeholder="City" value={kycForm.city} onChange={handleKycChange('city')} spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                                </div>
                            </div>
                            <div className="doc-step-actions">
                                <button className="doc-step-back-btn" onClick={() => setActivePage('home')}>← Back to Dashboard</button>
                                <button className="btn-auth doctor-btn" onClick={handleKycNext} disabled={!canProceedStep0}>
                                    Continue to Documents →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: Documents */}
                    {kycStep === 1 && (
                        <div className="doc-signup-step animate-fade-in">
                            <h3 className="doc-step-title">Upload Documents</h3>
                            <p className="doc-step-subtitle">Provide your credentials for verification</p>
                            <div className="doc-form-grid">
                                <div className="doc-field full">
                                    <label>Medical Registration Number <span className="req">*</span></label>
                                    <input placeholder="e.g. MCI-2020-MH-12345" value={kycForm.regNumber} onChange={handleKycChange('regNumber')} spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                                </div>
                                <div className="doc-field full">
                                    <label>Degree / Qualification <span className="req">*</span></label>
                                    <input placeholder="e.g. MBBS, MD (Cardiology)" value={kycForm.degree} onChange={handleKycChange('degree')} spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                                </div>
                            </div>
                            <div className="doc-upload-grid" style={{ marginTop: '16px' }}>
                                <FileUploadZone label="Medical License" fileData={kycFiles.license} fileKey="license" onRemove={() => setKycFiles(prev => ({ ...prev, license: null }))} kycFileRefs={kycFileRefs} handleFileSelect={handleFileSelect} />
                                <FileUploadZone label="Degree Certificate" fileData={kycFiles.degreeCert} fileKey="degreeCert" onRemove={() => setKycFiles(prev => ({ ...prev, degreeCert: null }))} kycFileRefs={kycFileRefs} handleFileSelect={handleFileSelect} />
                            </div>
                            <div className="doc-step-actions">
                                <button className="doc-step-back-btn" onClick={() => setKycStep(0)}>← Back</button>
                                <button className="btn-auth doctor-btn" onClick={handleKycNext} disabled={!canProceedStep1}>
                                    Review →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Review & Submit */}
                    {kycStep === 2 && (
                        <div className="doc-signup-step animate-fade-in">
                            <h3 className="doc-step-title">Review & Submit</h3>
                            <p className="doc-step-subtitle">Verify all information before submitting</p>
                            <div className="doc-review-section">
                                <h4 className="doc-review-heading">Personal Info</h4>
                                <div className="doc-review-grid">
                                    <ReviewField label="Name" value={doctor?.name} />
                                    <ReviewField label="Mobile" value={doctor?.phone} />
                                    {kycForm.email && <ReviewField label="Email" value={kycForm.email} />}
                                    <ReviewField label="Gender" value={kycForm.gender.charAt(0).toUpperCase() + kycForm.gender.slice(1)} />
                                </div>
                            </div>
                            <div className="doc-review-section">
                                <h4 className="doc-review-heading">Professional Info</h4>
                                <div className="doc-review-grid">
                                    <ReviewField label="Specialization" value={kycForm.specialization} />
                                    <ReviewField label="Experience" value={`${kycForm.experience} years`} />
                                    <ReviewField label="Clinic" value={kycForm.clinicName} />
                                    <ReviewField label="City" value={kycForm.city} />
                                </div>
                            </div>
                            <div className="doc-review-section">
                                <h4 className="doc-review-heading">Documents</h4>
                                <div className="doc-review-grid">
                                    <ReviewField label="Registration No." value={kycForm.regNumber} />
                                    <ReviewField label="Degree" value={kycForm.degree} />
                                </div>
                                <div className="doc-review-docs" style={{ marginTop: '8px' }}>
                                    {[
                                        { label: 'Medical License', file: kycFiles.license },
                                        { label: 'Degree Certificate', file: kycFiles.degreeCert },
                                    ].map(d => (
                                        <div key={d.label} className="doc-review-doc-item">
                                            <span>{d.label}:</span>
                                            {d.file ? (
                                                <span style={{ color: 'var(--teal-accent)', fontWeight: 500 }}>✓ {d.file.name}</span>
                                            ) : (
                                                <span style={{ color: '#999' }}>Not uploaded (optional)</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="doc-step-actions">
                                <button className="doc-step-back-btn" onClick={() => setKycStep(1)}>← Back</button>
                                <button className="btn-auth doctor-btn" onClick={handleKycSubmit} disabled={kycLoading}>
                                    {kycLoading ? 'Submitting...' : '✓ Submit Verification'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ProfilePage = ({ doctor, initials, profileEditing, setProfileEditing, profileForm, setProfileForm, handleProfileSave }) => (
    <div className="doc-page animate-fade-in">
        {/* Profile Header Card */}
        <div className="doc-card doc-profile-header">
            <div className="doc-profile-top">
                <div className="doc-profile-avatar">{initials}</div>
                <div className="doc-profile-info">
                    <h2 className="doc-profile-name">
                        {doctor?.name}
                        {doctor?.isVerified && (
                            <span className="doc-verified-inline">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2FA4A9" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
                            </span>
                        )}
                    </h2>
                    <p className="doc-profile-sub">{doctor?.specialization || 'Specialist'} · {doctor?.degree || 'MBBS'}</p>
                    <p className="doc-profile-sub">{doctor?.clinicName}{doctor?.city ? `, ${doctor.city}` : ''}</p>
                    {doctor?.isVerified ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#2FA4A9', background: 'rgba(47,164,169,0.1)', padding: '3px 10px', borderRadius: '12px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
                            Verified Doctor
                        </span>
                    ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: '12px' }}>
                            ⚠ Verification Pending
                        </span>
                    )}
                </div>
                {!profileEditing ? (
                    <button className="doc-profile-edit-btn" onClick={() => setProfileEditing(true)}>✏️ Edit</button>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="doc-profile-edit-btn" style={{ background: 'var(--teal-accent)', color: '#fff' }} onClick={handleProfileSave}>💾 Save</button>
                        <button className="doc-profile-edit-btn" onClick={() => setProfileEditing(false)}>✕ Cancel</button>
                    </div>
                )}
            </div>
        </div>

        {/* Verified Credentials (locked) */}
        <div className="doc-card">
            <h3 className="doc-card-title">🔒 Verified Credentials</h3>
            <p className="doc-card-desc">These details are verified and cannot be changed. Contact admin for corrections.</p>
            <div className="doc-profile-grid">
                {[
                    { label: 'Doctor ID', value: doctor?.doctorId },
                    { label: 'Full Name', value: doctor?.name },
                    { label: 'Gender', value: doctor?.gender ? doctor.gender.charAt(0).toUpperCase() + doctor.gender.slice(1) : 'Not set' },
                    { label: 'Email', value: doctor?.email || 'Not set' },
                    { label: 'Phone', value: doctor?.phone },
                    { label: 'Registration No.', value: doctor?.registrationNumber || 'Auto-assigned' },
                    { label: 'Degree', value: doctor?.degree || 'MBBS' },
                    { label: 'Member Since', value: doctor?.created_at ? new Date(doctor.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '---' },
                ].map(f => (
                    <div key={f.label} className="doc-profile-field locked">
                        <label>
                            {f.label}
                            <svg className="doc-lock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </label>
                        <p>{f.value || '---'}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* Editable Practice Info */}
        <div className="doc-card">
            <h3 className="doc-card-title">🏥 Practice Information</h3>
            <p className="doc-card-desc">{profileEditing ? 'Update your practice details below' : 'Your current practice information'}</p>
            <div className="doc-profile-grid">
                {[
                    { key: 'specialization', label: 'Specialization' },
                    { key: 'degree', label: 'Degree' },
                    { key: 'clinicName', label: 'Clinic / Hospital' },
                    { key: 'city', label: 'City' },
                    { key: 'experience', label: 'Years of Experience' },
                ].map(f => (
                    <div key={f.key} className="doc-profile-field">
                        <label>{f.label}</label>
                        {profileEditing ? (
                            <input
                                className="doc-profile-input"
                                value={profileForm[f.key] || ''}
                                onChange={e => setProfileForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={f.label}
                            />
                        ) : (
                            <p>{doctor?.[f.key] || '---'}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Languages & About */}
        <div className="doc-card">
            <h3 className="doc-card-title">🗣 Additional Details</h3>
            <div className="doc-profile-details-section">
                <div className="doc-profile-field full-width">
                    <label>Languages Spoken</label>
                    {profileEditing ? (
                        <input
                            className="doc-profile-input"
                            value={profileForm.languages || ''}
                            onChange={e => setProfileForm(prev => ({ ...prev, languages: e.target.value }))}
                            placeholder="Hindi, English, Marathi"
                        />
                    ) : (
                        <div className="doc-lang-tags">
                            {(Array.isArray(doctor?.languages) ? doctor.languages : ['Hindi', 'English']).map(lang => (
                                <span key={lang} className="doc-lang-tag">{lang}</span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="doc-profile-field full-width" style={{ marginTop: '16px' }}>
                    <label>About</label>
                    {profileEditing ? (
                        <textarea
                            className="doc-profile-input doc-profile-textarea"
                            rows={3}
                            value={profileForm.about || ''}
                            onChange={e => setProfileForm(prev => ({ ...prev, about: e.target.value }))}
                            placeholder="Write 2-3 lines about your expertise..."
                        />
                    ) : (
                        <p className="doc-about-text">{doctor?.about || 'No description added yet.'}</p>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const PatientHistoryPage = ({ doctor, setActivePage, patientLoading, patientData, selectedRecord, setSelectedRecord, searchQuery, setSearchQuery, searchPatient }) => (
    <div className="doc-page animate-fade-in">
        {doctor?.verificationStatus !== 'approved' ? (
            <div className="doc-card doc-empty-state">
                <div className="doc-empty-icon">🔒</div>
                <h2>Access Restricted</h2>
                <p>You must complete profile verification to view patient details.</p>
                <button className="btn-auth doctor-btn" onClick={() => setActivePage('verification')}>Verify Now</button>
            </div>
        ) : (
            <>
            <button className="doc-back-btn" onClick={() => setActivePage('home')}>
                ← Back to Dashboard
            </button>
            
            {patientLoading && (
                <div className="doc-loading">
                    <div className="doc-spinner" />
                    <p>Searching patient...</p>
                </div>
            )}
            {!patientLoading && !patientData && (
                <div className="doc-card doc-empty-state">
                    <div className="doc-empty-icon">🔍</div>
                    <h2>No Patient Found</h2>
                    <p>No patient registered with that ID. Please verify the 6-digit Swa-Astha ID and try again.</p>
                    <button className="doc-search-btn" onClick={() => setActivePage('home')}>Search Again</button>
                </div>
            )}
            {!patientLoading && patientData && (
                <React.Fragment>
                    <div className="doc-card doc-patient-header">
                        <div className="doc-patient-top">
                            <div className="doc-patient-avatar">
                                {(patientData.name || '?').split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="doc-patient-info">
                                <h2 className="doc-patient-name">{patientData.name}</h2>
                                <p className="doc-patient-sub">ID: {patientData.patientId} · {patientData.gender} · {patientData.age}y</p>
                            </div>
                        </div>
                    </div>

                    <div className="doc-card">
                        <h3 className="doc-card-title">📜 Medical Records</h3>
                        {(!patientData.records || patientData.records.length === 0) ? (
                            <p style={{textAlign:'center', opacity:0.5, padding:'20px 0'}}>No records found for this patient.</p>
                        ) : (
                            <div className="doc-records-list">
                                {patientData.records.map((rec, i) => (
                                    <div key={i} className="doc-record-item" onClick={() => setSelectedRecord(rec)}>
                                        <div className="doc-record-left">
                                            <div className="doc-record-icon">📄</div>
                                            <div>
                                                <p className="doc-record-type">{rec.type || 'Medical Record'}</p>
                                                <p className="doc-record-date">{new Date(rec.timestamp).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="doc-record-right">
                                            <button className="doc-view-btn">View Details</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </React.Fragment>
            )}

            {/* Record Detail Modal */}
            {selectedRecord && (
                <div className="doc-modal-overlay animate-fade-in" onClick={() => setSelectedRecord(null)}>
                    <div className="doc-modal animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="doc-modal-header">
                            <h3>Record Details</h3>
                            <button className="doc-modal-close" onClick={() => setSelectedRecord(null)}>✕</button>
                        </div>
                        <div className="doc-modal-body">
                            <p><strong>Type:</strong> {selectedRecord.type}</p>
                            <p><strong>Date:</strong> {new Date(selectedRecord.timestamp).toLocaleString()}</p>
                            <div className="doc-modal-sep" />
                            {selectedRecord.medicines && (
                                <div>
                                    <p><strong>Prescribed Medicines:</strong></p>
                                    <ul className="doc-med-list">
                                        {selectedRecord.medicines.map((m, i) => (
                                            <li key={i}>{m.name} - {m.dosage}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {selectedRecord.notes && (
                                <div>
                                    <p><strong>Clinical Notes:</strong></p>
                                    <p className="doc-notes">{selectedRecord.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </>
        )}
    </div>
);

const SettingsPage = ({ doctor, handleLogout, setActivePage }) => (
    <div className="doc-page animate-fade-in">
        <div className="doc-card">
            <h2 className="doc-card-title">⚙️ Account Settings</h2>
            <div className="doc-settings-list">
                <div className="doc-settings-section">
                    <h3>Security</h3>
                    <button className="doc-settings-item">
                        <span>🔑 Change Password</span>
                        <span>→</span>
                    </button>
                    <button className="doc-settings-item">
                        <span>📱 Two-Factor Authentication</span>
                        <span className="doc-badge-soon">Soon</span>
                    </button>
                </div>
                <div className="doc-settings-section">
                    <h3>System</h3>
                    <div className="doc-settings-item-row">
                        <span>🌙 Dark Mode</span>
                        <div className="doc-toggle disabled" />
                    </div>
                    <div className="doc-settings-item-row">
                        <span>🔔 Desktop Notifications</span>
                        <div className="doc-toggle active" />
                    </div>
                </div>
                <div className="doc-settings-section">
                    <h3>Danger Zone</h3>
                    <button className="doc-settings-item logout" onClick={handleLogout}>
                        <span>🚪 Logout from Account</span>
                    </button>
                </div>
            </div>
        </div>
        <div style={{textAlign:'center', marginTop:'32px', opacity:0.3, fontSize:'0.7rem'}}>
            Swa-Astha Doctor Portal v1.0.4 · Build 2024.0.1
        </div>
    </div>
);

window.DoctorDashboard = () => {
    const { useState, useEffect, useRef, useMemo, useCallback } = React;
    const { navigateTo, showNotification } = window.useApp();
    const Icons = window.Icons;
    const AppLogo = window.AppLogo;

    // ── State ──
    const [doctor, setDoctor] = useState(() => {
        const stored = localStorage.getItem('swa_doctor');
        return stored ? JSON.parse(stored) : null;
    });
    const [activePage, setActivePage] = useState('home'); // home | patient | profile | settings | verification
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [patientData, setPatientData] = useState(null);
    const [patientLoading, setPatientLoading] = useState(false);
    const [patientRecords, setPatientRecords] = useState([]);
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [profileEditing, setProfileEditing] = useState(false);
    const [profileForm, setProfileForm] = useState({});

    // ── KYC Verification State ──
    const [kycStep, setKycStep] = useState(0);
    const [kycLoading, setKycLoading] = useState(false);
    const specializations = [
        'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics',
        'Dermatology', 'Neurology', 'Ophthalmology', 'Psychiatry',
        'Gynecology', 'ENT', 'Radiology', 'Pathology', 'Other'
    ];
    const [kycForm, setKycForm] = useState({
        email: '', specialization: '', experience: '', gender: 'male',
        clinicName: '', city: '', regNumber: '', degree: '',
    });
    const [kycFiles, setKycFiles] = useState({ license: null, degreeCert: null });

    // ── KYC Handlers (in parent scope to prevent re-render/remount) ──
    const handleKycChange = useCallback((field) => (e) => {
        let value = e.target.value;
        if (field === 'experience') value = value.replace(/\D/g, '');
        setKycForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const kycFileRefs = {
        license: useRef(null),
        degreeCert: useRef(null),
    };
    const handleFileSelect = useCallback((key) => (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setKycFiles(prev => ({
            ...prev,
            [key]: {
                name: file.name,
                size: (file.size / 1024 > 1024 ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : Math.round(file.size / 1024) + ' KB'),
                file: file
            }
        }));
    }, []);

    const canProceedStep0 = kycForm.specialization && kycForm.experience && kycForm.clinicName && kycForm.city;
    const canProceedStep1 = kycForm.regNumber && kycForm.degree;

    const handleKycNext = useCallback(() => {
        if (kycStep === 0 && !(kycForm.specialization && kycForm.experience && kycForm.clinicName && kycForm.city)) {
            showNotification('Please fill all required fields'); return;
        }
        if (kycStep === 1 && !(kycForm.regNumber && kycForm.degree)) {
            showNotification('Please fill registration number and degree'); return;
        }
        setKycStep(prev => prev + 1);
    }, [kycStep, kycForm, showNotification]);

    const handleKycSubmit = useCallback(async () => {
        setKycLoading(true);
        const token = localStorage.getItem('doctor_token');
        try {
            const res = await fetch('/api/doctor/verify', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: kycForm.email,
                    specialization: kycForm.specialization,
                    experience: kycForm.experience,
                    gender: kycForm.gender,
                    clinicName: kycForm.clinicName,
                    city: kycForm.city,
                    registrationNumber: kycForm.regNumber,
                    degree: kycForm.degree,
                })
            });
            const data = await res.json();
            if (!res.ok) { showNotification(data.message || 'Verification failed'); return; }
            setDoctor(data.doctor);
            localStorage.setItem('swa_doctor', JSON.stringify(data.doctor));
            showNotification('Application submitted! Our team will review and approve your profile.', 'success');
            setActivePage('home');
        } catch (err) {
            showNotification('Server error. Please try again.');
        } finally {
            setKycLoading(false);
        }
    }, [kycForm, showNotification]);

    // Initialize KYC form from doctor data
    useEffect(() => {
        if (doctor) {
            setKycForm(prev => ({
                ...prev,
                email: doctor.email || '',
                specialization: doctor.specialization || '',
                experience: doctor.experience || '',
                gender: doctor.gender || 'male',
                clinicName: doctor.clinicName || '',
                city: doctor.city || '',
                regNumber: doctor.registrationNumber || '',
                degree: doctor.degree || '',
            }));
        }
    }, [doctor]);

    // ── Recent patients (fetched from backend) ──
    const [recentPatients, setRecentPatients] = useState([]);

    // Fetch recent real patients on mount
    useEffect(() => {
        const token = localStorage.getItem('doctor_token');
        if (token) {
            fetch('/api/doctor/patients/recent', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d && d.patients) setRecentPatients(d.patients); })
                .catch(() => {});
        }
    }, []);

    const stats = [
        { label: 'Total Patients', value: '128', icon: '👥', change: '+12 this week' },
        { label: 'Records Today', value: '24', icon: '📋', change: '8 unique patients' },
        { label: 'Active Consults', value: '6', icon: '💊', change: '3 follow-ups' },
        { label: 'Avg. Review', value: '4.2 min', icon: '⏱', change: 'Per patient record' },
    ];

    const typeLabels = {
        'blood-test': 'Blood Test', 'scan': 'Scan Report', 'prescription': 'Prescription',
        'bill': 'Medical Bill', 'insurance': 'Insurance', 'other': 'Other'
    };
    const typeIcons = {
        'blood-test': '🩸', 'scan': '📷', 'prescription': '📝', 'bill': '🧾', 'insurance': '🛡', 'other': '📁'
    };
    const typeColors = {
        'blood-test': '#ef4444', 'scan': '#3b82f6', 'prescription': '#10b981',
        'bill': '#f59e0b', 'insurance': '#8b5cf6', 'other': '#6b7280'
    };

    // ── Load profile from backend ──
    useEffect(() => {
        const token = localStorage.getItem('doctor_token');
        if (token && doctor) {
            fetch('/api/doctor/profile', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d) { setDoctor(d); localStorage.setItem('swa_doctor', JSON.stringify(d)); } })
                .catch(() => {});
        }
    }, []);

    // ── Initialize profile form when switching to profile page ──
    useEffect(() => {
        if (activePage === 'profile' && doctor) {
            setProfileForm({
                clinicName: doctor.clinicName || '',
                city: doctor.city || '',
                specialization: doctor.specialization || '',
                experience: doctor.experience || '',
                degree: doctor.degree || '',
                languages: (Array.isArray(doctor.languages) ? doctor.languages : ['Hindi', 'English']).join(', '),
                about: doctor.about || ''
            });
        }
    }, [activePage]);

    // ── Search Patient ──
    const searchPatient = useCallback(async (id) => {
        let searchId = (id || searchQuery).trim().toUpperCase();
        if (!searchId) { showNotification('Enter a patient ID'); return; }
        // Auto-prefix SWA- if user typed bare digits
        if (/^\d{6}$/.test(searchId)) searchId = `SWA-${searchId}`;
        setPatientLoading(true);
        setPatientData(null);
        const token = localStorage.getItem('doctor_token');
        try {
            const res = await fetch(`/api/doctor/patient/${encodeURIComponent(searchId)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.found) {
                setPatientData(data.patient);
                setPatientRecords(data.records || []);
                setActivePage('patient');
                setTypeFilter('all');
                showNotification('Patient found!', 'success');
            } else {
                showNotification(data.message || 'Patient not found');
                setPatientData(null);
                setPatientRecords([]);
                setActivePage('patient');
            }
        } catch (err) {
            showNotification('Server error. Try again.');
        } finally {
            setPatientLoading(false);
        }
    }, [searchQuery]);

    // ── Filtered Records ──
    const filteredRecords = useMemo(() => {
        if (typeFilter === 'all') return patientRecords;
        return patientRecords.filter(r => r.type === typeFilter);
    }, [patientRecords, typeFilter]);

    const groupedRecords = useMemo(() => {
        const groups = [];
        let currentLabel = '';
        filteredRecords.forEach(r => {
            const d = new Date(r.date);
            const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            if (label !== currentLabel) {
                currentLabel = label;
                groups.push({ label, records: [r] });
            } else {
                groups[groups.length - 1].records.push(r);
            }
        });
        return groups;
    }, [filteredRecords]);

    // ── Logout ──
    const handleLogout = () => {
        localStorage.removeItem('doctor_token');
        localStorage.removeItem('swa_doctor');
        showNotification('Logged out successfully', 'info');
        navigateTo('splash');
    };

    // ── Profile Submit ──
    const handleProfileSave = async () => {
        const token = localStorage.getItem('doctor_token');
        try {
            const res = await fetch('/api/doctor/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(profileForm)
            });
            const data = await res.json();
            if (res.ok) {
                setDoctor(data.doctor);
                localStorage.setItem('swa_doctor', JSON.stringify(data.doctor));
                setProfileEditing(false);
                showNotification('Profile updated!', 'success');
            }
        } catch (err) { showNotification('Failed to update profile'); }
    };

    // ── Initials ──
    const initials = (doctor?.name || 'DR').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();


    // ══════════════════════════════════════
    //  MAIN RENDER
    // ══════════════════════════════════════
    
    // Create stable references for the current page components
    const ActivePageComponent = useMemo(() => {
        switch (activePage) {
            case 'home':
                return (
                    <DashboardHome 
                        doctor={doctor} 
                        setActivePage={setActivePage} 
                        stats={stats} 
                        recentPatients={recentPatients} 
                        searchQuery={searchQuery} 
                        setSearchQuery={setSearchQuery} 
                        searchPatient={searchPatient} 
                        patientLoading={patientLoading} 
                    />
                );
            case 'patient':
                return (
                    <PatientHistoryPage 
                        doctor={doctor} 
                        setActivePage={setActivePage} 
                        patientLoading={patientLoading} 
                        patientData={patientData} 
                        selectedRecord={selectedRecord} 
                        setSelectedRecord={setSelectedRecord} 
                        searchQuery={searchQuery} 
                        setSearchQuery={setSearchQuery} 
                        searchPatient={searchPatient} 
                    />
                );
            case 'profile':
                return (
                    <ProfilePage 
                        doctor={doctor} 
                        initials={initials} 
                        profileEditing={profileEditing} 
                        setProfileEditing={setProfileEditing} 
                        profileForm={profileForm} 
                        setProfileForm={setProfileForm} 
                        handleProfileSave={handleProfileSave} 
                    />
                );
            case 'verification':
                return (
                    <VerificationPage 
                        doctor={doctor} 
                        kycStep={kycStep} 
                        setKycStep={setKycStep} 
                        kycForm={kycForm} 
                        setKycForm={setKycForm} 
                        kycLoading={kycLoading} 
                        handleKycChange={handleKycChange} 
                        handleKycNext={handleKycNext} 
                        handleKycSubmit={handleKycSubmit} 
                        kycFiles={kycFiles} 
                        setKycFiles={setKycFiles} 
                        kycFileRefs={kycFileRefs} 
                        handleFileSelect={handleFileSelect} 
                        specializations={specializations} 
                        setActivePage={setActivePage} 
                    />
                );
            case 'settings':
                return (
                    <SettingsPage
                        doctor={doctor}
                        handleLogout={handleLogout}
                        setActivePage={setActivePage}
                    />
                );
            case 'chat':
                return <DoctorChatPage />;
            default:
                return null;
        }
    }, [
        activePage, doctor, stats, recentPatients, searchQuery, patientLoading, patientData, 
        selectedRecord, profileEditing, profileForm, kycStep, kycForm, kycLoading, kycFiles, 
        initials, setKycForm, setKycFiles, specializations, setActivePage, handleLogout, 
        handleKycChange, handleKycNext, handleKycSubmit, handleFileSelect, handleProfileSave, searchPatient
    ]);

    return (
        <div className="doc-dashboard-container">
            <Sidebar 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen} 
                activePage={activePage} 
                setActivePage={setActivePage} 
                doctor={doctor} 
                initials={initials} 
                handleLogout={handleLogout} 
                AppLogo={AppLogo} 
            />
            <div className="doc-main">
                <TopBar 
                    setSidebarOpen={setSidebarOpen} 
                    setActivePage={setActivePage} 
                    activePage={activePage} 
                    initials={initials} 
                />
                <main className="doc-content">
                    {ActivePageComponent}
                </main>
            </div>
        </div>
    );
};
