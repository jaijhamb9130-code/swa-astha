// ============================================
// PROFILE SCREEN - Shows User Data + Saved BMI
// Uses AppContext logout, animated sign out
// ============================================

window.ProfileScreen = () => {
    const { useState } = React;
    const { navigateTo, user, logout, showNotification, healthHistory, addHealthRecord, startDownload, downloads, downloadedFiles, updateUser } = window.useApp();
    const Icons = window.Icons;

    const [signingOut, setSigningOut] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const openDocs = localStorage.getItem('swa_open_docs');
        if (openDocs) { localStorage.removeItem('swa_open_docs'); return 'docs'; }
        return 'profile';
    });
    const [docFilter, setDocFilter] = useState('all');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        age: user?.age || '',
        gender: user?.gender || ''
    });

    // Load saved health metrics for this user
    const userKey = user?.phone ? `swa_health_${user.phone}` : null;
    const savedHealth = userKey ? (() => {
        const saved = localStorage.getItem(userKey);
        return saved ? JSON.parse(saved) : null;
    })() : null;

    // Compute BMI from saved data
    const savedBmi = (() => {
        if (!savedHealth || !savedHealth.feet || !savedHealth.weight) return null;
        const ft = parseInt(savedHealth.feet) || 0;
        const inch = parseInt(savedHealth.inches) || 0;
        const w = parseFloat(savedHealth.weight);
        if (!ft || !w) return null;
        const heightM = ((ft * 12) + inch) * 2.54 / 100;
        const bmi = w / (heightM * heightM);
        let category = '', color = '';
        if (bmi < 18.5) { category = 'Underweight'; color = '#FFB74D'; }
        else if (bmi < 25) { category = 'Normal'; color = '#66BB6A'; }
        else if (bmi < 30) { category = 'Overweight'; color = '#FFA726'; }
        else { category = 'Obese'; color = '#EF5350'; }
        return { value: bmi.toFixed(1), category, color };
    })();

    // Get download status for a given file name
    const getDownloadStatus = (name) => {
        const dl = downloads?.find(d => d.fileName === name);
        if (dl) return dl.status;
        if (downloadedFiles?.includes(name)) return 'downloaded';
        return null;
    };

    const handleSignOut = () => {
        setSigningOut(true);
        setTimeout(() => {
            logout();
        }, 700);
    };

    const handleSaveProfile = async () => {
        const ok = await updateUser({
            name: formData.name,
            age: formData.age,
            gender: formData.gender
        });
        if (ok) {
            showNotification('Profile updated successfully!', 'success');
        } else {
            showNotification('Failed to update profile. Try again.', 'error');
        }
        setEditMode(false);
    };

    // ── Sample data mirroring Reports and Bills screens (always shown in Medical History) ──
    const sampleReports = [
        { id: 'sample-rpt-1', title: 'Blood Test Report', category: 'report', source: 'reports', date: '12 Feb 2026', timestamp: new Date('2026-02-12').getTime(), meta: { hospital: 'Apollo Hospital', doctor: 'Dr. Mehra', fileType: 'PDF', size: 1258291 } },
        { id: 'sample-rpt-2', title: 'Prescription \u2013 Dr. Gupta', category: 'prescription', source: 'reports', date: '05 Jan 2026', timestamp: new Date('2026-01-05').getTime(), meta: { hospital: 'Max Healthcare', doctor: 'Dr. Gupta', fileType: 'JPG' } },
        { id: 'sample-rpt-3', title: 'Vaccination Certificate', category: 'report', source: 'reports', date: '20 Dec 2025', timestamp: new Date('2025-12-20').getTime(), meta: { hospital: 'City Hospital', doctor: 'Dr. Sharma', fileType: 'PDF', size: 2202009 } },
        { id: 'sample-rpt-4', title: 'X-Ray \u2013 Chest', category: 'report', source: 'reports', date: '15 Nov 2025', timestamp: new Date('2025-11-15').getTime(), meta: { hospital: 'AIIMS', doctor: 'Dr. Verma', fileType: 'DICOM' } },
        { id: 'sample-rpt-5', title: 'Eye Checkup Report', category: 'report', source: 'reports', date: '02 Oct 2025', timestamp: new Date('2025-10-02').getTime(), meta: { hospital: 'Shankar Netralaya', doctor: 'Dr. Iyer', fileType: 'PDF' } },
    ];
    const sampleBills = [
        { id: 'sample-bil-1', title: 'Apollo Hospital', category: 'bill', source: 'bills', date: '10 Jan 2026', timestamp: new Date('2026-01-10').getTime(), meta: { hospital: 'Apollo Hospital', amount: 15500, status: 'Paid' } },
        { id: 'sample-bil-2', title: 'City Medical Center', category: 'bill', source: 'bills', date: '05 Jan 2026', timestamp: new Date('2026-01-05').getTime(), meta: { hospital: 'City Medical Center', amount: 3200, status: 'Pending' } },
        { id: 'sample-bil-3', title: 'LifeCare Diagnostics', category: 'bill', source: 'bills', date: '28 Dec 2025', timestamp: new Date('2025-12-28').getTime(), meta: { hospital: 'LifeCare Diagnostics', amount: 850, status: 'Paid' } },
    ];
    // Merge real history + sample data, deduplicate by title, sort newest first
    const allRecords = React.useMemo(() => {
        const combined = [...healthHistory, ...sampleReports, ...sampleBills];
        const seen = new Set();
        const unique = [];
        for (const rec of combined) {
            const key = (rec.title || '').toLowerCase().trim();
            if (!seen.has(key)) { seen.add(key); unique.push(rec); }
        }
        return unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [healthHistory]);
    const filteredRecords = docFilter === 'all' ? allRecords : allRecords.filter(r => r.category === docFilter);

    const categoryMeta = {
        report:       { icon: '📋', color: '#42A5F5', label: 'Report' },
        prescription: { icon: '💊', color: '#AB47BC', label: 'Prescription' },
        bill:         { icon: '🏥', color: '#FF7043', label: 'Bill' },
        scan:         { icon: '📷', color: '#26A69A', label: 'Scan' },
        order:        { icon: '📦', color: '#66BB6A', label: 'Order' }
    };

    const filterTabs = [
        { key: 'all', label: 'All', count: allRecords.length },
        { key: 'report', label: 'Reports', count: allRecords.filter(r => r.category === 'report').length },
        { key: 'prescription', label: 'Rx', count: allRecords.filter(r => r.category === 'prescription').length },
        { key: 'bill', label: 'Bills', count: allRecords.filter(r => r.category === 'bill').length }
    ].filter(t => t.key === 'all' || t.count > 0);

    const formatDate = (rec) => {
        if (rec.date && typeof rec.date === 'string') return rec.date;
        if (rec.timestamp) { const d = new Date(rec.timestamp); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
        return 'Unknown';
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1024).toFixed(0) + ' KB';
    };

    // ── Edit Profile View ──
    if (editMode) {
        return (
            <div className="screen profile-screen active">
                <div className="profile-hdr">
                    <div className="btn-back" onClick={() => setEditMode(false)}><Icons.Back /></div>
                    <h1 className="profile-hdr-title">Edit Profile</h1>
                </div>
                <div className="profile-body">
                    {/* Avatar at top */}
                    <div className="ep-avatar-section animate-slide-up">
                        <div className="ep-avatar-circle">
                            {formData.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="ep-avatar-hint">Tap to change photo</span>
                    </div>

                    <div className="ep-form animate-slide-up">
                        {/* Full Name */}
                        <div className="ep-field">
                            <label className="ep-label">
                                <span className="ep-label-icon">👤</span>
                                Full Name
                            </label>
                            <div className="ep-input-box">
                                <input
                                    type="text"
                                    className="ep-input"
                                    placeholder="Enter your full name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false"
                                />
                            </div>
                        </div>

                        {/* Phone (read-only) */}
                        <div className="ep-field">
                            <label className="ep-label">
                                <span className="ep-label-icon">📱</span>
                                Phone Number
                            </label>
                            <div className="ep-input-box disabled">
                                <input
                                    type="text"
                                    className="ep-input"
                                    value={user?.phone || ''}
                                    disabled
                                />
                                <span className="ep-verified-badge">✓ Verified</span>
                            </div>
                        </div>

                        {/* Age */}
                        <div className="ep-field">
                            <label className="ep-label">
                                <span className="ep-label-icon">🎂</span>
                                Age
                            </label>
                            <div className="ep-input-box">
                                <input
                                    type="number"
                                    className="ep-input"
                                    placeholder="Enter your age"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                                    min="1"
                                    max="120"
                                    spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false"
                                />
                            </div>
                        </div>

                        {/* Gender */}
                        <div className="ep-field">
                            <label className="ep-label">
                                <span className="ep-label-icon">⚧️</span>
                                Gender
                            </label>
                            <div className="ep-gender-group">
                                {['Male', 'Female', 'Other'].map(g => (
                                    <button
                                        key={g}
                                        className={`ep-gender-btn ${formData.gender === g ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, gender: g })}
                                    >
                                        {g === 'Male' ? '👨' : g === 'Female' ? '👩' : '🧑'} {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <button className="ep-save-btn" onClick={handleSaveProfile}>
                            <span>Save Changes</span>
                            <span className="ep-save-arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Documents View ──
    if (activeTab === 'docs') {
        const reportCount = allRecords.filter(r => r.category === 'report').length;
        const rxCount = allRecords.filter(r => r.category === 'prescription').length;
        const billCount = allRecords.filter(r => r.category === 'bill').length;

        return (
            <div className="screen profile-screen active">
                <div className="profile-hdr">
                    <div className="btn-back" onClick={() => setActiveTab('profile')}><Icons.Back /></div>
                    <h1 className="profile-hdr-title">Health Records</h1>
                </div>
                <div className="profile-body">
                    {/* Stats Summary */}
                    <div className="pdoc-stats animate-slide-up">
                        <div className="pdoc-stat-card">
                            <span className="pdoc-stat-icon">📋</span>
                            <span className="pdoc-stat-num">{allRecords.length}</span>
                            <span className="pdoc-stat-label">Total</span>
                        </div>
                        <div className="pdoc-stat-divider"></div>
                        <div className="pdoc-stat-card">
                            <span className="pdoc-stat-icon">📄</span>
                            <span className="pdoc-stat-num">{reportCount}</span>
                            <span className="pdoc-stat-label">Reports</span>
                        </div>
                        <div className="pdoc-stat-divider"></div>
                        <div className="pdoc-stat-card">
                            <span className="pdoc-stat-icon">💊</span>
                            <span className="pdoc-stat-num">{rxCount}</span>
                            <span className="pdoc-stat-label">Rx</span>
                        </div>
                        <div className="pdoc-stat-divider"></div>
                        <div className="pdoc-stat-card">
                            <span className="pdoc-stat-icon">🧾</span>
                            <span className="pdoc-stat-num">{billCount}</span>
                            <span className="pdoc-stat-label">Bills</span>
                        </div>
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="pdoc-filter-tabs animate-slide-up" style={{ animationDelay: '0.08s' }}>
                        {filterTabs.map(t => (
                            <div
                                key={t.key}
                                className={`pdoc-filter-tab ${docFilter === t.key ? 'active' : ''}`}
                                onClick={() => setDocFilter(t.key)}
                            >
                                {t.label} <span className="pdoc-filter-count">{t.count}</span>
                            </div>
                        ))}
                    </div>

                    {/* Section Title */}
                    <div className="pdoc-section-hdr animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <h3>{docFilter === 'all' ? 'All Records' : filterTabs.find(t => t.key === docFilter)?.label || 'Records'}</h3>
                        <span className="pdoc-section-count">{filteredRecords.length} items</span>
                    </div>

                    {/* Records List */}
                    <div className="pdoc-list">
                        {filteredRecords.length === 0 ? (
                            <div className="pdoc-empty animate-slide-up" style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.6 }}>
                                <span style={{ fontSize: 40 }}>📭</span>
                                <p style={{ marginTop: 8, fontSize: 14 }}>No records yet. Upload or scan to get started!</p>
                            </div>
                        ) : filteredRecords.map((rec, i) => {
                            const cat = categoryMeta[rec.category] || categoryMeta.report;
                            const sizeStr = formatSize(rec.meta?.size);
                            const sourceLabels = { reports: 'Reports', pharmacy: 'Pharmacy', bills: 'Bills', profile: 'Profile' };
                            return (
                                <div key={rec.id || i} className="pdoc-card animate-slide-up" style={{ animationDelay: `${0.12 + i * 0.05}s` }}>
                                    <div className="pdoc-card-icon" style={{ background: `${cat.color}15`, color: cat.color }}>
                                        <span>{cat.icon}</span>
                                    </div>
                                    <div className="pdoc-card-body">
                                        <span className="pdoc-card-name">{rec.title || rec.name || 'Untitled'}</span>
                                        <div className="pdoc-card-meta">
                                            <span>{formatDate(rec)}</span>
                                            <span className="pdoc-meta-dot">·</span>
                                            <span className="pdoc-type-badge" style={{ background: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
                                            {rec.source && (<>
                                                <span className="pdoc-meta-dot">·</span>
                                                <span style={{ fontSize: 11, opacity: 0.7 }}>{sourceLabels[rec.source] || rec.source}</span>
                                            </>)}
                                            {sizeStr && (<>
                                                <span className="pdoc-meta-dot">·</span>
                                                <span>{sizeStr}</span>
                                            </>)}
                                        </div>
                                        {rec.meta?.medicines && rec.meta.medicines.length > 0 && (
                                            <div className="pdoc-card-rx-preview">
                                                {rec.meta.medicines.slice(0, 3).map((m, j) => (
                                                    <span key={j} className="pdoc-rx-pill">{m.name || m}</span>
                                                ))}
                                                {rec.meta.medicines.length > 3 && <span className="pdoc-rx-pill more">+{rec.meta.medicines.length - 3}</span>}
                                            </div>
                                        )}
                                        {rec.meta?.doctor && (
                                            <span className="pdoc-card-doctor">👨‍⚕️ {rec.meta.doctor}</span>
                                        )}
                                        {rec.category === 'bill' && rec.meta && (
                                            <div className="pdoc-card-bill-info">
                                                {rec.meta.amount !== undefined && rec.meta.amount > 0 && (
                                                    <span className="pdoc-bill-amount">₹{rec.meta.amount.toLocaleString('en-IN')}</span>
                                                )}
                                                {rec.meta.status && (
                                                    <span className={`pdoc-bill-status ${rec.meta.status.toLowerCase()}`}>
                                                        {rec.meta.status === 'Paid' ? '✅' : '⏳'} {rec.meta.status}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {(() => {
                                        const dlStatus = getDownloadStatus(rec.title || 'record');
                                        const isDone = dlStatus === 'complete' || dlStatus === 'exiting' || dlStatus === 'downloaded';
                                        return (
                                            <button
                                                className={`pdoc-card-dl ${dlStatus === 'downloading' ? 'dl-active' : ''} ${isDone ? 'dl-done' : ''}`}
                                                onClick={() => {
                                                    if (dlStatus === 'downloaded') {
                                                        showNotification(`Opening ${rec.title || 'record'}...`, 'success');
                                                    } else if (!dlStatus) {
                                                        startDownload(rec.title || 'record');
                                                    }
                                                }}
                                                disabled={dlStatus === 'downloading'}>
                                                {dlStatus === 'downloading' ? (
                                                    <svg className="dl-icon-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                        <path d="M12 2a10 10 0 0 1 10 10" />
                                                    </svg>
                                                ) : isDone ? (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="6 12 10 16 18 8" />
                                                    </svg>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                        <polyline points="7 10 12 15 17 10"/>
                                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>

                    {/* Go to full Reports */}
                    <div className="pdoc-footer animate-slide-up" style={{ animationDelay: '0.35s' }}>
                        <button className="pdoc-view-all-btn" onClick={() => navigateTo('reports')}>
                            <span>Go to Reports & Scanner</span>
                            <span className="pdoc-btn-arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`screen profile-screen active ${signingOut ? 'profile-exit' : 'profile-enter'}`}>
            <div className="profile-hdr">
                <div className="btn-back" onClick={() => navigateTo('home')}><Icons.Back /></div>
                <h1 className="profile-hdr-title">My Profile</h1>
            </div>

            <div className="profile-body">
                {/* Avatar Card */}
                <div className="profile-avatar-card animate-slide-up">
                    <div className="profile-avatar-circle">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <h2 className="profile-name">{user?.name || 'User'}</h2>
                    <p className="profile-meta">
                        {userKey ? `📱 ${user.phone}` : 'Patient Portal Account'}
                    </p>
                    <span className="profile-member-badge">✨ Swa-Astha Member</span>
                </div>

                {/* Menu Items (Now Functional) */}
                <div className="profile-menu">
                    <div className="profile-menu-item animate-slide-up" onClick={() => setEditMode(true)}>
                        <div className="profile-menu-icon-wrap"><Icons.User /></div>
                        <div className="profile-menu-text">
                            <span className="profile-menu-label">Edit Profile</span>
                            <span className="profile-menu-desc">Update personal details</span>
                        </div>
                        <span className="profile-menu-arrow">›</span>
                    </div>
                    <div className="profile-menu-item animate-slide-up" onClick={() => setActiveTab('docs')}>
                        <div className="profile-menu-icon-wrap"><Icons.File /></div>
                        <div className="profile-menu-text">
                            <span className="profile-menu-label">Health Records</span>
                            <span className="profile-menu-desc">View prescriptions & reports</span>
                        </div>
                        <span className="profile-menu-arrow">›</span>
                    </div>
                    <div className="profile-menu-item animate-slide-up" onClick={() => navigateTo('doctor-visits')}>
                        <div className="profile-menu-icon-wrap">🩺</div>
                        <div className="profile-menu-text">
                            <span className="profile-menu-label">Doctor Visits</span>
                            <span className="profile-menu-desc">Doctors who viewed your records · chat</span>
                        </div>
                        <span className="profile-menu-arrow">›</span>
                    </div>
                    <div className="profile-menu-item animate-slide-up" onClick={() => navigateTo('my-orders')}>
                        <div className="profile-menu-icon-wrap">📦</div>
                        <div className="profile-menu-text">
                            <span className="profile-menu-label">My Orders</span>
                            <span className="profile-menu-desc">Order history across all pharmacies</span>
                        </div>
                        <span className="profile-menu-arrow">›</span>
                    </div>
                    <div className="profile-menu-item animate-slide-up" onClick={() => showNotification('Privacy toggled', 'success')}>
                        <div className="profile-menu-icon-wrap"><Icons.Shield /></div>
                        <div className="profile-menu-text">
                            <span className="profile-menu-label">Privacy Settings</span>
                            <span className="profile-menu-desc">Control your visibility</span>
                        </div>
                        <span className="profile-menu-arrow">›</span>
                    </div>
                </div>

                {/* Sign Out Section */}
                <div className="profile-signout-section animate-slide-up">
                    <button className="profile-signout-btn" onClick={handleSignOut}>
                        <Icons.Logout />
                        <span>Sign Out</span>
                    </button>
                    <p className="profile-version">Swa-Astha v2.0 · Made with ❤️</p>
                </div>
            </div>
        </div>
    );
};
