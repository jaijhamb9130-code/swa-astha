// ============================================
// BOTTOM NAVIGATION COMPONENT
// Fixed bottom navigation with FAB button
// ============================================

window.BottomNav = ({ activeTab }) => {
    const { navigateTo, showNotification } = window.useApp();
    const Icons = window.Icons;

    const navItems = [
        { id: 'home', icon: Icons.Home, label: 'Home', screen: 'home' },
        { id: 'reports', icon: Icons.File, label: 'Reports', screen: 'reports' },
        { id: 'pharmacy', icon: Icons.Pill, label: 'Pharmacy', screen: 'pharmacy' },
        { id: 'bills', icon: Icons.File, label: 'Bills', screen: 'bills' },
        { id: 'insurance', icon: Icons.Shield, label: 'Insurance', screen: 'insurance' },
        { id: 'profile', icon: Icons.User, label: 'Profile', screen: 'profile' },
    ];

    return (
        <nav className="bottom-nav">
            {navItems.map(item => {
                const Icon = item.icon;
                return (
                    <div
                        key={item.id}
                        className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => item.screen ? navigateTo(item.screen) : item.action?.()}
                    >
                        <Icon />
                        <span>{item.label}</span>
                    </div>
                );
            })}
        </nav>
    );
};
