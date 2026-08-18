// ============================================
// HOME SCREEN - Premium Dashboard
// Compact header, health metrics, services, tips
// ============================================

window.HomeScreen = () => {
    const { useState, useEffect, useRef } = React;
    const { user, navigateTo, showNotification } = window.useApp();
    const Icons = window.Icons;
    const ServiceCard = window.ServiceCard;
    const BottomNav = window.BottomNav;
    const SideMenu = window.SideMenu;

    const [menuOpen, setMenuOpen] = useState(false);
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [notifCount] = useState(3);

    // ── Health Metric Card State (per-user) ──
    const [metricExpanded, setMetricExpanded] = useState(false);
    const userKey = user?.phone ? `swa_health_${user.phone}` : 'swa_health_metrics';
    const [healthData, setHealthData] = useState(() => {
        const saved = localStorage.getItem(userKey);
        return saved ? JSON.parse(saved) : { feet: '', inches: '', weight: '', age: user?.age || '', gender: 'Male' };
    });
    const [computedMetrics, setComputedMetrics] = useState(null);

    const healthTips = [
        { text: "Drink 2–3 liters of water daily.", icon: "💧" },
        { text: "Get 7-8 hours of quality sleep every night.", icon: "😴" },
        { text: "Walk at least 10,000 steps daily.", icon: "🚶" },
        { text: "Eat 5 servings of fruits and vegetables.", icon: "🥗" },
        { text: "Practice deep breathing for 5 minutes.", icon: "🧘" },
        { text: "Limit screen time before bedtime.", icon: "📵" },
        { text: "Take stretch breaks every 30 minutes.", icon: "🙆" },
        { text: "Wash hands frequently for 20 seconds.", icon: "🧼" },
        { text: "Maintain good posture while sitting.", icon: "🪑" },
        { text: "Schedule regular health check-ups.", icon: "🏥" },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentTipIndex((prev) => (prev + 1) % healthTips.length);
                setIsAnimating(false);
            }, 300);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // ── Compute Health Metrics (feet+inches → cm) ──
    const calculateMetrics = () => {
        const ft = parseInt(healthData.feet) || 0;
        const inch = parseInt(healthData.inches) || 0;
        const w = parseFloat(healthData.weight);
        const a = parseInt(healthData.age);
        const g = healthData.gender;

        if ((!ft && !inch) || !w || !a) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        if (ft < 1 || ft > 8) {
            showNotification('Height (feet) must be between 1 and 8', 'error');
            return;
        }
        if (inch < 0 || inch > 11) {
            showNotification('Inches must be between 0 and 11', 'error');
            return;
        }
        if (w < 20 || w > 300) {
            showNotification('Weight must be between 20 and 300 kg', 'error');
            return;
        }
        if (a < 5 || a > 120) {
            showNotification('Age must be between 5 and 120', 'error');
            return;
        }

        // Height in cm and meters
        const totalInches = (ft * 12) + inch;
        const heightCm = totalInches * 2.54;
        const heightM = heightCm / 100;

        // BMI = weight(kg) / height(m)² — WHO standard formula
        const bmiRaw = w / (heightM * heightM);
        const bmi = parseFloat(bmiRaw.toFixed(1));

        // BMI classification (WHO categories)
        let bmiCategory = '', bmiColor = '', bmiEmoji = '';
        if (bmi < 16) {
            bmiCategory = 'Severely Underweight'; bmiColor = '#1565C0'; bmiEmoji = '⚠️';
        } else if (bmi < 18.5) {
            bmiCategory = 'Underweight'; bmiColor = '#42A5F5'; bmiEmoji = '🔻';
        } else if (bmi < 25) {
            bmiCategory = 'Normal Weight'; bmiColor = '#66BB6A'; bmiEmoji = '✅';
        } else if (bmi < 30) {
            bmiCategory = 'Overweight'; bmiColor = '#FFA726'; bmiEmoji = '⚠️';
        } else if (bmi < 35) {
            bmiCategory = 'Obese (Class I)'; bmiColor = '#EF5350'; bmiEmoji = '🔴';
        } else if (bmi < 40) {
            bmiCategory = 'Obese (Class II)'; bmiColor = '#D32F2F'; bmiEmoji = '🔴';
        } else {
            bmiCategory = 'Obese (Class III)'; bmiColor = '#B71C1C'; bmiEmoji = '🔴';
        }

        // BMI scale position (clamped between 12 and 45 for display)
        const bmiScalePos = Math.min(Math.max(((bmi - 12) / (45 - 12)) * 100, 0), 100);

        // Ideal weight range (BMI 18.5 to 24.9)
        const idealLow = parseFloat((18.5 * heightM * heightM).toFixed(1));
        const idealHigh = parseFloat((24.9 * heightM * heightM).toFixed(1));
        const idealMid = (idealLow + idealHigh) / 2;
        const weightDeviation = parseFloat((w - idealMid).toFixed(1));

        // BMR using Mifflin-St Jeor Equation (most accurate modern formula)
        let bmr;
        if (g === 'Male') {
            bmr = (10 * w) + (6.25 * heightCm) - (5 * a) + 5;
        } else {
            bmr = (10 * w) + (6.25 * heightCm) - (5 * a) - 161;
        }
        bmr = Math.round(bmr);

        // TDEE (Total Daily Energy Expenditure) by activity level
        const activityLevels = {
            sedentary: { label: 'Sedentary', desc: 'Little/no exercise', factor: 1.2 },
            light: { label: 'Lightly Active', desc: '1-3 days/week', factor: 1.375 },
            moderate: { label: 'Moderately Active', desc: '3-5 days/week', factor: 1.55 },
            active: { label: 'Very Active', desc: '6-7 days/week', factor: 1.725 },
            extreme: { label: 'Extra Active', desc: 'Athlete/2x day', factor: 1.9 },
        };

        const tdeeTable = {};
        Object.entries(activityLevels).forEach(([key, val]) => {
            tdeeTable[key] = { ...val, calories: Math.round(bmr * val.factor) };
        });

        const dailyCal = tdeeTable.moderate.calories; // default moderate

        // Macros breakdown (based on moderate TDEE)
        const proteinG = Math.round(w * 1.0); // 1g per kg body weight
        const proteinCal = proteinG * 4;
        const fatCal = Math.round(dailyCal * 0.28); // 28% from fats
        const fatG = Math.round(fatCal / 9);
        const carbCal = dailyCal - proteinCal - fatCal;
        const carbG = Math.round(carbCal / 4);

        // Fiber recommendation (Academy of Nutrition and Dietetics)
        const fiberG = g === 'Male' ? 38 : 25;
        const fiberCal = fiberG * 2; // ~2 kcal per gram of fiber

        // Body fat % estimate (Deurenberg formula)
        let bodyFat;
        if (g === 'Male') {
            bodyFat = (1.20 * bmi) + (0.23 * a) - 16.2;
        } else {
            bodyFat = (1.20 * bmi) + (0.23 * a) - 5.4;
        }
        bodyFat = Math.max(3, parseFloat(bodyFat.toFixed(1)));

        const metrics = {
            bmi, bmiCategory, bmiColor, bmiEmoji, bmiScalePos,
            idealWeight: `${idealLow}–${idealHigh} kg`,
            weightDeviation,
            bmr,
            dailyCalories: dailyCal,
            tdeeTable,
            protein: `${proteinG}g`,
            proteinG,
            proteinCal,
            carbs: `${carbG}g`,
            carbG,
            carbCal,
            fats: `${fatG}g`,
            fatG,
            fatCal,
            fiberG,
            fiberCal,
            water: `${(w * 0.033).toFixed(1)}L`,
            bodyFat: `${bodyFat}%`,
            heightDisplay: `${ft}'${inch}" (${heightCm.toFixed(1)} cm)`,
            vitamins: g === 'Female' ? 'Iron, Calcium, Vit D, B12, Folic Acid' : 'Vit D, B12, Calcium, Omega-3',
        };

        setComputedMetrics(metrics);
        setMetricExpanded(true);
        localStorage.setItem(userKey, JSON.stringify(healthData));
        showNotification('Health metrics calculated!', 'success');
    };

    // ── BMI Scale Bar Component ──
    const BmiScaleBar = ({ bmi, position, color }) => (
        <div className="hmc-bmi-scale">
            <div className="hmc-scale-track">
                <div className="hmc-scale-seg underweight" style={{ width: '19.7%' }}>
                    <span>Under</span>
                </div>
                <div className="hmc-scale-seg normal" style={{ width: '19.7%' }}>
                    <span>Normal</span>
                </div>
                <div className="hmc-scale-seg overweight" style={{ width: '15.2%' }}>
                    <span>Over</span>
                </div>
                <div className="hmc-scale-seg obese" style={{ width: '45.4%' }}>
                    <span>Obese</span>
                </div>
            </div>
            <div className="hmc-scale-pointer" style={{ left: `${position}%` }}>
                <div className="hmc-pointer-dot" style={{ background: color }}></div>
                <span className="hmc-pointer-label" style={{ color }}>{bmi}</span>
            </div>
        </div>
    );

    // ... (rest of HomeScreen continues below)

    // ── SVG Icons for Services ──
    const MedicalReportIcon = () => (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="8" y="4" width="32" height="40" rx="4" />
            <rect x="18" y="1" width="12" height="8" rx="2" />
            <circle cx="24" cy="21" r="6" strokeWidth="1.5" />
            <line x1="28" y1="25" x2="33" y2="30" strokeWidth="2" />
            <line x1="14" y1="32" x2="34" y2="32" />
            <line x1="14" y1="38" x2="28" y2="38" />
        </svg>
    );
    const BillsIcon = () => (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="6" y="8" width="28" height="36" rx="3" />
            <line x1="12" y1="16" x2="28" y2="16" />
            <line x1="12" y1="22" x2="28" y2="22" />
            <line x1="12" y1="28" x2="22" y2="28" />
            <circle cx="34" cy="18" r="8" />
            <path d="M34 14 L34 22 M30 18 L38 18" strokeWidth="1.5" />
        </svg>
    );
    const PharmacyIcon = () => (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="10" y="16" width="20" height="28" rx="3" />
            <rect x="8" y="10" width="24" height="8" rx="2" />
            <path d="M16 10 L16 6 Q20 4 24 6 L24 10" />
            <line x1="16" y1="28" x2="24" y2="28" />
            <line x1="20" y1="24" x2="20" y2="32" />
            <circle cx="36" cy="34" r="8" />
            <path d="M33 34 L39 34 M36 31 L36 37" strokeWidth="1.5" />
        </svg>
    );
    const InsuranceIcon = () => (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M24 4 L40 10 L40 22 C40 34 24 44 24 44 C24 44 8 34 8 22 L8 10 L24 4Z" />
            <path d="M24 16 L24 28 M18 22 L30 22" strokeWidth="2" />
        </svg>
    );
    const ResearchIcon = () => (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="20" cy="20" r="12" />
            <line x1="29" y1="29" x2="40" y2="40" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 20 L20 24 L26 16" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    return (
        <div className="screen home-screen active">
            <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

            {/* ── Compact Header ── */}
            <div className="home-header-v2">
                <div className="hdr-left" onClick={() => setMenuOpen(true)}>
                    <img className="hdr-logo" src="LOGO.jpeg" alt="Swa-Astha Logo" width="32" height="32" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                    <span className="hdr-appname">Swa-Astha</span>
                </div>
                <div className="hdr-right">
                    <div className="hdr-notif-wrap" onClick={() => showNotification('No new notifications', 'info')}>
                        <svg className="hdr-notif-icon" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {notifCount > 0 && <span className="hdr-notif-badge">{notifCount}</span>}
                    </div>
                    <div className="hdr-avatar-mini" onClick={() => navigateTo('profile')}>
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </div>

            {/* ── Welcome Strip ── */}
            <div className="welcome-strip">
                <div className="ws-top-row">
                    <div className="ws-text">
                        <span className="ws-greeting">Hello, <strong>{user?.name || 'User'}</strong> 👋</span>
                        <span className="ws-sub">How are you feeling today?</span>
                    </div>
                    {user?.patientId && (
                        <div className="ws-patient-badge" onClick={() => {
                            navigator.clipboard?.writeText(user.patientId).then(() => showNotification('Patient ID copied!', 'success')).catch(() => {});
                        }}>
                            <span className="ws-pid-icon">🆔</span>
                            <span className="ws-pid-code">{user.patientId}</span>
                            <svg className="ws-pid-copy" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </div>
                    )}
                </div>
                <div className="ws-search" onClick={() => showNotification('Search coming soon!', 'info')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA0A6" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <span>Search doctors, medicines...</span>
                </div>
            </div>

            {/* ── Health Metric Card ── */}
            <div className="hmc-section">
                <div className="hmc-card-v2">
                    <div className="hmc-header-v2" onClick={() => computedMetrics && setMetricExpanded(!metricExpanded)}>
                        <span className="hmc-emoji-icon">❤️‍🩹</span>
                        <span className="hmc-title-v2">Health Metric Card</span>
                        <span className="hmc-new-badge">NEW</span>
                        {computedMetrics && <span className={`hmc-chevron ${metricExpanded ? 'open' : ''}`}>▾</span>}
                    </div>

                    <div className="hmc-form-v2">
                        <div className="hmc-row">
                            <div className="hmc-f">
                                <label>Height (ft)</label>
                                <input type="number" placeholder="5" min="1" max="8" value={healthData.feet}
                                    onChange={e => setHealthData({ ...healthData, feet: e.target.value })}
                                    spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                            </div>
                            <div className="hmc-f">
                                <label>Inches</label>
                                <input type="number" placeholder="7" min="0" max="11" value={healthData.inches}
                                    onChange={e => setHealthData({ ...healthData, inches: e.target.value })}
                                    spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                            </div>
                            <div className="hmc-f">
                                <label>Weight (kg)</label>
                                <input type="number" placeholder="64" value={healthData.weight}
                                    onChange={e => setHealthData({ ...healthData, weight: e.target.value })}
                                    spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                            </div>
                        </div>
                        <div className="hmc-row">
                            <div className="hmc-f">
                                <label>Age</label>
                                <input type="number" placeholder="21" value={healthData.age}
                                    onChange={e => setHealthData({ ...healthData, age: e.target.value })}
                                    spellCheck="false" autoComplete="off" autoCorrect="off" autoCapitalize="none" data-gramm="false" />
                            </div>
                            <div className="hmc-f">
                                <label>Gender</label>
                                <select value={healthData.gender}
                                    onChange={e => setHealthData({ ...healthData, gender: e.target.value })}>
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>
                            </div>
                            <div className="hmc-f hmc-btn-wrap">
                                <button className="hmc-calc-btn" onClick={calculateMetrics}>Calculate</button>
                            </div>
                        </div>
                    </div>

                    {/* ── Results Panel ── */}
                    {computedMetrics && metricExpanded && (
                        <div className="hmc-results-v2 animate-slide-up">
                            {/* BMI Big Display */}
                            <div className="hmc-bmi-display">
                                <div className="hmc-bmi-circle" style={{ borderColor: computedMetrics.bmiColor }}>
                                    <span className="hmc-bmi-value">{computedMetrics.bmi}</span>
                                    <span className="hmc-bmi-label">BMI</span>
                                </div>
                                <div className="hmc-bmi-info">
                                    <span className="hmc-bmi-badge" style={{ background: computedMetrics.bmiColor }}>
                                        {computedMetrics.bmiEmoji} {computedMetrics.bmiCategory}
                                    </span>
                                    <span className="hmc-bmi-height">📏 {computedMetrics.heightDisplay}</span>
                                </div>
                            </div>

                            {/* BMI Visual Scale */}
                            <BmiScaleBar bmi={computedMetrics.bmi} position={computedMetrics.bmiScalePos} color={computedMetrics.bmiColor} />

                            {/* Stats Grid */}
                            <div className="hmc-stats-grid">
                                <div className="hmc-stat-item">
                                    <span className="hmc-stat-icon">⚖️</span>
                                    <span className="hmc-stat-val">{computedMetrics.idealWeight}</span>
                                    <span className="hmc-stat-lbl">Ideal Weight</span>
                                </div>
                                <div className="hmc-stat-item">
                                    <span className="hmc-stat-icon">🔥</span>
                                    <span className="hmc-stat-val">{computedMetrics.bmr}</span>
                                    <span className="hmc-stat-lbl">BMR (kcal)</span>
                                </div>
                                <div className="hmc-stat-item">
                                    <span className="hmc-stat-icon">⚡</span>
                                    <span className="hmc-stat-val">{computedMetrics.dailyCalories}</span>
                                    <span className="hmc-stat-lbl">Daily Cal</span>
                                </div>
                                <div className="hmc-stat-item">
                                    <span className="hmc-stat-icon">📊</span>
                                    <span className="hmc-stat-val">{computedMetrics.bodyFat}</span>
                                    <span className="hmc-stat-lbl">Body Fat</span>
                                </div>
                                <div className="hmc-stat-item">
                                    <span className="hmc-stat-icon">💧</span>
                                    <span className="hmc-stat-val">{computedMetrics.water}</span>
                                    <span className="hmc-stat-lbl">Water</span>
                                </div>
                                <div className="hmc-stat-item">
                                    <span className="hmc-stat-icon">{computedMetrics.weightDeviation > 0 ? '📈' : computedMetrics.weightDeviation < 0 ? '📉' : '✅'}</span>
                                    <span className="hmc-stat-val" style={{ color: Math.abs(computedMetrics.weightDeviation) < 3 ? '#66BB6A' : '#FFA726' }}>
                                        {computedMetrics.weightDeviation > 0 ? '+' : ''}{computedMetrics.weightDeviation}kg
                                    </span>
                                    <span className="hmc-stat-lbl">From Ideal</span>
                                </div>
                            </div>

                            {/* Macros Breakdown */}
                            <div className="hmc-macros-section">
                                <h4 className="hmc-sub-title">🍽️ Daily Macros</h4>
                                <div className="hmc-macros-bar">
                                    <div className="hmc-macro-seg protein" style={{ flex: computedMetrics.proteinG }}>
                                        <span>P</span>
                                    </div>
                                    <div className="hmc-macro-seg carbs" style={{ flex: computedMetrics.carbG - computedMetrics.fiberG }}>
                                        <span>C</span>
                                    </div>
                                    <div className="hmc-macro-seg fats" style={{ flex: computedMetrics.fatG }}>
                                        <span>F</span>
                                    </div>
                                    <div className="hmc-macro-seg fiber" style={{ flex: computedMetrics.fiberG }}>
                                        <span>Fb</span>
                                    </div>
                                </div>
                                <div className="hmc-macros-grid">
                                    <div className="hmc-macro-item">
                                        <div className="hmc-macro-dot protein"></div>
                                        <div>
                                            <span className="hmc-macro-name">Protein</span>
                                            <span className="hmc-macro-val">{computedMetrics.protein}</span>
                                        </div>
                                    </div>
                                    <div className="hmc-macro-item">
                                        <div className="hmc-macro-dot carbs"></div>
                                        <div>
                                            <span className="hmc-macro-name">Carbs</span>
                                            <span className="hmc-macro-val">{computedMetrics.carbs}</span>
                                        </div>
                                    </div>
                                    <div className="hmc-macro-item">
                                        <div className="hmc-macro-dot fats"></div>
                                        <div>
                                            <span className="hmc-macro-name">Fats</span>
                                            <span className="hmc-macro-val">{computedMetrics.fats}</span>
                                        </div>
                                    </div>
                                    <div className="hmc-macro-item">
                                        <div className="hmc-macro-dot fiber"></div>
                                        <div>
                                            <span className="hmc-macro-name">Fiber</span>
                                            <span className="hmc-macro-val">{computedMetrics.fiberG}g</span>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Vitamins */}
                            <div className="hmc-vitamins-footer">
                                <span className="hmc-stat-icon">💊</span>
                                <div>
                                    <span className="hmc-vit-title">Recommended Vitamins</span>
                                    <span className="hmc-vit-list">{computedMetrics.vitamins}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Services ── */}
            <div className="services-section">
                <h2 className="section-title">What do you need?</h2>
                <div className="services-grid-v2">
                    <div className="svc-card-v2" onClick={() => navigateTo('reports')}>
                        <div className="svc-icon-wrap blue"><MedicalReportIcon /></div>
                        <span>Reports</span>
                    </div>
                    <div className="svc-card-v2" onClick={() => navigateTo('bills')}>
                        <div className="svc-icon-wrap green"><BillsIcon /></div>
                        <span>Bills</span>
                    </div>
                    <div className="svc-card-v2" onClick={() => navigateTo('pharmacy')}>
                        <div className="svc-icon-wrap teal"><PharmacyIcon /></div>
                        <span>Pharmacy</span>
                    </div>
                    <div className="svc-card-v2" onClick={() => navigateTo('insurance')}>
                        <div className="svc-icon-wrap orange"><InsuranceIcon /></div>
                        <span>Insurance</span>
                    </div>
                    <div className="svc-card-v2" onClick={() => navigateTo('health-research')}>
                        <div className="svc-icon-wrap red"><ResearchIcon /></div>
                        <span>Research</span>
                    </div>
                </div>
            </div>

            {/* ── Health Tips ── */}
            <div className="health-tips-section">
                <div className="health-tips-container">
                    <span className="health-tip-header">General Health Tips!!!</span>
                    <div className="health-tip-card glass-card">
                        <div className={`health-tip-content ${isAnimating ? 'fade-out' : 'fade-in'}`}>
                            <span className="health-tip-emoji">{healthTips[currentTipIndex].icon}</span>
                            <p className="health-tip-text">{healthTips[currentTipIndex].text}</p>
                        </div>
                        <div className="health-tip-indicators">
                            {healthTips.map((_, index) => (
                                <span key={index}
                                    className={`indicator-dot ${index === currentTipIndex ? 'active' : ''}`}
                                    onClick={() => { setIsAnimating(true); setTimeout(() => { setCurrentTipIndex(index); setIsAnimating(false); }, 300); }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
