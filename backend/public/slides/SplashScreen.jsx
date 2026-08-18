// ============================================
// SPLASH SCREEN - Landing Page
// First screen users see with brand intro
// ============================================

window.SplashScreen = () => {
    const { navigateTo } = window.useApp();
    const AppLogo = window.AppLogo;

    return (
        <div className="screen splash-screen active animate-fade-in">
            <div className="splash-illustration animate-float">
                {/* ...existing SVG illustration code... */}
                <svg viewBox="0 0 320 280" fill="none">
                    <rect x="100" y="60" width="120" height="150" rx="8" fill="#fff" stroke="#1F4E6D" strokeWidth="2" />
                    <rect x="130" y="45" width="60" height="25" rx="4" fill="#1F4E6D" />
                    <circle cx="160" cy="57" r="5" fill="#fff" />
                    <rect x="185" y="70" width="40" height="40" rx="8" fill="#2FA4A9" />
                    <path d="M205 80 L205 100 M195 90 L215 90" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                    <path d="M115 140 L135 140 L145 120 L155 160 L165 130 L175 140 L205 140" stroke="#1F4E6D" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="125" cy="170" r="6" fill="none" stroke="#2FA4A9" strokeWidth="2" />
                    <path d="M122 170 L124 173 L129 167" stroke="#2FA4A9" strokeWidth="1.5" fill="none" />
                    <line x1="140" y1="170" x2="195" y2="170" stroke="#ccc" strokeWidth="2" />
                    <circle cx="125" cy="190" r="6" fill="none" stroke="#9AA0A6" strokeWidth="2" />
                    <line x1="140" y1="190" x2="195" y2="190" stroke="#ccc" strokeWidth="2" />
                    <circle cx="250" cy="130" r="25" fill="none" stroke="#1F4E6D" strokeWidth="2.5" />
                    <line x1="268" y1="148" x2="285" y2="165" stroke="#1F4E6D" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="250" cy="130" r="15" fill="none" stroke="#BFD6E2" strokeWidth="1.5" />
                    <circle cx="70" cy="160" r="20" fill="none" stroke="#2FA4A9" strokeWidth="2" />
                    <path d="M60 160 L68 168 L82 152" stroke="#2FA4A9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="55" y="100" width="12" height="12" rx="2" fill="none" stroke="#BFD6E2" strokeWidth="1.5" transform="rotate(45 61 106)" />
                    <circle cx="270" cy="80" r="8" fill="none" stroke="#BFD6E2" strokeWidth="1.5" />
                    <rect x="190" y="175" width="50" height="10" rx="2" fill="#dc6b6b" transform="rotate(-30 215 180)" />
                    <polygon points="238,198 248,205 243,208" fill="#1F4E6D" />
                </svg>
            </div>
            <div className="splash-content animate-slide-up">
                <div className="splash-logo-container">
                    <AppLogo size={80} className="splash-logo" />
                </div>
                <h1 className="splash-title">Swa-Astha</h1>
                <button className="btn-get-started" onClick={() => navigateTo('signup')}>
                    Get Started
                </button>
            </div>
        </div>
    );
};
