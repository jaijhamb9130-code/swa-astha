// ============================================
// DOCTOR SIGN IN SCREEN
// Phone + OTP verification for doctors
// ============================================

window.DoctorSignInScreen = () => {
    const { useState } = React;
    const { navigateTo, showNotification } = window.useApp();
    const Icons = window.Icons;
    const InputField = window.InputField;
    const AppLogo = window.AppLogo;

    const BASE_URL = "/api/doctor";

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const getOTP = async () => {
        if (!phone || phone.length !== 10) {
            showNotification("Enter valid 10-digit phone number");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, requireAccount: true })
            });
            const data = await response.json();
            if (!response.ok) { showNotification(data.message); return; }
            setOtpSent(true);
            if (data.otp) {
                setOtp(data.otp);
                showNotification(`Your OTP is: ${data.otp}. Click Sign In.`);
            } else {
                showNotification(data.message);
            }
        } catch (error) {
            showNotification("Failed to send OTP. Is the server running?");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!phone || !otp) { showNotification("Enter phone and OTP"); return; }
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp })
            });
            const data = await response.json();
            if (!response.ok) { showNotification(data.message); return; }
            localStorage.setItem("doctor_token", data.token);
            localStorage.setItem("swa_doctor", JSON.stringify(data.doctor));
            showNotification("Welcome back, Doctor!");
            setTimeout(() => navigateTo('doctor-dashboard'), 600);
        } catch (error) {
            showNotification("Server error. Please try again.");
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
                    Doctor Sign In
                </div>

                <h1 className="auth-title">Doctor Sign In</h1>
                <p className="auth-subtitle">Sign in to your doctor portal</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <InputField
                        icon={Icons.Phone}
                        placeholder="Phone number"
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
                    <button type="submit" className="btn-auth doctor-btn" disabled={loading}>
                        {loading ? 'Please wait...' : 'Sign in'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account?{" "}
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('doctor-signup'); }}>Register</a>
                </p>
                <p className="auth-footer" style={{ marginTop: '12px' }}>
                    <a href="#" className="back-to-patient" onClick={(e) => { e.preventDefault(); navigateTo('signin'); }}>
                        ← Back to Patient Portal
                    </a>
                </p>
            </div>
        </div>
    );
};
