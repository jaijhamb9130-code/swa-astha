// ============================================
// PHARMACY SCREEN - With Cart System
// Search, browse, add to cart, checkout
// Cart modal inlined to prevent re-render flicker
// ============================================

window.PharmacyScreen = () => {
    const { useState, useEffect, useRef, useCallback } = React;
    const { navigateTo, showNotification, cart, cartOpen, toggleCart, addToCart, updateQty, removeItem, clearCart, placeOrder, address, setAddress, setModalActive, orders, ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_ICONS, addHealthRecord } = window.useApp();
    const Icons = window.Icons;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState('main');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const rxUploadRef = useRef(null);
    const rxCameraRef = useRef(null);
    const rxVideoRef = useRef(null);
    const rxCanvasRef = useRef(null);
    const rxStreamRef = useRef(null);
    const [scanPreviewImg, setScanPreviewImg] = useState(null);
    const [scanExtracted, setScanExtracted] = useState(null);
    const [scanStatusMsg, setScanStatusMsg] = useState('');

    // Auto-resolved pharmacies for the scanner: per-medicine map keyed by index.
    // Each entry: { loading, results[], selectedIdx, error }
    const [scanPharma, setScanPharma] = useState({});
    const [pickerOpenIdx, setPickerOpenIdx] = useState(null); // which medicine's popup is open
    const [addingAll, setAddingAll] = useState(false);
    const [scanCoords, setScanCoords] = useState(null);

    // After the AI scanner finishes, look up nearby pharmacies for every medicine
    // in parallel and auto-select the nearest one with stock.
    useEffect(() => {
        if (!scanExtracted || !scanExtracted.medicines || scanExtracted.medicines.length === 0) {
            setScanPharma({}); setScanCoords(null);
            return;
        }
        let cancelled = false;

        const resolve = async () => {
            // Initialize loading state for every medicine
            const initial = {};
            scanExtracted.medicines.forEach((_, i) => { initial[i] = { loading: true, results: [], selectedIdx: -1 }; });
            setScanPharma(initial);

            // Geolocation (one-time)
            const coords = await new Promise((resolve) => {
                if (!navigator.geolocation) return resolve(null);
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => resolve(null),
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });
            if (cancelled) return;
            setScanCoords(coords);

            if (!coords) {
                const failed = {};
                scanExtracted.medicines.forEach((_, i) => { failed[i] = { loading: false, results: [], selectedIdx: -1, error: 'Location denied' }; });
                if (!cancelled) setScanPharma(failed);
                return;
            }

            // Fire one /api/pharmacy/find per medicine in parallel
            await Promise.all(scanExtracted.medicines.map(async (med, i) => {
                try {
                    const params = new URLSearchParams({
                        medicine: med.name || '',
                        lat: String(coords.lat),
                        lng: String(coords.lng),
                        radius: '5000',
                        limit: '5'
                    });
                    if (med.salt) params.set('salt', med.salt);
                    const r = await fetch('/api/pharmacy/find?' + params.toString());
                    const data = await r.json();
                    if (cancelled) return;
                    const results = (data && data.success && data.results) ? data.results : [];
                    setScanPharma(prev => ({
                        ...prev,
                        [i]: { loading: false, results, selectedIdx: results.length > 0 ? 0 : -1 }
                    }));
                } catch (e) {
                    if (cancelled) return;
                    setScanPharma(prev => ({
                        ...prev,
                        [i]: { loading: false, results: [], selectedIdx: -1, error: 'Lookup failed' }
                    }));
                }
            }));
        };

        resolve();
        return () => { cancelled = true; };
    }, [scanExtracted]);

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

    // Local handler for address update if needed, but AppContext has address/setAddress
    // Use the global placeOrder
    const handlePlaceOrder = () => {
        if (placeOrder(address)) {
            // Success is handled by AppContext.placeOrder
        }
    };

    // ── Data ──
    const [apiResults, setApiResults] = useState([]);
    const [apiLoading, setApiLoading] = useState(false);
    const [dbCategories, setDbCategories] = useState([]);
    const [popularMeds, setPopularMeds] = useState([]);
    const searchTimerRef = useRef(null);

    // Legacy category structure for backward compat with category/detail views
    const categories = [
        {
            id: 'bp', name: 'Blood Pressure', icon: '🫀', color: '#EF5350', bg: '#FFEBEE', meds: []
        },
        {
            id: 'fever', name: 'Fever', icon: '🌡️', color: '#FF7043', bg: '#FBE9E7', meds: []
        },
        {
            id: 'cold', name: 'Cold & Flu', icon: '🤧', color: '#42A5F5', bg: '#E3F2FD', meds: []
        },
        {
            id: 'diabetes', name: 'Diabetes', icon: '💉', color: '#AB47BC', bg: '#F3E5F5', meds: []
        },
        {
            id: 'pain', name: 'Pain Relief', icon: '💪', color: '#EC407A', bg: '#FCE4EC', meds: []
        },
        {
            id: 'acidity', name: 'Acidity', icon: '🔥', color: '#26A69A', bg: '#E0F2F1', meds: []
        },
        {
            id: 'antibiotics', name: 'Antibiotics', icon: '🧬', color: '#5C6BC0', bg: '#E8EAF6', meds: []
        },
        {
            id: 'heart', name: 'Heart & Cholesterol', icon: '❤️', color: '#E91E63', bg: '#FCE4EC', meds: []
        },
        {
            id: 'vitamins', name: 'Vitamins & Supplements', icon: '🌿', color: '#66BB6A', bg: '#E8F5E9', meds: []
        },
        {
            id: 'thyroid', name: 'Thyroid', icon: '🦋', color: '#FF8A65', bg: '#FBE9E7', meds: []
        },
        {
            id: 'skin', name: 'Skin Care', icon: '🧴', color: '#8D6E63', bg: '#EFEBE9', meds: []
        },
        {
            id: 'eye', name: 'Eye & Ear', icon: '👁️', color: '#29B6F6', bg: '#E1F5FE', meds: []
        },
    ];

    // Load categories with real medicines from DB
    useEffect(() => {
        fetch('/api/medicines/categories')
            .then(r => r.json())
            .then(data => { if (data.categories) setDbCategories(data.categories); })
            .catch(() => {});
        fetch('/api/medicines/popular')
            .then(r => r.json())
            .then(data => { if (data.medicines) setPopularMeds(data.medicines); })
            .catch(() => {});
    }, []);

    // Merge DB categories into local categories
    const getCategoryById = (id) => {
        const localCat = categories.find(c => c.id === id);
        if (!localCat) return null;
        const nameMap = {
            'bp': 'Blood Pressure', 'fever': 'Fever', 'cold': 'Cold & Flu',
            'diabetes': 'Diabetes', 'pain': 'Pain Relief', 'acidity': 'Acidity',
            'antibiotics': 'Antibiotics', 'heart': 'Heart & Cholesterol',
            'vitamins': 'Vitamins & Supplements', 'thyroid': 'Thyroid',
            'skin': 'Skin Care', 'eye': 'Eye & Ear',
        };
        const dbCat = dbCategories.find(c => c.name === nameMap[id]);
        const meds = dbCat ? dbCat.medicines.map(m => ({
            name: m.name, use: m.salt || m.type, price: m.schedule === 'OTC' ? '₹ OTC' : '₹ Rx',
            dose: m.strength, salt: m.salt, strength: m.strength, manufacturer: m.manufacturer,
            type: m.type, schedule: m.schedule, icon: m.icon,
        })) : [];
        return { ...localCat, meds, count: dbCat ? dbCat.count : 0 };
    };

    const enrichedCategories = categories.map(c => {
        const nameMap = {
            'bp': 'Blood Pressure', 'fever': 'Fever', 'cold': 'Cold & Flu',
            'diabetes': 'Diabetes', 'pain': 'Pain Relief', 'acidity': 'Acidity',
            'antibiotics': 'Antibiotics', 'heart': 'Heart & Cholesterol',
            'vitamins': 'Vitamins & Supplements', 'thyroid': 'Thyroid',
            'skin': 'Skin Care', 'eye': 'Eye & Ear',
        };
        const dbCat = dbCategories.find(dc => dc.name === nameMap[c.id]);
        return { ...c, count: dbCat ? dbCat.count : 0 };
    });

    // Debounced API search
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setApiResults([]);
            setApiLoading(false);
            return;
        }
        setApiLoading(true);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            fetch(`/api/medicines/search?q=${encodeURIComponent(searchQuery)}&limit=20`)
                .then(r => r.json())
                .then(data => {
                    setApiResults(data.results || []);
                    setApiLoading(false);
                })
                .catch(() => {
                    setApiResults([]);
                    setApiLoading(false);
                });
        }, 300);
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchQuery]);

    const nearbyPharmacies = [
        { name: 'Apollo Pharmacy', dist: '800m', avail: true },
        { name: 'MedPlus', dist: '1.2km', avail: true },
        { name: 'Netmeds Store', dist: '1.8km', avail: false },
    ];

    const isInCart = (name) => cart.find(i => i.name === name);

    // ── Real Scanner with Camera ──
    const startScanner = async () => {
        setIsScanning(true);
        setScanProgress(0);
        setScanPreviewImg(null);
        setScanExtracted(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            rxStreamRef.current = stream;
            // Wait for video element to be in DOM
            setTimeout(() => {
                if (rxVideoRef.current) {
                    rxVideoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            showNotification('Camera access denied. You can upload an image instead.', 'error');
            // Fallback to file upload
            setIsScanning(false);
            rxUploadRef.current?.click();
        }
    };

    const stopRxCamera = () => {
        if (rxStreamRef.current) {
            rxStreamRef.current.getTracks().forEach(track => track.stop());
            rxStreamRef.current = null;
        }
    };

    const captureRxPhoto = () => {
        if (rxVideoRef.current && rxCanvasRef.current) {
            const canvas = rxCanvasRef.current;
            const video = rxVideoRef.current;
            
            // Ensure video has dimensions (prevents capturing blank frames)
            if (!video.videoWidth || !video.videoHeight) {
                showNotification('Camera not ready. Try again in a moment.', 'error');
                return;
            }
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                
                // Validate that we actually captured pixel data
                if (imageData.length < 500) {
                    showNotification('Capture failed. Please try again.', 'error');
                    return;
                }
                
                setScanPreviewImg(imageData);
                stopRxCamera();
                processRxImage(imageData);
            }
        }
    };

    const processRxImage = async (imageData) => {
        // Basic validation for base64 image data
        if (!imageData || imageData.length < 500 || !imageData.startsWith('data:image')) {
            showNotification('Invalid image data. Please tray again.', 'error');
            setScanProgress(0);
            return;
        }

        setScanProgress(0);
        setScanExtracted(null);
        setScanStatusMsg('Uploading image...');
        let currentProgress = 0;
        let apiDone = false;

        // Phased progress: slow ramp matching real AI timing (~25s)
        const statusMessages = [
            { at: 5, msg: '📤 Uploading image...' },
            { at: 12, msg: '🔍 Reading prescription text...' },
            { at: 25, msg: '🧠 AI analyzing handwriting...' },
            { at: 40, msg: '💊 Identifying medicines...' },
            { at: 55, msg: '🔬 Matching with drug database...' },
            { at: 70, msg: '📋 Extracting dosage info...' },
            { at: 80, msg: '✨ Finalizing results...' },
        ];

        const progressInterval = setInterval(() => {
            if (apiDone) return;
            // Slow phased progress: fast at start, very slow near end
            if (currentProgress < 15) {
                currentProgress += 0.8;
            } else if (currentProgress < 35) {
                currentProgress += 0.5;
            } else if (currentProgress < 55) {
                currentProgress += 0.35;
            } else if (currentProgress < 70) {
                currentProgress += 0.2;
            } else if (currentProgress < 82) {
                currentProgress += 0.1;
            } else {
                currentProgress += 0.03;
            }
            currentProgress = Math.min(currentProgress, 85);
            setScanProgress(Math.round(currentProgress));
            // Update status message at milestones
            for (let i = statusMessages.length - 1; i >= 0; i--) {
                if (currentProgress >= statusMessages[i].at) {
                    setScanStatusMsg(statusMessages[i].msg);
                    break;
                }
            }
        }, 500);

        try {
            const response = await fetch('/api/prescription/scan', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ image: imageData })
            });
            apiDone = true;
            clearInterval(progressInterval);
            const data = await response.json();

            // Smooth finish from current to 100%
            setScanStatusMsg('✅ Processing complete!');
            for (let i = Math.round(currentProgress); i <= 100; i += 2) {
                await new Promise(r => setTimeout(r, 25));
                setScanProgress(i);
            }
            setScanProgress(100);

            if (data.success && data.medicines) {
                setScanExtracted(data);
                addHealthRecord({ title: 'Rx Scan - ' + (data.doctor || 'Prescription'), category: 'prescription', type: 'scan', source: 'pharmacy', meta: { medicines: data.medicines, doctor: data.doctor, patient: data.patient, doctorInfo: data.doctorInfo, extractedText: data.extractedText } });
                showNotification(`Found ${data.medicines.length} medicines in prescription!`, 'success');
            } else {
                const errorMsg = data.message || 'Could not extract medicines. Try a clearer photo.';
                showNotification(errorMsg, 'error');
                setScanStatusMsg('❌ Extraction failed');
            }
        } catch (err) {
            apiDone = true;
            clearInterval(progressInterval);
            showNotification('Scan failed. Is the server running?', 'error');
            setScanProgress(100);
        }
    };

    // ── Real Upload with File Picker ──
    const startUpload = () => {
        rxUploadRef.current?.click();
    };

    const handleRxFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        setIsScanning(true);
        setScanPreviewImg(null);
        setScanExtracted(null);
        setScanProgress(0);

        const reader = new FileReader();
        reader.onload = (ev) => {
            e.target.value = '';
            const dataUrl = ev.target.result;
            // Compress via canvas (like camera capture) for consistent API behavior
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_DIM = 1600;
                let w = img.width, h = img.height;
                if (Math.max(w, h) > MAX_DIM) {
                    const scale = MAX_DIM / Math.max(w, h);
                    w = Math.round(w * scale);
                    h = Math.round(h * scale);
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', 0.9);
                setScanPreviewImg(compressed);
                processRxImage(compressed).finally(() => {
                    setIsUploading(false);
                });
            };
            img.onerror = () => {
                showNotification('Could not load image. Try a different file.', 'error');
                setIsUploading(false);
                setIsScanning(false);
            };
            img.src = dataUrl;
        };
        reader.onerror = () => {
            showNotification('Failed to read file. Please try again.', 'error');
            setIsUploading(false);
            setIsScanning(false);
        };
        reader.readAsDataURL(file);
    };

    if (isScanning) {
        return (
            <div className="screen pharmacy-screen active">
                <div className="ph-hdr" style={{background: 'var(--teal-accent)', color: '#fff'}}>
                    <div className="btn-back" style={{color: '#fff'}} onClick={() => {
                        stopRxCamera(); setIsScanning(false); setIsUploading(false); setScanPreviewImg(null); setScanExtracted(null);
                    }}><Icons.Back /></div>
                    <h1 style={{color: '#fff'}}>📷 Rx Intelligent Scanner</h1>
                    <span className="ph-clear" style={{color: '#fff'}} onClick={() => {
                        stopRxCamera(); setIsScanning(false); setIsUploading(false); setScanPreviewImg(null); setScanExtracted(null);
                    }}>✕</span>
                </div>
                <div className="ph-body" style={{padding: 0}}>
                    <div className="scanner-container">
                        {/* Live Camera View */}
                        {!scanPreviewImg && !isUploading && (
                            <div className="scanner-view-box" style={{minHeight:300}}>
                                <div className="scanner-line"></div>
                                <video ref={rxVideoRef} autoPlay playsInline style={{width:'100%', display: 'block'}} />
                                <canvas ref={rxCanvasRef} style={{display:'none'}} />
                                <div style={{position:'absolute',bottom:24,left:0,right:0,display:'flex',justifyContent:'center',gap:20,zIndex:15}}>
                                    <button onClick={captureRxPhoto} className="btn-pulse" style={{width:68,height:68,borderRadius:'50%',background:'linear-gradient(135deg, #fff, #f0f0f0)',border:'5px solid var(--teal-accent)',cursor:'pointer',boxShadow:'0 8px 25px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                        <span style={{fontSize:28}}>📸</span>
                                    </button>
                                    <button onClick={() => { stopRxCamera(); rxUploadRef.current?.click(); }} style={{width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,0.9)',border:'none',cursor:'pointer',boxShadow:'0 4px 12px rgba(0,0,0,0.2)',alignSelf:'center', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                        <span style={{fontSize:20}}>📁</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Upload loading state */}
                        {!scanPreviewImg && isUploading && (
                            <div className="scanner-glass-card" style={{minHeight:240,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16, textAlign:'center'}}>
                                <div className="spinner" style={{width:50, height:50, borderTopColor:'var(--teal-accent)'}}></div>
                                <div>
                                    <p style={{color:'var(--teal-accent)',fontWeight:700,fontSize:'1.1rem', marginBottom:4}}>Optimizing Image...</p>
                                    <p style={{color:'#666',fontSize:'0.85rem'}}>Enhancing resolution for AI clarity</p>
                                </div>
                            </div>
                        )}

                        {/* Preview of captured/uploaded image */}
                        {scanPreviewImg && (
                            <div className={`scanner-view-box ${scanExtracted ? 'scanner-success-glow' : ''}`} style={{marginBottom:18}}>
                                <img src={scanPreviewImg} alt="Prescription" style={{width:'100%',display:'block'}} />
                                {scanProgress > 0 && scanProgress < 100 && (
                                    <div className="scanner-line"></div>
                                )}
                            </div>
                        )}

                        {/* Progress */}
                        {scanProgress > 0 && scanProgress < 100 && (
                            <div className="scanner-glass-card">
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                                    <p className="scanner-pulse-text" style={{fontSize:'0.95rem',fontWeight:700,color:'var(--teal-accent)'}}>
                                        {scanStatusMsg || '🧠 Analyzing Hand-writing...'}
                                    </p>
                                    <span style={{fontSize:'0.85rem', fontWeight:800, color:'var(--teal-accent)'}}>{scanProgress}%</span>
                                </div>
                                <div className="scanner-progress-bar-bg">
                                    <div className="scanner-progress-bar-fill" style={{width:`${scanProgress}%`}}></div>
                                </div>
                                <p style={{fontSize:'0.75rem',color:'#777',marginTop:10, lineHeight:1.4}}>
                                    Our Medical AI is currently decoding the prescription details. This usually takes around 20-30 seconds.
                                </p>
                            </div>
                        )}

                        {/* Extracted Results */}
                        {scanExtracted && (
                            <div className="scanner-results-area">
                                {/* Patient & Doctor Info */}
                                {(scanExtracted.patient?.name || scanExtracted.doctorInfo?.name) && (
                                    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                                        {scanExtracted.patient?.name && (
                                            <div className="scanner-glass-card" style={{flex:1,minWidth:160,padding:'12px', background:'rgba(232, 245, 233, 0.6)', marginBottom: 0}}>
                                                <span style={{fontSize:'0.7rem',color:'#666',display:'block', textTransform:'uppercase', letterSpacing:1, marginBottom:4}}>👤 Patient</span>
                                                <span style={{fontWeight:750,color:'#2E7D32', fontSize:'1rem'}}>{scanExtracted.patient.name}</span>
                                                <div style={{display:'flex', gap:6, marginTop:2}}>
                                                    {scanExtracted.patient.age && <span style={{color:'#444',fontSize:'0.75rem', background:'rgba(0,0,0,0.05)', padding:'2px 6px', borderRadius:4}}>{scanExtracted.patient.age}</span>}
                                                    {scanExtracted.patient.gender && <span style={{color:'#444',fontSize:'0.75rem', background:'rgba(0,0,0,0.05)', padding:'2px 6px', borderRadius:4}}>{scanExtracted.patient.gender}</span>}
                                                </div>
                                            </div>
                                        )}
                                        {scanExtracted.doctorInfo?.name && (
                                            <div className="scanner-glass-card" style={{flex:1,minWidth:160,padding:'12px', background:'rgba(227, 242, 253, 0.6)', marginBottom: 0}}>
                                                <span style={{fontSize:'0.7rem',color:'#666',display:'block', textTransform:'uppercase', letterSpacing:1, marginBottom:4}}>🩺 Doctor</span>
                                                <span style={{fontWeight:750,color:'#1565C0', fontSize:'1rem'}}>{scanExtracted.doctorInfo.name}</span>
                                                {scanExtracted.doctorInfo.clinic && <span style={{display:'block',color:'#444',fontSize:'0.75rem', marginTop:2}}>🏥 {scanExtracted.doctorInfo.clinic}</span>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                                    <h3 style={{color:'var(--teal-accent)', margin: 0, fontSize:'1.1rem'}}>💊 Extracted Medicines ({scanExtracted.medicines.length})</h3>
                                    {scanExtracted.pipelineInfo && (
                                        <span style={{color:'#999',fontSize:'0.7rem', background:'#f0f0f0', padding:'3px 8px', borderRadius:6}}>✨ AI • {scanExtracted.pipelineInfo.time_ms}ms</span>
                                    )}
                                </div>
                                
                                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
                                    💡 We auto-picked the nearest pharmacy for each medicine. Tap <b>Change</b> to switch.
                                </p>

                                {scanExtracted.medicines.map((med, i) => {
                                    const ph = scanPharma[i] || { loading: true, results: [], selectedIdx: -1 };
                                    const sel = ph.selectedIdx >= 0 ? ph.results[ph.selectedIdx] : null;
                                    return (
                                        <div key={i} className="scanner-glass-card medicine-card-stagger" style={{
                                            borderLeft: med.confidence >= 85 ? '5px solid #2E7D32' : med.confidence >= 70 ? '5px solid #F9A825' : '5px solid #ef5350',
                                            animationDelay: `${i * 0.15}s`
                                        }}>
                                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                                                <span style={{fontWeight:800,color:'#333',fontSize:'1rem'}}>{med.name}</span>
                                                <span style={{
                                                    padding:'3px 8px',borderRadius:8,fontSize:'0.7rem',fontWeight:700,
                                                    background: med.confidence >= 85 ? '#E8F5E9' : med.confidence >= 70 ? '#FFF3E0' : '#FFEBEE',
                                                    color: med.confidence >= 85 ? '#2E7D32' : med.confidence >= 70 ? '#E65100' : '#C62828'
                                                }}>{Math.round(med.confidence)}% match</span>
                                            </div>
                                            {med.salt && <span style={{display:'block',color:'var(--teal-accent)',fontSize:'0.82rem',fontWeight:600,marginBottom:8}}>🧪 {med.salt}</span>}
                                            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                                                {med.strength && <span style={{padding:'4px 10px',background:'#E8EAF6',borderRadius:10,fontSize:'0.72rem',color:'#283593', fontWeight:600}}>💪 {med.strength}</span>}
                                                {med.dosage && <span style={{padding:'4px 10px',background:'#FFF3E0',borderRadius:10,fontSize:'0.72rem',color:'#E65100', fontWeight:600}}>⏰ {med.dosage}</span>}
                                                {med.duration && <span style={{padding:'4px 10px',background:'#F3E5F5',borderRadius:10,fontSize:'0.72rem',color:'#6A1B9A', fontWeight:600}}>📅 {med.duration}</span>}
                                                {med.route && <span style={{padding:'4px 10px',background:'#E0F2F1',borderRadius:10,fontSize:'0.72rem',color:'#00695C', fontWeight:600}}>💉 {med.route}</span>}
                                            </div>

                                            {/* Inline pharmacy resolution */}
                                            <div style={{
                                                marginTop: 12, padding: 10, borderRadius: 10,
                                                background: sel ? '#f0fdf9' : ph.loading ? '#fafafa' : '#fef2f2',
                                                border: '1px dashed ' + (sel ? '#0d9488' : ph.loading ? '#e5e7eb' : '#fecaca')
                                            }}>
                                                {ph.loading && (
                                                    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#64748b'}}>
                                                        <span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</span>
                                                        Finding nearest pharmacy...
                                                    </div>
                                                )}
                                                {!ph.loading && !sel && (
                                                    <div style={{fontSize:12,color:'#991b1b',fontWeight:600}}>
                                                        ❌ No pharmacy within 5 km has this medicine
                                                    </div>
                                                )}
                                                {sel && (
                                                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                                                        <div style={{flex:1,minWidth:0}}>
                                                            <div style={{fontSize:13,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                                                🏪 {sel.pharmacy.name}
                                                            </div>
                                                            <div style={{fontSize:11,color:'#0d9488',fontWeight:600,marginTop:2}}>
                                                                📍 {(sel.pharmacy.distanceMeters/1000).toFixed(2)} km • ₹{sel.medicine.price}
                                                            </div>
                                                            {sel.pharmacy.phone && (
                                                                <a href={'tel:' + sel.pharmacy.phone} onClick={(e) => e.stopPropagation()}
                                                                    style={{fontSize:11,color:'#0f766e',fontWeight:600,textDecoration:'none',display:'inline-block',marginTop:1}}>
                                                                    📞 {sel.pharmacy.phone}
                                                                </a>
                                                            )}
                                                        </div>
                                                        {ph.results.length > 1 && (
                                                            <button onClick={() => setPickerOpenIdx(i)} style={{
                                                                padding:'6px 12px', borderRadius:8, border:'1px solid #0d9488',
                                                                background:'#fff', color:'#0d9488', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'
                                                            }}>🔄 Change</button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {med.notes && <div style={{marginTop:10, padding:'8px 10px', background:'rgba(0,0,0,0.03)', borderRadius:8, fontSize:'0.78rem', color:'#666', fontStyle:'italic'}}>📝 Note: {med.notes}</div>}
                                        </div>
                                    );
                                })}

                                {/* Smart Add All — adds each medicine from its currently-selected pharmacy */}
                                {(() => {
                                    const resolvedCount = scanExtracted.medicines.reduce((acc, _, i) => {
                                        const e = scanPharma[i];
                                        return acc + ((e && e.selectedIdx >= 0) ? 1 : 0);
                                    }, 0);
                                    const totalCount = scanExtracted.medicines.length;
                                    const noneResolved = resolvedCount === 0;
                                    const anyLoading = scanExtracted.medicines.some((_, i) => scanPharma[i] && scanPharma[i].loading);

                                    const addAll = async () => {
                                        if (anyLoading || noneResolved) return;
                                        setAddingAll(true);
                                        const token = localStorage.getItem('token');
                                        let added = 0;
                                        for (let i = 0; i < scanExtracted.medicines.length; i++) {
                                            const e = scanPharma[i];
                                            if (!e || e.selectedIdx < 0) continue;
                                            const r = e.results[e.selectedIdx];
                                            const m = r.medicine;
                                            const p = r.pharmacy;
                                            // backend cart
                                            try {
                                                await fetch('/api/cart/add', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                                                    body: JSON.stringify({ batchId: m.batchId, quantity: 1 })
                                                });
                                            } catch (e) {}
                                            // local cart for the existing CartBar/CartScreen
                                            addToCart({
                                                name: m.brandName,
                                                use: m.salt || m.strength || 'Prescription medicine',
                                                price: '₹ ' + m.price,
                                                numPrice: m.price,
                                                dose: m.strength || '',
                                                salt: m.salt,
                                                strength: m.strength,
                                                manufacturer: m.manufacturer,
                                                icon: '💊',
                                                pharmacy: p.id,
                                                pharmacyName: p.name,
                                                batchId: m.batchId,
                                                distanceKm: (p.distanceMeters / 1000).toFixed(2),
                                                mapsHref: p.coords ? 'https://www.google.com/maps?q=' + p.coords.lat + ',' + p.coords.lng : null
                                            }, { icon: '💊', color: '#008080', bg: '#E0F2F1', name: 'Prescription' });
                                            added++;
                                        }
                                        setAddingAll(false);
                                        showNotification('Added ' + added + ' of ' + totalCount + ' medicines to cart', 'success');
                                    };

                                    return (
                                        <button
                                            onClick={addAll}
                                            disabled={anyLoading || noneResolved || addingAll}
                                            style={{
                                                width:'100%', marginTop:10, padding:'16px', borderRadius:14, border:'none',
                                                background: (noneResolved || anyLoading)
                                                    ? '#e5e7eb'
                                                    : 'linear-gradient(135deg, #004d40, #00a5a5)',
                                                color: (noneResolved || anyLoading) ? '#94a3b8' : '#fff',
                                                fontWeight:800, cursor: (noneResolved || anyLoading) ? 'not-allowed' : 'pointer', fontSize:'1rem',
                                                boxShadow: (noneResolved || anyLoading) ? 'none' : '0 6px 20px rgba(0,128,128,0.3)'
                                            }}>
                                            {addingAll
                                                ? '⏳ Adding to cart...'
                                                : anyLoading
                                                ? '⏳ Finding pharmacies...'
                                                : noneResolved
                                                ? '❌ No pharmacies available'
                                                : '🛒 Add All ' + resolvedCount + (resolvedCount < totalCount ? ' (of ' + totalCount + ')' : '') + ' to Cart'}
                                        </button>
                                    );
                                })()}

                                <button onClick={() => { setScanPreviewImg(null); setScanExtracted(null); setScanProgress(0); setScanStatusMsg(''); startScanner(); }}
                                    style={{width:'100%',marginTop:12,padding:'14px',borderRadius:14,border:'2.5px solid var(--teal-accent)',background:'transparent',color:'var(--teal-accent)',fontWeight:700,cursor:'pointer', fontSize:'0.9rem', marginBottom: 24}}>
                                    🔄 New Prescription Scan
                                </button>

                                {/* ── PHARMACY PICKER POPUP ── */}
                                {pickerOpenIdx !== null && scanPharma[pickerOpenIdx] && (() => {
                                    const idx = pickerOpenIdx;
                                    const entry = scanPharma[idx];
                                    const med = scanExtracted.medicines[idx];
                                    return (
                                        <div onClick={() => setPickerOpenIdx(null)} style={{
                                            position:'fixed', inset:0, background:'rgba(15,23,42,0.55)',
                                            zIndex: 9999, display:'flex', alignItems:'flex-end', justifyContent:'center', padding: 12
                                        }}>
                                            <div onClick={(e) => e.stopPropagation()} style={{
                                                background:'#fff', borderRadius:16, width:'100%', maxWidth:420,
                                                maxHeight:'70vh', display:'flex', flexDirection:'column', overflow:'hidden',
                                                boxShadow:'0 -8px 30px rgba(0,0,0,0.3)'
                                            }}>
                                                <div style={{padding:'14px 16px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                                                    <div>
                                                        <div style={{fontSize:14, fontWeight:800, color:'#0f172a'}}>Choose pharmacy</div>
                                                        <div style={{fontSize:11, color:'#64748b'}}>for <b>{med.name}</b></div>
                                                    </div>
                                                    <button onClick={() => setPickerOpenIdx(null)} style={{background:'transparent', border:'none', fontSize:22, color:'#64748b', cursor:'pointer'}}>✕</button>
                                                </div>
                                                <div style={{flex:1, overflowY:'auto'}}>
                                                    {entry.results.map((r, j) => {
                                                        const isSelected = j === entry.selectedIdx;
                                                        const km = (r.pharmacy.distanceMeters/1000).toFixed(2);
                                                        const maps = r.pharmacy.coords ? 'https://www.google.com/maps?q=' + r.pharmacy.coords.lat + ',' + r.pharmacy.coords.lng : null;
                                                        return (
                                                            <div key={r.medicine.batchId} onClick={() => {
                                                                setScanPharma(prev => ({ ...prev, [idx]: { ...prev[idx], selectedIdx: j } }));
                                                                setPickerOpenIdx(null);
                                                            }} style={{
                                                                padding:'12px 16px', borderBottom:'1px solid #f1f5f9', cursor:'pointer',
                                                                background: isSelected ? '#f0fdf9' : '#fff',
                                                                display:'flex', alignItems:'center', gap:10
                                                            }}>
                                                                <div style={{
                                                                    width:24, height:24, borderRadius:'50%', flexShrink:0,
                                                                    border:'2px solid ' + (isSelected ? '#0d9488' : '#cbd5e1'),
                                                                    background: isSelected ? '#0d9488' : '#fff',
                                                                    display:'flex', alignItems:'center', justifyContent:'center',
                                                                    color:'#fff', fontSize:12, fontWeight:800
                                                                }}>{isSelected ? '✓' : ''}</div>
                                                                <div style={{flex:1, minWidth:0}}>
                                                                    <div style={{fontSize:13, fontWeight:700, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.pharmacy.name}</div>
                                                                    <div style={{fontSize:11, color:'#0d9488', fontWeight:600, marginTop:2}}>📍 {km} km • ₹{r.medicine.price}</div>
                                                                    {r.pharmacy.phone && (
                                                                        <div style={{fontSize:10, color:'#0f766e', fontWeight:600, marginTop:1}}>📞 {r.pharmacy.phone}</div>
                                                                    )}
                                                                    <div style={{fontSize:10, color:'#94a3b8', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                                        {r.medicine.brandName}{r.medicine.strength ? ' • ' + r.medicine.strength : ''}
                                                                    </div>
                                                                </div>
                                                                {maps && (
                                                                    <a href={maps} target="_blank" rel="noopener noreferrer"
                                                                       onClick={(e) => e.stopPropagation()}
                                                                       style={{fontSize:10, color:'#0f172a', textDecoration:'none', padding:'4px 8px', borderRadius:6, border:'1px solid #e5e7eb', whiteSpace:'nowrap'}}>
                                                                       🗺️ Maps
                                                                    </a>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
                <input ref={rxUploadRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleRxFileUpload} />
            </div>
        );
    }

    // ── My Orders View ──
    if (activeView === 'orders') {
        const activeOrders = orders.filter(o => o.status !== 'delivered');
        const completedOrders = orders.filter(o => o.status === 'delivered');

        const formatTime = (ts) => {
            const d = new Date(ts);
            const now = new Date();
            const diffMs = now - d;
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHrs = Math.floor(diffMins / 60);
            if (diffHrs < 24) return `${diffHrs}h ago`;
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        };

        const OrderStatusTimeline = ({ currentStatus }) => {
            const currentIdx = ORDER_STATUSES.indexOf(currentStatus);
            return (
                <div className="ord-timeline">
                    {ORDER_STATUSES.map((status, i) => (
                        <React.Fragment key={status}>
                            <div className={`ord-tl-step ${i <= currentIdx ? 'active' : ''} ${i === currentIdx ? 'current' : ''}`}>
                                <div className="ord-tl-dot">
                                    {i < currentIdx ? '✓' : ORDER_STATUS_ICONS[status]}
                                </div>
                                <span className="ord-tl-label">{ORDER_STATUS_LABELS[status]}</span>
                            </div>
                            {i < ORDER_STATUSES.length - 1 && (
                                <div className={`ord-tl-connector ${i < currentIdx ? 'active' : ''}`}></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            );
        };

        return (
            <div className="screen pharmacy-screen active">
                <div className="ph-hdr">
                    <div className="btn-back" onClick={() => setActiveView('main')}><Icons.Back /></div>
                    <h1>📦 My Orders</h1>
                    <div className="ph-cart-icon" onClick={() => toggleCart(true)}>
                        🛒 {totalItems > 0 && <span className="ph-cart-badge">{totalItems}</span>}
                    </div>
                </div>
                <div className="ph-body">
                    {orders.length === 0 ? (
                        <div className="ord-empty">
                            <div className="ord-empty-icon">📋</div>
                            <h3>No Orders Yet</h3>
                            <p>Your pharmacy orders will appear here after you place them.</p>
                            <button className="ord-browse-btn" onClick={() => setActiveView('main')}>
                                Browse Medicines
                            </button>
                        </div>
                    ) : (
                        <div className="ord-list">
                            {activeOrders.length > 0 && (
                                <>
                                    <h3 className="ord-section-title">⚡ Active Orders</h3>
                                    {activeOrders.map(order => (
                                        <div key={order.id} className="ord-card active-order" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                                            <div className="ord-card-hdr">
                                                <div className="ord-card-meta">
                                                    <span className="ord-id">{order.id}</span>
                                                    <span className="ord-time">{formatTime(order.placedAt)}</span>
                                                </div>
                                                <div className="ord-card-summary">
                                                    <span className="ord-items-count">{order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}</span>
                                                    <span className="ord-total">₹{order.total}</span>
                                                </div>
                                                <div className={`ord-status-badge ${order.status}`}>
                                                    {ORDER_STATUS_ICONS[order.status]} {ORDER_STATUS_LABELS[order.status]}
                                                </div>
                                            </div>

                                            <OrderStatusTimeline currentStatus={order.status} />

                                            {expandedOrder === order.id && (
                                                <div className="ord-detail animate-slide-up">
                                                    <div className="ord-detail-hdr">
                                                        <span className="ico">💊</span>
                                                        <h4>Medicines</h4>
                                                    </div>
                                                    {order.items.map((item, i) => (
                                                        <div key={i} className="ord-detail-item">
                                                            <div className="ord-item-info">
                                                                <span className="ord-item-name">{item.name}</span>
                                                                <span className="ord-item-meta">{item.use} • {item.dose}</span>
                                                            </div>
                                                            <div className="ord-item-right">
                                                                <span className="ord-item-qty">x{item.qty}</span>
                                                                <span className="ord-item-price">₹{item.numPrice * item.qty}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="ord-detail-footer">
                                                        <div className="ord-detail-row"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
                                                        <div className="ord-detail-row"><span>Delivery</span><span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span></div>
                                                        <div className="ord-detail-divider"></div>
                                                        <div className="ord-detail-row total"><span>Total</span><span>₹{order.total}</span></div>
                                                    </div>
                                                    <div className="ord-address-row">
                                                        <span className="ico">📍</span>
                                                        <p>{order.address}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}

                            {completedOrders.length > 0 && (
                                <>
                                    <h3 className="ord-section-title">✅ Completed</h3>
                                    {completedOrders.map(order => (
                                        <div key={order.id} className="ord-card completed-order" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                                            <div className="ord-card-hdr">
                                                <div className="ord-card-meta">
                                                    <span className="ord-id">{order.id}</span>
                                                    <span className="ord-time">{formatTime(order.placedAt)}</span>
                                                </div>
                                                <div className="ord-card-summary">
                                                    <span className="ord-items-count">{order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}</span>
                                                    <span className="ord-total">₹{order.total}</span>
                                                </div>
                                                <div className={`ord-status-badge ${order.status}`}>
                                                    {ORDER_STATUS_ICONS[order.status]} {ORDER_STATUS_LABELS[order.status]}
                                                </div>
                                            </div>
                                            {expandedOrder === order.id && (
                                                <div className="ord-detail animate-slide-up">
                                                    <div className="ord-detail-hdr">
                                                        <span className="ico">💊</span>
                                                        <h4>Medicines</h4>
                                                    </div>
                                                    {order.items.map((item, i) => (
                                                        <div key={i} className="ord-detail-item">
                                                            <div className="ord-item-info">
                                                                <span className="ord-item-name">{item.name}</span>
                                                                <span className="ord-item-meta">{item.use}</span>
                                                            </div>
                                                            <div className="ord-item-right">
                                                                <span className="ord-item-qty">x{item.qty}</span>
                                                                <span className="ord-item-price">₹{item.numPrice * item.qty}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="ord-detail-footer">
                                                        <div className="ord-detail-row total"><span>Total Paid</span><span>₹{order.total}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Category View ──
    if (activeView === 'category' && selectedCategory) {
        const cat = getCategoryById(selectedCategory);
        if (!cat) { setActiveView('main'); return null; }
        return (
            <div className="screen pharmacy-screen active">
                <div className="ph-hdr" style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}bb)` }}>
                    <div className="btn-back" onClick={() => setActiveView('main')}><Icons.Back /></div>
                    <h1>{cat.icon} {cat.name}</h1>
                    <div className="ph-cart-icon" onClick={() => toggleCart(true)}>
                        🛒 {totalItems > 0 && <span className="ph-cart-badge">{totalItems}</span>}
                    </div>
                </div>
                <div className="ph-body">
                    {cat.meds.length === 0 && (
                        <div style={{textAlign:'center',padding:'40px 20px',color:'#888'}}>
                            <span style={{fontSize:48,display:'block',marginBottom:12}}>📦</span>
                            <p>Loading medicines...</p>
                        </div>
                    )}
                    {cat.meds.map((m, i) => {
                        // Click anywhere on the card → go to pharmacy picker for this medicine.
                        // We pass the brand name via sessionStorage so the picker can pre-fill its search.
                        const openPicker = () => {
                            sessionStorage.setItem('swa_find_medicine', m.name);
                            if (m.salt) sessionStorage.setItem('swa_find_salt', m.salt);
                            else sessionStorage.removeItem('swa_find_salt');
                            navigateTo('nearby-pharmacies');
                        };
                        return (
                            <div key={i} className="ph-med-card" style={{ cursor: 'pointer' }} onClick={openPicker}>
                                <div className="ph-med-left">
                                    <div className="ph-med-ico" style={{ background: cat.bg, color: cat.color }}>{m.icon || cat.icon}</div>
                                    <div>
                                        <h4>{m.name}</h4>
                                        <p style={{color:'#008080',fontSize:'0.78rem'}}>{m.salt || m.use}</p>
                                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                                            {m.strength && <span style={{padding:'2px 6px',background:'#E8EAF6',borderRadius:6,fontSize:'0.7rem',color:'#283593'}}>{m.strength}</span>}
                                            {m.type && <span style={{padding:'2px 6px',background:'#FFF3E0',borderRadius:6,fontSize:'0.7rem',color:'#E65100'}}>{m.type}</span>}
                                            {m.manufacturer && m.manufacturer !== 'Generic' && <span style={{padding:'2px 6px',background:'#F3E5F5',borderRadius:6,fontSize:'0.7rem',color:'#6A1B9A'}}>{m.manufacturer}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="ph-med-right">
                                    <span className="ph-med-price">{m.schedule === 'OTC' ? 'OTC' : 'Rx'}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#0d9488', fontWeight: 600, marginTop: 4 }}>
                                        Find Pharmacy ›
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Medicine Detail ──
    if (activeView === 'detail' && selectedMedicine) {
        const cat = selectedMedicine.category || { icon: '💊', color: '#00BFA5', bg: '#E0F2F1' };
        const inCart = isInCart(selectedMedicine.name);
        return (
            <div className="screen pharmacy-screen active">
                <div className="ph-hdr" style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}bb)` }}>
                    <div className="btn-back" onClick={() => { setActiveView(selectedCategory ? 'category' : 'main'); setSelectedMedicine(null); }}><Icons.Back /></div>
                    <h1>Medicine Details</h1>
                    <div className="ph-cart-icon" onClick={() => toggleCart(true)}>
                        🛒 {totalItems > 0 && <span className="ph-cart-badge">{totalItems}</span>}
                    </div>
                </div>
                <div className="ph-body">
                    <div className="ph-detail-box">
                        <div className="ph-detail-top">
                            <div className="ph-detail-ico" style={{ background: cat.bg }}>{selectedMedicine.icon || cat.icon}</div>
                            <div>
                                <h3>{selectedMedicine.name}</h3>
                                {selectedMedicine.salt && <p style={{color:'#008080',fontWeight:500}}>{selectedMedicine.salt}</p>}
                                {!selectedMedicine.salt && selectedMedicine.use && <p>{selectedMedicine.use}</p>}
                            </div>
                        </div>
                        <div className="ph-detail-chips" style={{flexWrap:'wrap'}}>
                            {selectedMedicine.strength && <span className="ph-chip">💪 {selectedMedicine.strength}</span>}
                            {selectedMedicine.type && <span className="ph-chip">{selectedMedicine.icon || '💊'} {selectedMedicine.type}</span>}
                            {selectedMedicine.manufacturer && <span className="ph-chip">🏭 {selectedMedicine.manufacturer}</span>}
                            {selectedMedicine.schedule && <span className="ph-chip accent">{selectedMedicine.schedule === 'OTC' ? '🟢 OTC' : '🔵 Prescription'}</span>}
                        </div>
                        <div className="ph-detail-add-row">
                            <button className="ph-detail-add-btn" onClick={() => {
                                sessionStorage.setItem('swa_find_medicine', selectedMedicine.name);
                                if (selectedMedicine.salt) sessionStorage.setItem('swa_find_salt', selectedMedicine.salt);
                                else sessionStorage.removeItem('swa_find_salt');
                                navigateTo('nearby-pharmacies');
                            }}>
                                📍 Find at Pharmacies
                            </button>
                        </div>
                    </div>

                    <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '12px 16px' }}>
                        Pick a pharmacy nearby — each pharmacy sets its own price, distance, and stock.
                    </p>
                    {/* Mock nearby section kept hidden — real pharmacy listing happens on the picker screen.
                        Keeping the old array intact above to avoid breaking other state references. */}
                    {false && nearbyPharmacies.map((ph, i) => (
                        <div key={i} className="ph-nearby-item">
                            <div>
                                <h4>{ph.name}</h4>
                                <small>📍 {ph.dist} • {ph.avail ? '✅ Available' : '❌ Unavailable'}</small>
                            </div>
                            <button className={`ph-nearby-btn ${ph.avail ? '' : 'disabled'}`}
                                onClick={() => ph.avail && addToCart(selectedMedicine, cat)}>
                                {ph.avail ? '+ Add' : 'N/A'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Main View ──
    const results = apiResults;

    return (
        <div className="screen pharmacy-screen active">
            <div className="ph-hdr">
                <div className="btn-back" onClick={() => navigateTo('home')}><Icons.Back /></div>
                <h1>💊 Pharmacy</h1>
                <div className="ph-cart-icon" onClick={() => toggleCart(true)}>
                    🛒 {totalItems > 0 && <span className="ph-cart-badge">{totalItems}</span>}
                </div>
            </div>

            <div className="ph-body">
                {/* Search with Autocomplete */}
                <div className="ph-search-wrap">
                    <div className="ph-search">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA0A6" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input type="text" placeholder="Search 1200+ medicines..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                        {searchQuery && <span className="ph-clear" onClick={() => setSearchQuery('')}>✕</span>}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchQuery && searchQuery.length >= 2 && (
                        <div className="ph-autocomplete-dropdown">
                            {apiLoading && (
                                <div className="ph-autocomplete-empty" style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}>
                                    <span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</span> Searching medicines...
                                </div>
                            )}
                            {!apiLoading && results.length > 0 && (
                                <>
                                    <div style={{padding:'6px 14px',background:'#f0f7f7',fontSize:'0.72rem',color:'#008080',fontWeight:600,borderBottom:'1px solid #eee'}}>
                                        {results.length} medicine{results.length > 1 ? 's' : ''} found
                                    </div>
                                    {results.map((m, i) => {
                                        // Click the row → go to pharmacy picker for THIS medicine.
                                        // No direct add-to-cart; the user must pick a pharmacy first.
                                        const openPicker = () => {
                                            sessionStorage.setItem('swa_find_medicine', m.name);
                                            if (m.salt) sessionStorage.setItem('swa_find_salt', m.salt);
                                            else sessionStorage.removeItem('swa_find_salt');
                                            navigateTo('nearby-pharmacies');
                                        };
                                        return (
                                            <div key={i} className="ph-autocomplete-item" style={{ cursor: 'pointer' }} onClick={openPicker}>
                                                <div className="ph-autocomplete-left">
                                                    <span className="ph-autocomplete-icon" style={{fontSize:'1.3rem'}}>{m.icon}</span>
                                                    <div>
                                                        <p className="ph-autocomplete-name">{m.name}</p>
                                                        <p className="ph-autocomplete-meta" style={{color:'#008080'}}>{m.salt}</p>
                                                        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:3}}>
                                                            {m.strength && <span style={{padding:'1px 5px',background:'#E8EAF6',borderRadius:4,fontSize:'0.65rem',color:'#283593'}}>{m.strength}</span>}
                                                            <span style={{padding:'1px 5px',background:'#FFF3E0',borderRadius:4,fontSize:'0.65rem',color:'#E65100'}}>{m.type}</span>
                                                            {m.manufacturer && m.manufacturer !== 'Generic' && m.manufacturer !== 'Various' && (
                                                                <span style={{padding:'1px 5px',background:'#F3E5F5',borderRadius:4,fontSize:'0.65rem',color:'#6A1B9A'}}>{m.manufacturer}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="ph-autocomplete-right">
                                                    <span className="ph-autocomplete-price" style={{fontSize:'0.7rem',color: m.schedule === 'OTC' ? '#2E7D32' : '#1565C0'}}>{m.schedule === 'OTC' ? 'OTC' : 'Rx'}</span>
                                                    <span style={{ fontSize: '0.65rem', color: '#0d9488', fontWeight: 600, marginTop: 3 }}>
                                                        Find Pharmacy ›
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                            {!apiLoading && results.length === 0 && (
                                <div className="ph-autocomplete-empty">No medicines found for "{searchQuery}"</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="ph-quick-actions">
                    <div className="ph-qa-card" onClick={startUpload}>
                        <span className="ph-qa-icon">{isUploading ? '⌛' : '📄'}</span>
                        <span>{isUploading ? 'Uploading...' : 'Upload Rx'}</span>
                    </div>
                    <div className="ph-qa-card" onClick={startScanner}>
                        <span className="ph-qa-icon">📷</span><span>Scan Rx</span>
                    </div>
                    <input ref={rxUploadRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleRxFileUpload} />
                    <div className="ph-qa-card" onClick={() => setActiveView('orders')}>
                        <span className="ph-qa-icon">📦</span>
                        <span>My Orders</span>
                        {orders.filter(o => o.status !== 'delivered').length > 0 && <span className="ph-qa-badge">{orders.filter(o => o.status !== 'delivered').length}</span>}
                    </div>
                    <div className="ph-qa-card" onClick={() => {
                        showNotification('Finding nearest certified pharmacies...', 'info');
                        setSearchQuery('Pharmacy near me');
                    }}>
                        <span className="ph-qa-icon">📍</span><span>Nearby</span>
                    </div>
                </div>

                {/* Popular Medicines from DB */}
                <h3 className="ph-section-title">🔥 Popular Medicines</h3>
                <div className="ph-popular-row">
                    {(popularMeds.length > 0 ? popularMeds.slice(0, 8) : [
                        { name: 'Dolo 650', icon: '💊', catColor: '#FF7043' },
                        { name: 'Crocin', icon: '🌡️', catColor: '#42A5F5' },
                        { name: 'Combiflam', icon: '💪', catColor: '#EC407A' },
                        { name: 'Cetirizine', icon: '🤧', catColor: '#26A69A' },
                        { name: 'Azithromycin', icon: '🧬', catColor: '#5C6BC0' },
                    ]).map((m, i) => (
                        <div key={i} className="ph-pop-chip" style={{ borderColor: m.catColor || m.color || '#008080' }} onClick={() => setSearchQuery(m.name)}>
                            <span>{m.icon || '💊'}</span> {m.name}
                        </div>
                    ))}
                </div>

                {/* Database Stats */}
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'linear-gradient(135deg,#E0F2F1,#E8F5E9)',borderRadius:10,marginBottom:14}}>
                    <span style={{fontSize:'1.4rem'}}>🗄️</span>
                    <div>
                        <p style={{fontSize:'0.82rem',fontWeight:600,color:'#00695C',margin:0}}>1200+ Indian Medicines Available</p>
                        <p style={{fontSize:'0.7rem',color:'#666',margin:0}}>Search by brand name, salt composition, or category</p>
                    </div>
                </div>

                {/* Categories */}
                <h3 className="ph-section-title">🏥 Browse by Condition</h3>
                <div className="ph-cat-grid">
                    {enrichedCategories.map(c => (
                        <div key={c.id} className="ph-cat-item" style={{ background: c.bg }}
                            onClick={() => { setSelectedCategory(c.id); setActiveView('category'); setSearchQuery(''); }}>
                            <span className="ph-cat-ico">{c.icon}</span>
                            <span className="ph-cat-nm">{c.name}</span>
                            {c.count > 0 && <span style={{fontSize:'0.6rem',color:'#666',marginTop:2}}>{c.count} meds</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
