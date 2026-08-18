// ============================================
// SIGN IN SCREEN - Connected to Backend
// Rejects unknown numbers, saves user to AppContext
// ============================================

window.SignInScreen = () => {
    const { useState } = React;
    const { navigateTo, login, showNotification } = window.useApp();
    const Icons = window.Icons;
    const InputField = window.InputField;
    const AppLogo = window.AppLogo;

    const BASE_URL = "/api/auth";

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);

    // SEND OTP
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

            if (!response.ok) {
                showNotification(data.message);
                return;
            }

            setOtpSent(true);
            // Auto-fill OTP from backend response for seamless testing
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

    // LOGIN
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!phone || !otp) {
            showNotification("Enter phone and OTP");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp })
            });

            const data = await response.json();

            if (!response.ok) {
                showNotification(data.message);
                return;
            }

            // Store token
            localStorage.setItem("token", data.token);

            // Save user data to AppContext + localStorage
            if (data.user) {
                login(data.user);
            }

            showNotification("Login successful!");
            setTimeout(() => navigateTo('home'), 600);

        } catch (error) {
            showNotification("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="screen auth-screen active">
            <div className="auth-bg-image"></div>
            <div className="auth-card glass-card auth-card-enter">
                <div className="auth-logo-container">
                    <AppLogo size={65} className="auth-logo" />
                </div>
                <h1 className="auth-title">WELCOME</h1>
                <p className="auth-subtitle">Sign in to continue</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <InputField
                        icon={Icons.Phone}
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) => {
                            setPhone(e.target.value.replace(/\D/g, ''));
                            setOtpSent(false);
                            setOtp('');
                        }}
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

                    <button type="submit" className="btn-auth" disabled={loading}>
                        {loading ? 'Please wait...' : 'Sign in'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account yet?{" "}
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('signup'); }}>
                        Sign Up
                    </a>
                </p>
            </div>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '10px' }}>
                Are you a Doctor?{' '}
                <a href="#" style={{ color: '#008080', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); navigateTo('doctor-signin'); }}>Sign in here</a>
            </p>
        </div>
    );
};
