// ============================================
// DOCTOR SIGN UP SCREEN — Name + Phone + OTP
// After signup → auto-login → Dashboard
// ============================================

window.DoctorSignUpScreen = () => {
    const { useState } = React;
    const { navigateTo, showNotification } = window.useApp();
    const Icons = window.Icons;
    const InputField = window.InputField;
    const AppLogo = window.AppLogo;

    const BASE_URL = "/api/doctor";

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const getOTP = async () => {
        if (!name.trim()) { showNotification('Please enter your full name first'); return; }
        if (!phone || phone.length !== 10) { showNotification('Enter a valid 10-digit mobile number'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();
            if (!res.ok) { showNotification(data.message || 'Failed to send OTP'); return; }
            setOtpSent(true);
            if (data.otp) {
                setOtp(data.otp);
                showNotification(`Your OTP is: ${data.otp}. Click Sign Up.`);
            } else {
                showNotification(data.message || 'OTP sent!');
            }
        } catch (err) {
            showNotification('Failed to send OTP. Is the server running?');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) { showNotification('Please enter your full name'); return; }
        if (!phone || phone.length !== 10) { showNotification('Enter a valid 10-digit mobile number'); return; }
        if (!otp) { showNotification('Please enter the OTP'); return; }

        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim(),
                    otp: otp.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.message && data.message.includes('already registered')) {
                    showNotification('Account already exists. Please sign in.');
                } else {
                    showNotification(data.message || 'Registration failed');
                }
                return;
            }
            // Auto-login: save token + doctor data
            localStorage.setItem('doctor_token', data.token);
            localStorage.setItem('swa_doctor', JSON.stringify(data.doctor));
            showNotification('Account created! Welcome to your dashboard.');
            setTimeout(() => navigateTo('doctor-dashboard'), 600);
        } catch (err) {
            showNotification('Server error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="screen auth-screen active">
            <div className="auth-bg-image doctor-bg-image"></div>
            <div className="auth-card glass-card auth-card-enter">
                <div className="auth-logo-container doctor-logo-ring">
                    <AppLogo size={65} className="auth-logo" />
                </div>

                <div className="doctor-panel-badge animate-fade-in">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Doctor Registration
                </div>

                <h1 className="auth-title">Create Account</h1>
                <p className="auth-subtitle">Sign up to get started as a doctor</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <InputField
                        icon={Icons.User}
                        placeholder="Dr. Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s.]/g, ''))}
                    />
                    <InputField
                        icon={Icons.Phone}
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setOtpSent(false); setOtp(''); }}
                        maxLength={10}
                        action={otpSent ? "Resend Otp" : "Get Otp"}
                        onAction={getOTP}
                    />
                    {otpSent && (
                        <div className="animate-slide-up">
                            <InputField
                                icon={Icons.Lock}
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                maxLength={6}
                            />
                        </div>
                    )}
                    <button type="submit" className="btn-auth doctor-btn" disabled={loading || !otpSent}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    You can complete profile verification from your dashboard
                </p>

                <p className="auth-footer" style={{ marginTop: '20px' }}>
                    Already registered?{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('doctor-signin'); }}>Sign in</a>
                </p>
                <p className="auth-footer" style={{ marginTop: '8px' }}>
                    <a href="#" className="back-to-patient" onClick={(e) => { e.preventDefault(); navigateTo('signup'); }}>
                        ← Back to Patient Portal
                    </a>
                </p>
            </div>
        </div>
    );
};
