// ============================================
// MY ORDERS SCREEN — patient sees all their orders across all pharmacies.
// Tap a card to expand and see line items.
// ============================================

window.MyOrdersScreen = () => {
    const { useState, useEffect } = React;
    const { navigateTo, showNotification } = window.useApp();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [openId, setOpenId] = useState(null);
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        (async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigateTo('signin'); return; }

            // 1) Backend orders (multi-pharmacy, persisted on the server)
            let backendOrders = [];
            try {
                const res = await fetch('/api/patient/orders', {
                    headers: { Authorization: 'Bearer ' + token }
                });
                const data = await res.json();
                if (data.success) backendOrders = data.orders || [];
                else setErrorMsg(data.message || 'Failed to load orders');
            } catch (e) {
                setErrorMsg('Network error. Is the backend running?');
            }

            // 2) Legacy local-only orders (placed before backend checkout was wired up).
            //    Merge them in so the user sees their full history without losing data.
            try {
                const raw = localStorage.getItem('swa_order_history') || '[]';
                const legacy = JSON.parse(raw);
                if (Array.isArray(legacy)) {
                    const adapted = legacy.map(o => ({
                        id: 'legacy_' + o.id,
                        orderId: o.id,
                        pharmacyName: (o.items && o.items[0] && o.items[0].pharmacyName) || 'Pharmacy',
                        totalAmount: o.total || o.subtotal || 0,
                        status: o.status === 'delivered' ? 'delivered' : (o.status || 'pending'),
                        paymentStatus: 'paid',
                        itemCount: (o.items || []).length,
                        createdAt: o.placedAt ? new Date(o.placedAt).toISOString() : new Date().toISOString(),
                        _legacy: true,
                        _localItems: o.items
                    }));
                    // De-dup by orderId so re-running checkout doesn't duplicate entries
                    const seen = new Set(backendOrders.map(b => b.orderId));
                    const merged = [...backendOrders, ...adapted.filter(a => !seen.has(a.orderId))];
                    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setOrders(merged);
                } else {
                    setOrders(backendOrders);
                }
            } catch (e) {
                setOrders(backendOrders);
            }
            setLoading(false);
        })();
    }, []);

    const toggle = async (order) => {
        const id = order.id;
        if (openId === id) { setOpenId(null); setDetail(null); return; }
        setOpenId(id); setDetail(null);

        // Legacy orders carry their items locally — no fetch needed
        if (order._legacy) {
            setDetail({
                items: order._localItems || [],
                totalAmount: order.totalAmount,
                paymentStatus: order.paymentStatus || 'paid'
            });
            return;
        }
        try {
            const res = await fetch('/api/patient/orders/' + id, {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
            });
            const data = await res.json();
            if (data.success) setDetail(data.order);
        } catch (e) {}
    };

    const statusColors = {
        pending:           { bg: '#fef3c7', fg: '#92400e' },
        accepted:          { bg: '#dbeafe', fg: '#1e40af' },
        preparing:         { bg: '#dbeafe', fg: '#1e40af' },
        out_for_delivery:  { bg: '#e0e7ff', fg: '#3730a3' },
        delivered:         { bg: '#d1fae5', fg: '#065f46' },
        cancelled:         { bg: '#fee2e2', fg: '#991b1b' }
    };

    const S = {
        page: { minHeight: '100vh', background: '#f6f7f9', paddingBottom: 100 },
        header: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 5 },
        back: { background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#0f766e' },
        title: { fontSize: 18, fontWeight: 700, margin: 0 },
        list: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
        empty: { background: '#fff', borderRadius: 12, padding: 28, textAlign: 'center', color: '#64748b', border: '1px solid #e5e7eb' },
        emptyIcon: { fontSize: 40, marginBottom: 8 },
        card: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb' },
        cardHead: { width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, cursor: 'pointer' },
        orderId: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
        meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
        statusBadge: (s) => ({ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: s.bg, color: s.fg, textTransform: 'uppercase', whiteSpace: 'nowrap' }),
        detail: { borderTop: '1px solid #e5e7eb', background: '#fafbfc', padding: 14, display: 'flex', flexDirection: 'column', gap: 6 },
        row: { display: 'flex', justifyContent: 'space-between', fontSize: 13 },
        total: { display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, paddingTop: 8, borderTop: '1px solid #e5e7eb', marginTop: 4 }
    };

    return (
        <div style={S.page}>
            <div style={S.header}>
                <button onClick={() => navigateTo('profile')} style={S.back}>←</button>
                <h2 style={S.title}>My Orders</h2>
            </div>

            <div style={S.list}>
                {loading && <p style={{ color: '#64748b', padding: 8 }}>Loading...</p>}

                {!loading && errorMsg && (
                    <div style={S.empty}>
                        <div style={S.emptyIcon}>⚠️</div>
                        <p>{errorMsg}</p>
                    </div>
                )}

                {!loading && !errorMsg && orders.length === 0 && (
                    <div style={S.empty}>
                        <div style={S.emptyIcon}>📦</div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>No orders yet</p>
                        <p style={{ fontSize: 12 }}>Your orders across all pharmacies will show up here.</p>
                    </div>
                )}

                {!loading && orders.map(o => {
                    const s = statusColors[o.status] || statusColors.pending;
                    const dt = new Date(o.createdAt);
                    return (
                        <div key={o.id} style={S.card}>
                            <button onClick={() => toggle(o)} style={S.cardHead}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={S.orderId}>Order {o.orderId}</div>
                                    <div style={S.meta}>
                                        {o.pharmacyName || '—'} · {o.itemCount} items · ₹{o.totalAmount}
                                    </div>
                                    <div style={{ ...S.meta, color: '#94a3b8' }}>
                                        {dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <span style={S.statusBadge(s)}>{o.status.replace(/_/g, ' ')}</span>
                            </button>

                            {openId === o.id && (
                                <div style={S.detail}>
                                    {!detail && <p style={{ fontSize: 12, color: '#64748b' }}>Loading items...</p>}
                                    {detail && (
                                        <React.Fragment>
                                            {(detail.items || []).map((it, i) => (
                                                <div key={i} style={S.row}>
                                                    <span>{it.name} × {it.quantity}</span>
                                                    <span style={{ fontWeight: 600 }}>₹{(it.price || 0) * (it.quantity || 1)}</span>
                                                </div>
                                            ))}
                                            <div style={S.total}>
                                                <span>Total</span>
                                                <span>₹{detail.totalAmount}</span>
                                            </div>
                                            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                                Payment: {detail.paymentStatus}
                                            </p>
                                        </React.Fragment>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
