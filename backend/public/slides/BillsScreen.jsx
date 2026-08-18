// ============================================
// BILLS SCREEN - Hospital & Medical Bills
// Manage and view medical expenses
// ============================================

window.BillsScreen = () => {
    const { navigateTo, showNotification, addHealthRecord, setModalActive } = window.useApp();
    const Icons = window.Icons;
    const BottomNav = window.BottomNav;
    const { useState, useRef } = React;

    const billUploadRef = useRef(null);
    const billCameraRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [exportSheetOpen, setExportSheetOpen] = useState(false);
    const [showAllBills, setShowAllBills] = useState(false);

    React.useEffect(() => {
        setModalActive(exportSheetOpen);
    }, [exportSheetOpen]);

    const [billsData, setBillsData] = useState([
        { id: 1, hospital: 'Apollo Hospital', amount: 15500, date: '10 Jan 2026', status: 'Paid', icon: '🏥', color: '#E3F2FD' },
        { id: 2, hospital: 'City Medical Center', amount: 3200, date: '5 Jan 2026', status: 'Pending', icon: '🏨', color: '#FFF3E0' },
        { id: 3, hospital: 'LifeCare Diagnostics', amount: 850, date: '28 Dec 2025', status: 'Paid', icon: '🔬', color: '#E8F5E9' },
    ]);

    const [activeTab, setActiveTab] = useState('all');

    const totalSpent = billsData.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const totalPending = billsData.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);

    const filteredBills = activeTab === 'all' ? billsData :
        activeTab === 'paid' ? billsData.filter(b => b.status === 'Paid') :
        billsData.filter(b => b.status === 'Pending');

    // ── Display limits: show 4 initially, up to 10 on "See All" ──
    const BILLS_INITIAL = 4;
    const BILLS_MAX = 10;
    const visibleBills = filteredBills.slice(0, showAllBills ? BILLS_MAX : BILLS_INITIAL);

    const handleAction = (type) => {
        showNotification(`${type} process started...`, 'info');
        setTimeout(() => {
            showNotification(`${type} completed! Data extracted.`, 'success');
        }, 1500);
    };

    // Real bill upload handler
    const handleBillFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        setUploading(true);
        showNotification('Uploading bill...', 'info');

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const response = await fetch('/api/bills/upload', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        file: ev.target.result,
                        fileName: file.name,
                        hospital: 'Uploaded Bill',
                        amount: 0
                    })
                });
                const data = await response.json();
                if (response.ok && data.bill) {
                    setBillsData(prev => [{
                        id: Date.now(),
                        hospital: file.name.replace(/\.[^.]+$/, '') || 'Uploaded Bill',
                        amount: 0,
                        date: data.bill.date,
                        status: 'Pending',
                        icon: '\ud83d\udcce',
                        color: '#F3E5F5'
                    }, ...prev]);
                    const billName = file.name.replace(/\.[^.]+$/, '') || 'Uploaded Bill';
                    addHealthRecord({ title: billName, category: 'bill', type: 'upload', source: 'bills', date: data.bill.date, meta: { hospital: billName, amount: 0, status: 'Pending' } });
                    showNotification('Bill uploaded successfully!', 'success');
                } else {
                    showNotification(data.message || 'Upload failed', 'error');
                }
            } catch (err) {
                showNotification('Upload failed. Is the server running?', 'error');
            }
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    // Scan bill capture handler
    const handleScanBillCapture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        setUploading(true);
        showNotification('Scanning bill...', 'info');

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const response = await fetch('/api/bills/upload', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        file: ev.target.result,
                        fileName: 'Scanned Bill',
                        hospital: 'Scanned Bill',
                        amount: 0
                    })
                });
                const data = await response.json();
                if (response.ok && data.bill) {
                    setBillsData(prev => [{
                        id: Date.now(),
                        hospital: 'Scanned Bill',
                        amount: 0,
                        date: data.bill.date,
                        status: 'Pending',
                        icon: '\ud83d\udcf7',
                        color: '#E0F2F1'
                    }, ...prev]);
                    addHealthRecord({ title: 'Scanned Bill', category: 'bill', type: 'scan', source: 'bills', date: data.bill.date, meta: { hospital: 'Scanned Bill', amount: 0, status: 'Pending' } });
                    showNotification('Bill scanned & uploaded!', 'success');
                } else {
                    showNotification(data.message || 'Scan failed', 'error');
                }
            } catch (err) {
                showNotification('Scan failed. Is the server running?', 'error');
            }
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handlePay = (id) => {
        setBillsData(prev => prev.map(b => b.id === id ? { ...b, status: 'Paid' } : b));
        showNotification('Payment successful! Receipt generated.', 'success');
    };

    return (
        <div className="screen bil-screen active">
            {/* Header */}
            <div className="bil-header">
                <div className="btn-back" onClick={() => navigateTo('home')}><Icons.Back /></div>
                <h1>Medical Bills</h1>
                <div style={{ width: 40 }}></div>
            </div>

            {/* Summary Cards */}
            <div className="bil-summary animate-slide-up">
                <div className="bil-sum-card paid">
                    <span className="bil-sum-icon">✅</span>
                    <div className="bil-sum-info">
                        <span className="bil-sum-label">Total Paid</span>
                        <span className="bil-sum-amount">₹{totalSpent.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                <div className="bil-sum-card pending">
                    <span className="bil-sum-icon">⏳</span>
                    <div className="bil-sum-info">
                        <span className="bil-sum-label">Pending</span>
                        <span className="bil-sum-amount">₹{totalPending.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bil-actions animate-slide-up" style={{ animationDelay: '0.03s' }}>
                <div className="bil-act-pill" onClick={() => billUploadRef.current?.click()}>
                    <span>{uploading ? '⌛' : '📤'}</span><span>{uploading ? 'Uploading...' : 'Upload Bill'}</span>
                </div>
                <div className="bil-act-pill" onClick={() => billCameraRef.current?.click()}>
                    <span>📷</span><span>Scan Bill</span>
                </div>
                <div className="bil-act-pill" onClick={() => setExportSheetOpen(true)}>
                    <span>📊</span><span>Export</span>
                </div>
                <input ref={billUploadRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={handleBillFileUpload} />
                <input ref={billCameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleScanBillCapture} />
            </div>

            {/* Filter Tabs */}
            <div className="bil-tabs animate-slide-up" style={{ animationDelay: '0.06s' }}>
                {[{k:'all',l:'All'},{k:'paid',l:'Paid'},{k:'pending',l:'Pending'}].map(t => (
                    <div key={t.k} className={`bil-tab ${activeTab === t.k ? 'active' : ''}`} onClick={() => { setActiveTab(t.k); setShowAllBills(false); }}>
                        {t.l} {t.k === 'all' ? `(${billsData.length})` : t.k === 'paid' ? `(${billsData.filter(b=>b.status==='Paid').length})` : `(${billsData.filter(b=>b.status==='Pending').length})`}
                    </div>
                ))}
            </div>

            {/* Bills List */}
            <div className="bil-list animate-slide-up" style={{ animationDelay: '0.09s' }}>
                {visibleBills.map((bill, idx) => (
                    <div key={bill.id} className="bil-card" style={{ animationDelay: `${0.1 + idx * 0.04}s` }}>
                        <div className="bil-card-icon" style={{ background: bill.color }}>
                            <span>{bill.icon}</span>
                        </div>
                        <div className="bil-card-body">
                            <span className="bil-card-name">{bill.hospital}</span>
                            <span className="bil-card-date">{bill.date}</span>
                        </div>
                        <div className="bil-card-right">
                            <span className="bil-card-amount">₹{bill.amount.toLocaleString('en-IN')}</span>
                            <span className={`bil-card-status ${bill.status.toLowerCase()}`}>{bill.status}</span>
                        </div>
                        {bill.status === 'Pending' ? (
                            <button className="bil-card-btn pay" onClick={() => handlePay(bill.id)}>Pay</button>
                        ) : (
                            <button className="bil-card-btn" onClick={() => showNotification('Opening bill copy...', 'info')}>View</button>
                        )}
                    </div>
                ))}
            </div>

            {/* See All / View Medical History buttons */}
            {filteredBills.length > BILLS_INITIAL && !showAllBills && (
                <button className="see-all-btn animate-slide-up" onClick={() => setShowAllBills(true)}>
                    <span>🏥 See All Bills</span>
                    <span className="see-all-count">{filteredBills.length} total</span>
                </button>
            )}
            {showAllBills && filteredBills.length > BILLS_MAX && (
                <button className="view-history-btn animate-slide-up" onClick={() => { localStorage.setItem('swa_open_docs', 'true'); navigateTo('profile'); }}>
                    <span>View all in Medical History</span>
                    <span className="view-history-arrow">→</span>
                </button>
            )}

            {/* ══════════════════════════════════════════════ */}
            {/* EXPORT / SHARE BOTTOM SHEET                   */}
            {/* ══════════════════════════════════════════════ */}
            {exportSheetOpen && (
                <div className="share-sheet-overlay" onClick={() => setExportSheetOpen(false)}>
                    <div className="share-sheet" onClick={e => e.stopPropagation()}>
                        <div className="share-sheet-handle"></div>
                        <div className="share-sheet-header">
                            <h3>📊 Export Bill</h3>
                            <button className="share-sheet-close" onClick={() => setExportSheetOpen(false)}>✕</button>
                        </div>
                        <p className="share-sheet-desc">Select a bill to export or share</p>
                        <div className="share-sheet-list">
                            {billsData.map((bill) => (
                                <div key={bill.id} className="share-sheet-item" onClick={() => {
                                    const billText = `Hospital: ${bill.hospital}\nAmount: ₹${bill.amount.toLocaleString('en-IN')}\nDate: ${bill.date}\nStatus: ${bill.status}\n\nExported from Swa-Astha Health App`;
                                    if (navigator.share) {
                                        navigator.share({
                                            title: `Bill - ${bill.hospital}`,
                                            text: billText,
                                        }).catch(() => {});
                                    } else {
                                        navigator.clipboard.writeText(billText);
                                        showNotification(`"${bill.hospital}" bill info copied!`, 'success');
                                    }
                                    setExportSheetOpen(false);
                                }}>
                                    <div className="share-sheet-item-icon" style={{ background: bill.color }}>
                                        <span>{bill.icon}</span>
                                    </div>
                                    <div className="share-sheet-item-info">
                                        <span className="share-sheet-item-title">{bill.hospital}</span>
                                        <span className="share-sheet-item-meta">{bill.date} · ₹{bill.amount.toLocaleString('en-IN')} · <span style={{ color: bill.status === 'Paid' ? '#4CAF50' : '#FF9800', fontWeight: 600 }}>{bill.status}</span></span>
                                    </div>
                                    <div className="share-sheet-item-action">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
