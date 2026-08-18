// ============================================
// INSURANCE SCREEN - Insurance Policies
// Manage health insurance policies
// ============================================

window.InsuranceScreen = () => {
    const { navigateTo, showNotification } = window.useApp();
    const Icons = window.Icons;
    const BottomNav = window.BottomNav;

    const policies = [
        { id: 1, name: 'Family Health Plan', provider: 'HDFC Ergo', cover: '₹10 Lakh', expires: '15 Aug 2026', color: '#E3F2FD', icon: '🏠' },
        { id: 2, name: 'Critical Illness Cover', provider: 'ICICI Lombard', cover: '₹25 Lakh', expires: '1 Mar 2026', color: '#FFF3E0', icon: '🛡️' },
    ];

    return (
        <div className="screen ins-screen active">
            <div className="ins-header">
                <div className="btn-back" onClick={() => navigateTo('home')}><Icons.Back /></div>
                <h1>Insurance</h1>
            </div>
            <div className="ins-body animate-slide-up">
                <button className="ins-add-btn" onClick={() => showNotification('Add insurance feature coming soon!', 'info')}>
                    <Icons.Plus /> Add New Policy
                </button>
                {policies.map((policy, idx) => (
                    <div key={policy.id} className="ins-card" style={{ animationDelay: `${0.1 + idx * 0.08}s` }}>
                        <div className="ins-card-icon" style={{ background: policy.color }}>
                            <span>{policy.icon}</span>
                        </div>
                        <div className="ins-card-body">
                            <div className="ins-card-name">{policy.name}</div>
                            <div className="ins-card-meta">{policy.provider} · Expires: {policy.expires}</div>
                            <div className="ins-card-cover">Cover: {policy.cover}</div>
                        </div>
                        <button className="ins-card-btn" onClick={() => showNotification('Opening policy details...', 'info')}>View</button>
                    </div>
                ))}
            </div>
        </div>
    );
};
