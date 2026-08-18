// ============================================
// REPORTS SCREEN - Medical Reports Management
// Upload, view, organize reports + AI Prescription Scanner
// ============================================

window.ReportsScreen = () => {
    const { useState, useRef } = React;
    const { navigateTo, showNotification, setModalActive, addHealthRecord, startDownload, downloads, downloadedFiles, healthHistory } = window.useApp();
    const Icons = window.Icons;
    const CategoryCard = window.CategoryCard;

    // ── Scanner Modal State ──
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanPreview, setScanPreview] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanResults, setScanResults] = useState(null);
    const [scanError, setScanError] = useState('');
    const fileInputRef = useRef(null);
    const reportUploadRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [shareSheetOpen, setShareSheetOpen] = useState(false);
    const [showAllReports, setShowAllReports] = useState(false);

    // ── Stacking Fix: Hide Nav on Modal (Globalized) ──
    React.useEffect(() => {
        setModalActive(scannerOpen || shareSheetOpen);
    }, [scannerOpen, shareSheetOpen]);

    // Get download status for a given file name
    const getDownloadStatus = (name) => {
        const dl = downloads?.find(d => d.fileName === name);
        if (dl) return dl.status;
        if (downloadedFiles?.includes(name)) return 'downloaded';
        return null;
    };

    // ── Open / Close Scanner ──
    const openScanner = () => {
        setScannerOpen(true);
        setScanPreview(null);
        setScanResults(null);
        setScanError('');
        setScanning(false);
        setScanProgress(0);
    };

    const closeScanner = () => {
        setScannerOpen(false);
        stopCamera();
        setScanPreview(null);
        setCameraActive(false);
    };

    // ── Camera Functions ──
    const startCamera = async () => {
        setCameraActive(true);
        setScanPreview(null);
        setScanResults(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            showNotification('Camera access denied. Please allow camera permissions.', 'error');
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                setScanPreview(imageData);
                stopCamera();
                setCameraActive(false);
                processWithAI(imageData);
            }
        }
    };

    // ── File Upload for Scanner ──
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setScanPreview(ev.target.result);
            processWithAI(ev.target.result);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // ── Report Upload (Upload button) ──
    const handleReportUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';

        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const response = await fetch('/api/reports/upload', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        file: ev.target.result,
                        fileName: file.name,
                        fileType: file.type || 'JPG',
                        category: 'General'
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    addHealthRecord({ title: file.name, category: 'report', type: file.type || 'file', source: 'reports', meta: { size: file.size, fileType: file.type } });
                    showNotification('Report uploaded successfully!', 'success');
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

    // ══════════════════════════════════════════════
    // AI INTEGRATION POINT
    // Replace this function's body with your AI model API call.
    // Input:  imageData (base64 string of the prescription image)
    // Output: Set scanResults with an array of extracted medicines
    // ══════════════════════════════════════════════
    const processWithAI = async (imageData) => {
        setScanning(true);
        setScanProgress(0);
        setScanResults(null);
        setScanError('');

        try {
            // Start progress animation
            let currentProgress = 0;
            const progressInterval = setInterval(() => {
                currentProgress = Math.min(currentProgress + 3, 90);
                setScanProgress(currentProgress);
            }, 100);

            const response = await fetch('/api/prescription/scan', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ image: imageData })
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error('Server error');
            }

            const data = await response.json();

            // Complete progress bar
            for (let i = currentProgress; i <= 100; i += 5) {
                await new Promise(r => setTimeout(r, 30));
                setScanProgress(i);
            }

            setScanResults({
                extractedText: data.extractedText || '',
                doctor: data.doctor || '',
                medicines: data.medicines || [],
                status: data.status || 'extracted'
            });
            addHealthRecord({ title: 'Prescription Scan', category: 'prescription', type: 'scan', source: 'reports', meta: { medicines: data.medicines, doctor: data.doctor, extractedText: data.extractedText } });

        } catch (err) {
            setScanError('Processing failed. Please try again.');
        }
        setScanning(false);
    };

    const ViewAllIcon = () => (
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="3" width="22" height="30" rx="3" />
            <rect x="13" y="9" width="22" height="30" rx="3" fill="#fff" />
            <line x1="18" y1="16" x2="30" y2="16" />
            <line x1="18" y1="22" x2="30" y2="22" />
            <line x1="18" y1="28" x2="26" y2="28" />
        </svg>
    );

    const BloodIcon = () => (
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 4 L20 24" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="20" cy="30" rx="10" ry="8" />
            <path d="M14 28 Q20 35 26 28" />
        </svg>
    );

    const ScanIcon = () => (
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="6" y="8" width="28" height="24" rx="3" />
            <line x1="6" y1="20" x2="34" y2="20" />
            <circle cx="20" cy="20" r="6" />
        </svg>
    );

    const PrescriptionIcon = () => (
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="8" y="4" width="24" height="32" rx="3" />
            <line x1="14" y1="12" x2="26" y2="12" />
            <line x1="14" y1="18" x2="26" y2="18" />
            <line x1="14" y1="24" x2="22" y2="24" />
            <path d="M20 28 L26 34 M26 28 L20 34" strokeWidth="2" />
        </svg>
    );

    const reportListRef = useRef(null);

    // ── Sample reports data ──
    const recentReports = [
        { id: 1, title: 'Blood Test Report', date: '12 Feb 2026', type: 'PDF', category: 'blood', icon: '🩸', color: '#EF5350', hospital: 'Apollo Hospital', doctor: 'Dr. Mehra' },
        { id: 2, title: 'Prescription – Dr. Gupta', date: '05 Jan 2026', type: 'JPG', category: 'prescription', icon: '💊', color: '#42A5F5', hospital: 'Max Healthcare', doctor: 'Dr. Gupta' },
        { id: 3, title: 'Vaccination Certificate', date: '20 Dec 2025', type: 'PDF', category: 'prescription', icon: '💉', color: '#66BB6A', hospital: 'City Hospital', doctor: 'Dr. Sharma' },
        { id: 4, title: 'X-Ray – Chest', date: '15 Nov 2025', type: 'DICOM', category: 'scan', icon: '🩻', color: '#AB47BC', hospital: 'AIIMS', doctor: 'Dr. Verma' },
        { id: 5, title: 'Eye Checkup Report', date: '02 Oct 2025', type: 'PDF', category: 'blood', icon: '👁️', color: '#FF7043', hospital: 'Shankar Netralaya', doctor: 'Dr. Iyer' },
    ];

    const [activeFilter, setActiveFilter] = useState('all');
    const [activeCategory, setActiveCategory] = useState('all');
    const filters = [
        { key: 'all', label: 'All', icon: '📋' },
        { key: 'PDF', label: 'PDF', icon: '📄' },
        { key: 'JPG', label: 'Images', icon: '🖼️' },
    ];

    const scrollToReports = () => {
        setTimeout(() => {
            reportListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleCategoryClick = (cat) => {
        setActiveCategory(cat);
        setActiveFilter('all');
        setShowAllReports(false);
        scrollToReports();
    };

    // ── Merged reports: sample + uploaded (used for stats, categories, and list) ──
    // Derive uploaded reports from persisted healthHistory (survives logout/login)
    const allReports = React.useMemo(() => {
        const uploadedFromHistory = (healthHistory || [])
            .filter(h => h.source === 'reports' && (h.category === 'report' || h.category === 'prescription'))
            .map((h, i) => {
                // Normalize MIME suffix from meta.fileType or h.type
                const rawType = (h.meta?.fileType || h.type || '').split('/').pop()?.toUpperCase() || 'FILE';
                const type = (rawType === 'JPEG' || rawType === 'PNG' || rawType === 'GIF' || rawType === 'WEBP') ? 'JPG'
                           : (rawType === 'PDF') ? 'PDF'
                           : (rawType === 'DICOM') ? 'DICOM'
                           : rawType;
                const category = (type === 'DICOM') ? 'scan'
                               : (type === 'JPG')   ? 'prescription'
                               : 'blood';
                return {
                    id: `up-${h.id || i}`,
                    title: h.title,
                    date: h.date,
                    type,
                    category,
                    icon: type === 'PDF' ? '📄' : type === 'JPG' ? '🖼️' : '📎',
                    color: '#26A69A',
                    hospital: 'Uploaded',
                    doctor: '-'
                };
            });
        return [...uploadedFromHistory, ...recentReports];
    }, [healthHistory]);

    const filteredReports = (() => {
        let reports = [...allReports];
        // Apply category filter first
        if (activeCategory !== 'all') {
            reports = reports.filter(r => r.category === activeCategory);
        }
        // Then apply file-type filter
        if (activeFilter !== 'all') {
            reports = reports.filter(r => r.type === activeFilter);
        }
        return reports;
    })();

    // ── Display limits: show 4 initially, up to 10 on "See All" ──
    const REPORTS_INITIAL = 4;
    const REPORTS_MAX = 10;
    const visibleReports = filteredReports.slice(0, showAllReports ? REPORTS_MAX : REPORTS_INITIAL);

    return (
        <div className="screen reports-screen active">
            {/* ── Header ── */}
            <div className="rpt-header">
                <div className="btn-back" onClick={() => navigateTo('home')}>
                    <Icons.Back />
                </div>
                <h1 className="rpt-title">Medical Reports</h1>
                <div className="rpt-header-action" onClick={() => showNotification('Search coming soon!', 'info')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
            </div>

            {/* ── Stats Strip ── */}
            <div className="rpt-stats-strip animate-slide-up">
                <div className="rpt-stat-card">
                    <span className="rpt-stat-num">{allReports.length}</span>
                    <span className="rpt-stat-label">Total</span>
                </div>
                <div className="rpt-stat-divider"></div>
                <div className="rpt-stat-card">
                    <span className="rpt-stat-num">{allReports.filter(r => r.type === 'PDF').length}</span>
                    <span className="rpt-stat-label">PDFs</span>
                </div>
                <div className="rpt-stat-divider"></div>
                <div className="rpt-stat-card">
                    <span className="rpt-stat-num">{allReports.filter(r => r.type === 'JPG').length}</span>
                    <span className="rpt-stat-label">Images</span>
                </div>
                <div className="rpt-stat-divider"></div>
                <div className="rpt-stat-card">
                    <span className="rpt-stat-num">{allReports.filter(r => r.type === 'DICOM').length}</span>
                    <span className="rpt-stat-label">Scans</span>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="rpt-quick-row animate-slide-up" style={{ animationDelay: '0.03s' }}>
                <div className="rpt-action-pill" onClick={() => reportUploadRef.current?.click()}>
                    <span className="rpt-ap-icon">{uploading ? '⏳' : '📤'}</span>
                    <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                </div>
                <input ref={reportUploadRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                    onChange={handleReportUpload} />
                <div className="rpt-action-pill accent" onClick={openScanner}>
                    <span className="rpt-ap-icon">📷</span>
                    <span>Scan Rx</span>
                </div>
                <div className="rpt-action-pill" onClick={() => setShareSheetOpen(true)}>
                    <span className="rpt-ap-icon">🔗</span>
                    <span>Share</span>
                </div>
            </div>

            {/* ── Category Cards ── */}
            <div className="rpt-categories animate-slide-up" style={{ animationDelay: '0.06s' }}>
                <div className={`rpt-cat-card ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => handleCategoryClick('all')}>
                    <div className="rpt-cat-icon" style={{ background: '#E3F2FD' }}><ViewAllIcon /></div>
                    <span className="rpt-cat-title">All Reports</span>
                    <span className="rpt-cat-count">{allReports.length}</span>
                </div>
                <div className={`rpt-cat-card ${activeCategory === 'blood' ? 'active' : ''}`} onClick={() => handleCategoryClick('blood')}>
                    <div className="rpt-cat-icon" style={{ background: '#FFEBEE' }}><BloodIcon /></div>
                    <span className="rpt-cat-title">Blood Tests</span>
                    <span className="rpt-cat-count">{allReports.filter(r => r.category === 'blood').length}</span>
                </div>
                <div className={`rpt-cat-card ${activeCategory === 'scan' ? 'active' : ''}`} onClick={() => handleCategoryClick('scan')}>
                    <div className="rpt-cat-icon" style={{ background: '#F3E5F5' }}><ScanIcon /></div>
                    <span className="rpt-cat-title">Scans</span>
                    <span className="rpt-cat-count">{allReports.filter(r => r.category === 'scan').length}</span>
                </div>
                <div className={`rpt-cat-card ${activeCategory === 'prescription' ? 'active' : ''}`} onClick={() => handleCategoryClick('prescription')}>
                    <div className="rpt-cat-icon" style={{ background: '#E8F5E9' }}><PrescriptionIcon /></div>
                    <span className="rpt-cat-title">Prescriptions</span>
                    <span className="rpt-cat-count">{allReports.filter(r => r.category === 'prescription').length}</span>
                </div>
            </div>

            {/* ── Filter Tabs ── */}
            <div className="rpt-filter-bar animate-slide-up" style={{ animationDelay: '0.09s' }}>
                {filters.map(f => (
                    <div key={f.key} className={`rpt-filter-chip ${activeFilter === f.key ? 'active' : ''}`} onClick={() => { setActiveFilter(f.key); setShowAllReports(false); }}>
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Recent Reports List ── */}
            <div ref={reportListRef} className="rpt-list-section animate-slide-up" style={{ animationDelay: '0.12s' }}>
                <div className="rpt-list-header">
                    <h3>Recent Reports</h3>
                    <span className="rpt-list-count">{filteredReports.length} files</span>
                </div>

                <div className="rpt-list">
                    {visibleReports.map((report, idx) => (
                        <div key={report.id} className="rpt-item" style={{ animationDelay: `${0.13 + idx * 0.03}s` }}>
                            <div className="rpt-item-icon" style={{ background: `${report.color}15`, color: report.color }}>
                                <span>{report.icon}</span>
                            </div>
                            <div className="rpt-item-body">
                                <span className="rpt-item-title">{report.title}</span>
                                <span className="rpt-item-meta">{report.date} · {report.type}</span>
                            </div>
                            {(() => {
                                const dlStatus = getDownloadStatus(report.title);
                                const isDone = dlStatus === 'complete' || dlStatus === 'exiting' || dlStatus === 'downloaded';
                                return (
                                    <button
                                        className={`rpt-item-dl ${dlStatus === 'downloading' ? 'dl-active' : ''} ${isDone ? 'dl-done' : ''}`}
                                        onClick={() => {
                                            if (dlStatus === 'downloaded') {
                                                showNotification(`Opening ${report.title}...`, 'success');
                                            } else if (!dlStatus) {
                                                startDownload(report.title);
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
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        )}
                                    </button>
                                );
                            })()}
                        </div>
                    ))}
                </div>

                {/* See All / View Medical History buttons */}
                {filteredReports.length > REPORTS_INITIAL && !showAllReports && (
                    <button className="see-all-btn animate-slide-up" onClick={() => setShowAllReports(true)}>
                        <span>📋 See All Reports</span>
                        <span className="see-all-count">{filteredReports.length} total</span>
                    </button>
                )}
                {showAllReports && filteredReports.length > REPORTS_MAX && (
                    <button className="view-history-btn animate-slide-up" onClick={() => { localStorage.setItem('swa_open_docs', 'true'); navigateTo('profile'); }}>
                        <span>View all in Medical History</span>
                        <span className="view-history-arrow">→</span>
                    </button>
                )}
            </div>

            {/* ══════════════════════════════════════════════ */}
            {/* SHARE / EXPORT BOTTOM SHEET                  */}
            {/* ══════════════════════════════════════════════ */}
            {shareSheetOpen && (
                <div className="share-sheet-overlay" onClick={() => setShareSheetOpen(false)}>
                    <div className="share-sheet" onClick={e => e.stopPropagation()}>
                        <div className="share-sheet-handle"></div>
                        <div className="share-sheet-header">
                            <h3>📤 Share Report</h3>
                            <button className="share-sheet-close" onClick={() => setShareSheetOpen(false)}>✕</button>
                        </div>
                        <p className="share-sheet-desc">Select a report to share</p>
                        <div className="share-sheet-list">
                            {allReports.map((report) => (
                                <div key={report.id} className="share-sheet-item" onClick={() => {
                                    const shareData = {
                                        title: report.title,
                                        text: `Medical Report: ${report.title}\nDate: ${report.date}\nType: ${report.type}\n\nShared via Swa-Astha Health App`,
                                    };
                                    if (navigator.share) {
                                        navigator.share(shareData).catch(() => {});
                                    } else {
                                        navigator.clipboard.writeText(shareData.text);
                                        showNotification(`"${report.title}" info copied to clipboard!`, 'success');
                                    }
                                    setShareSheetOpen(false);
                                }}>
                                    <div className="share-sheet-item-icon" style={{ background: `${report.color}20`, color: report.color }}>
                                        <span>{report.icon}</span>
                                    </div>
                                    <div className="share-sheet-item-info">
                                        <span className="share-sheet-item-title">{report.title}</span>
                                        <span className="share-sheet-item-meta">{report.date} · {report.type}</span>
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

            {/* ══════════════════════════════════════════════ */}
            {/* PRESCRIPTION SCANNER MODAL (AI-Ready)        */}
            {/* ══════════════════════════════════════════════ */}
            {scannerOpen && (
                <div className="scanner-modal-overlay" onClick={closeScanner}>
                    <div className="scanner-modal" onClick={e => e.stopPropagation()}>
                        <div className="scanner-modal-header">
                            <h2>📷 Prescription Scanner</h2>
                            <button className="scanner-close-btn" onClick={closeScanner}>✕</button>
                        </div>

                        <div className="scanner-modal-body">
                            {/* Camera View */}
                            {cameraActive && (
                                <div className="scanner-camera-view">
                                    <video ref={videoRef} autoPlay playsInline className="scanner-video" />
                                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                                    <div className="scanner-camera-controls">
                                        <button className="scanner-capture-btn" onClick={capturePhoto}>
                                            <span className="scanner-capture-ring"></span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Preview */}
                            {scanPreview && !cameraActive && (
                                <div className="scanner-preview">
                                    <img src={scanPreview} alt="Prescription preview" />
                                </div>
                            )}

                            {/* Action Buttons (when no camera/preview) */}
                            {!cameraActive && !scanPreview && (
                                <div className="scanner-actions">
                                    <div className="scanner-action-card" onClick={startCamera}>
                                        <span className="scanner-action-emoji">📸</span>
                                        <span className="scanner-action-label">Take Photo</span>
                                        <span className="scanner-action-desc">Use camera to capture prescription</span>
                                    </div>
                                    <div className="scanner-action-card" onClick={() => fileInputRef.current?.click()}>
                                        <span className="scanner-action-emoji">📁</span>
                                        <span className="scanner-action-label">Upload Image</span>
                                        <span className="scanner-action-desc">Choose from gallery or files</span>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                                        onChange={handleFileUpload} />
                                </div>
                            )}

                            {/* Processing Progress */}
                            {scanning && (
                                <div className="scanner-progress-section">
                                    <div className="scanner-progress-bar">
                                        <div className="scanner-progress-fill" style={{ width: `${scanProgress}%` }}></div>
                                    </div>
                                    <p className="scanner-progress-text">
                                        🤖 AI Processing... {scanProgress}%
                                    </p>
                                </div>
                            )}

                            {/* Error */}
                            {scanError && (
                                <div className="scanner-error">
                                    <span>⚠️ {scanError}</span>
                                    <button onClick={() => { setScanPreview(null); setScanError(''); }}>Try Again</button>
                                </div>
                            )}

                            {/* Results */}
                            {scanResults && !scanning && (
                                <div className="scanner-results">
                                    <h3 className="scanner-results-title">🧾 Extraction Results</h3>
                                    {scanResults.doctor && (
                                        <p style={{color:'#555',marginBottom:8,fontSize:'0.9rem'}}>📋 {scanResults.extractedText}</p>
                                    )}
                                    <div className="scanner-medicine-list">
                                        {scanResults.medicines?.map((med, i) => (
                                            <div key={i} className="scanner-medicine-item">
                                                <div style={{flex:1}}>
                                                    <span className="scanner-med-name">{med.name}</span>
                                                    {med.dosage && <span style={{display:'block',color:'#777',fontSize:'0.8rem',marginTop:2}}>💊 {med.dosage}</span>}
                                                </div>
                                                <span className="scanner-med-confidence" style={{
                                                    background: med.confidence > 80 ? '#E8F5E9' : med.confidence > 50 ? '#FFF3E0' : '#FFEBEE',
                                                    color: med.confidence > 80 ? '#2E7D32' : med.confidence > 50 ? '#E65100' : '#C62828'
                                                }}>{med.confidence}%</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="scanner-retry-btn" onClick={() => {
                                        setScanPreview(null);
                                        setScanResults(null);
                                    }}>Scan Another</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
