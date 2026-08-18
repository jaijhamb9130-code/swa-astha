// ============================================
// Swa-Astha LOGO - Final image-based logo
// ============================================

window.AppLogo = ({ size = 80, className = "" }) => (
    <img
        src="LOGO.jpeg"
        alt="Swa-Astha Logo"
        className={className}
        width={size}
        height={size}
        style={{ objectFit: 'cover' }}
    />
);
