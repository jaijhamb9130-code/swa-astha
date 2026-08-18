// ============================================
// SIDE MENU COMPONENT (Connected to Backend)
// ============================================

window.SideMenu = ({ isOpen, onClose }) => {
    const { useState, useEffect } = React;
    const { navigateTo, theme, toggleTheme } = window.useApp();
    const Icons = window.Icons;

    const BASE_URL = "/api/auth";

    const [user, setUser] = useState(null);

    // Fetch profile when menu opens
    useEffect(() => {
        if (!isOpen) return;

        const fetchProfile = async () => {
            const token = localStorage.getItem("token");

            if (!token) return;

            try {
                const response = await fetch(`${BASE_URL}/profile`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    setUser(data);
                }

            } catch (error) {
                console.error("SideMenu profile error:", error);
            }
        };

        fetchProfile();
    }, [isOpen]);

    const menuItems = [
        { icon: Icons.Home, label: 'Home', screen: 'home' },
        { icon: Icons.File, label: 'Medical Reports', screen: 'reports' },
        { icon: Icons.Pill, label: 'Pharmacy', screen: 'pharmacy' },
        { icon: Icons.Card, label: 'Bills & Payments', screen: 'bills' },
        { icon: Icons.Shield, label: 'Insurance', screen: 'insurance' },
        { icon: Icons.Search, label: 'Health Research', screen: 'health-research' },
        { icon: Icons.User, label: 'My Profile', screen: 'profile' },
    ];

    const handleNavigation = (screen) => {
        navigateTo(screen);
        onClose();
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigateTo('signin');
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`menu-backdrop ${isOpen ? 'active' : ''}`}
                onClick={onClose}
            ></div>

            {/* Side Menu */}
            <div className={`side-menu ${isOpen ? 'open' : ''}`}>
                <div className="side-menu-header">
                    <div className="side-menu-user">
                        <div className="side-menu-avatar">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="side-menu-user-info">
                            <span className="side-menu-name">
                                {user ? user.name : "Loading..."}
                            </span>
                            <span className="side-menu-email">
                                Swa-Astha Member
                            </span>
                        </div>
                    </div>
                    <span className="side-menu-close" onClick={onClose}>
                        <Icons.Close />
                    </span>
                </div>

                <div className="side-menu-items">
                    {menuItems.map((item, index) => (
                        <div
                            key={index}
                            className="side-menu-item"
                            onClick={() => handleNavigation(item.screen)}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <span className="side-menu-icon">
                                <item.icon />
                            </span>
                            <span className="side-menu-label">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="side-menu-footer">
                    {/* Theme Toggle */}
                    <div className="side-menu-theme-toggle" onClick={toggleTheme}>
                        <span className="side-menu-icon">
                            {theme === 'dark' ? '🌙' : '☀️'}
                        </span>
                        <span className="side-menu-label">
                            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </span>
                        <div className={`theme-toggle-switch ${theme === 'dark' ? 'active' : ''}`}>
                            <div className="theme-toggle-knob"></div>
                        </div>
                    </div>

                    <div className="side-menu-item logout" onClick={handleLogout}>
                        <span className="side-menu-icon">
                            <Icons.Logout />
                        </span>
                        <span className="side-menu-label">
                            Sign Out
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};
