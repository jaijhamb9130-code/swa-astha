// ============================================
// SIGN UP SCREEN - Connected to Backend
// Saves user data to AppContext on registration
// ============================================

window.SignUpScreen = () => {
    const { useState } = React;
    const { navigateTo, login, showNotification } = window.useApp();
    const Icons = window.Icons;
    const InputField = window.InputField;
    const AppLogo = window.AppLogo;

    const BASE_URL = "/api/auth";

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        phone: '',
        phoneOtp: ''
    });

    const [phoneOtpSent, setPhoneOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    const handleChange = (field) => (e) => {
        let value = e.target.value;
        if (field === 'name') value = value.replace(/[^a-zA-Z\s]/g, '');
        if (['phone', 'phoneOtp'].includes(field)) value = value.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, [field]: value }));
        if (authError) setAuthError('');
    };

    // SEND OTP
    const getOTP = async () => {
        if (formData.phone.length !== 10) {
            showNotification("Enter valid 10-digit phone number");
            return;
        }

        setAuthError('');
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: formData.phone, requireAccount: false })
            });

            const data = await response.json();

            if (!response.ok) {
                showNotification(data.message);
                return;
            }

            setPhoneOtpSent(true);
            // Auto-fill OTP from backend response for seamless testing
            if (data.otp) {
                setFormData(prev => ({ ...prev, phoneOtp: data.otp }));
                showNotification(`Your OTP is: ${data.otp}`);
            } else {
                showNotification(data.message);
            }

        } catch (error) {
            showNotification("Failed to send OTP. Is the server running?");
        } finally {
            setLoading(false);
        }
    };

    // REGISTER
    const handleSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');

        if (!formData.name || !formData.age || !formData.phone || !formData.phoneOtp) {
            showNotification("Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    age: formData.age,
                    phone: formData.phone,
                    otp: formData.phoneOtp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.message && data.message.includes("already registered")) {
                    setAuthError("User or account already exists, please sign in");
                } else {
                    showNotification(data.message);
                }
                return;
            }

            // Store token
            localStorage.setItem("token", data.token);

            // Save user data to AppContext + localStorage
            if (data.user) {
                login(data.user);
            }

            showNotification("Account created successfully!");
            setTimeout(() => navigateTo('home'), 600);

        } catch (error) {
            showNotification("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const ages = Array.from({ length: 83 }, (_, i) => i + 18);

    return (
        <div className="screen auth-screen active">
            <div className="auth-bg-image"></div>
            <div className="auth-card glass-card auth-card-enter">
                <div className="auth-logo-container">
                    <AppLogo size={65} className="auth-logo" />
                </div>
                <h1 className="auth-title">Sign up</h1>
                {authError && <p style={{ color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center', marginBottom: '15px', fontWeight: 'bold' }}>{authError}</p>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <InputField icon={Icons.User} placeholder="Enter your name" value={formData.name} onChange={handleChange('name')} />
                    <InputField icon={Icons.Calendar} placeholder="Enter your age" value={formData.age} onChange={handleChange('age')} isSelect options={ages} />

                    <InputField
                        icon={Icons.Phone}
                        placeholder="Phone no."
                        value={formData.phone}
                        onChange={handleChange('phone')}
                        maxLength={10}
                        action={phoneOtpSent ? "Resend Otp" : "Get Otp"}
                        onAction={getOTP}
                    />

                    {phoneOtpSent && (
                        <div className="animate-slide-up">
                            <InputField
                                icon={Icons.Lock}
                                placeholder="Enter otp"
                                value={formData.phoneOtp}
                                onChange={handleChange('phoneOtp')}
                                maxLength={6}
                            />
                        </div>
                    )}

                    <button type="submit" className="btn-auth" disabled={loading}>
                        {loading ? 'Creating account...' : 'Sign up'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{" "}
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('signin'); }}>
                        Sign in
                    </a>
                </p>
            </div>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '10px' }}>
                Are you a Doctor?{' '}
                <a href="#" style={{ color: '#008080', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); navigateTo('doctor-signup'); }}>Sign up here</a>
            </p>
        </div>
    );
};
