// ============================================
// NEARBY PHARMACIES SCREEN
// Pharmacy picker for a medicine pre-selected on the Pharmacy screen.
// Auto-searches on mount using sessionStorage; uses the app's teal theme.
// ============================================

console.log('[swa] NearbyPharmaciesScreen build 2026-05-25-build3 — dual-write cart sync active');

window.NearbyPharmaciesScreen = () => {
    const { useState, useEffect } = React;
    // Pull local addToCart + cart so we can show "✓ Added" state on buttons
    // for items already in the cart. We ALSO hit the backend /api/cart/add so
    // checkout splits correctly per pharmacy.
    const { navigateTo, showNotification, addToCart: localAddToCart, cart, updateQty } = window.useApp();

    const [medicine] = useState(() => sessionStorage.getItem('swa_find_medicine') || '');
    const [salt] = useState(() => sessionStorage.getItem('swa_find_salt') || '');
    const [coords, setCoords] = useState(null);
    const [coordsErr, setCoordsErr] = useState(null);
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(true);
    const [viewAll, setViewAll] = useState(false);

    const captureLocation = () => new Promise((resolve, reject) => {
        if (coords) return resolve(coords);
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported by this browser'));
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCoords(c); setCoordsErr(null); resolve(c);
            },
            (err) => {
                const msg = err.message || 'Please allow location access';
                setCoordsErr(msg); reject(new Error(msg));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    const runSearch = async (allFlag) => {
        if (!medicine) return;
        setSearching(true); setResults([]); setViewAll(!!allFlag);
        try {
            const c = await captureLocation();
            const limit = allFlag ? 50 : 5;
            const params = new URLSearchParams({
                medicine: medicine, lat: String(c.lat), lng: String(c.lng),
                radius: '5000', limit: String(limit)
            });
            if (salt) params.set('salt', salt);
            const res = await fetch('/api/pharmacy/find?' + params.toString());
            const data = await res.json();
            if (data.success) setResults(data.results || []);
            else showNotification(data.message || 'No results', 'info');
        } catch (e) {
            showNotification(e.message || 'Search failed', 'error');
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (!medicine) {
            // No medicine context — send the user back to pharmacy
            navigateTo('pharmacy');
            return;
        }
        runSearch(false);
        return () => {
            sessionStorage.removeItem('swa_find_medicine');
            sessionStorage.removeItem('swa_find_salt');
        };
        // eslint-disable-next-line
    }, []);

    // Adds a single batch (one medicine sold by one pharmacy) to BOTH the
    // local cart (so CartBar/CartScreen render immediately) AND the backend
    // cart (so checkout splits correctly per pharmacy).
    const addToCart = async (result) => {
        const token = localStorage.getItem('token');
        if (!token) { navigateTo('signin'); return; }
        const m = result.medicine;
        const p = result.pharmacy;
        try {
            const res = await fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ batchId: m.batchId, quantity: 1 })
            });
            const data = await res.json();
            if (!data.success) {
                showNotification(data.message || 'Failed to add', 'error');
                return;
            }
            // Sync to local cart so the existing CartBar / CartScreen update.
            // We craft a medicine object compatible with AppContext.addToCart.
            try {
                localAddToCart(
                    {
                        name: m.brandName + ' (' + p.name + ')',  // disambiguates same brand across pharmacies
                        use: m.salt || m.strength || 'Medicine',
                        price: '₹ ' + m.price,
                        dose: m.strength || '',
                        salt: m.salt,
                        strength: m.strength,
                        manufacturer: m.manufacturer,
                        type: 'Tablet',
                        icon: '💊',
                        // Carry pharmacy + batch context on the item
                        pharmacy: p.id,
                        pharmacyName: p.name,
                        batchId: m.batchId
                    },
                    { icon: '💊', color: '#008080', bg: '#E0F2F1', name: 'Pharmacy' }
                );
            } catch (e) { /* local add failed — backend has it anyway */ }
            // Local addToCart fires its own notification, so we skip our own to avoid double toasts.
        } catch (e) {
            showNotification('Network error', 'error');
        }
    };

    const mapsHref = (c) => c && typeof c.lat === 'number' && typeof c.lng === 'number'
        ? 'https://www.google.com/maps?q=' + c.lat + ',' + c.lng
        : null;

    return (
        <div className="screen pharmacy-screen active">
            {/* Teal gradient header that matches the rest of the app */}
            <div className="ph-hdr" style={{ background: 'linear-gradient(135deg, #008080, #00BFA5)' }}>
                <div className="btn-back" onClick={() => navigateTo('pharmacy')}>
                    <window.Icons.Back />
                </div>
                <h1 style={{ color: '#fff' }}>📍 Nearby Pharmacies</h1>
                <div style={{ width: 36 }}></div>
            </div>

            <div className="ph-body" style={{ background: '#f4f7f7', minHeight: '100vh', padding: 16, paddingBottom: 100 }}>
                {/* Medicine context banner */}
                <div style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: '14px 16px',
                    boxShadow: '0 2px 8px rgba(0,128,128,0.08)',
                    border: '1px solid #d1f0ee',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, #E0F2F1, #B2DFDB)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0
                    }}>💊</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                            Showing pharmacies for
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {medicine}
                        </div>
                        {salt && (
                            <div style={{ fontSize: 12, color: '#008080', fontWeight: 600, marginTop: 2 }}>
                                🧪 {salt}
                            </div>
                        )}
                    </div>
                    <div style={{ fontSize: 11, color: coords ? '#16a34a' : coordsErr ? '#dc2626' : '#888', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {coords ? '📍 Located' : coordsErr ? '⚠️ Location' : '⏳ Locating...'}
                    </div>
                </div>

                {searching && (
                    <div style={{
                        background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                        <p style={{ color: '#008080', fontWeight: 600, fontSize: 14 }}>Searching nearby pharmacies...</p>
                    </div>
                )}

                {!searching && results.length === 0 && (
                    <div style={{
                        background: '#fff', borderRadius: 14, padding: '36px 24px', textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                            No verified pharmacies stock this within 5 km
                        </p>
                        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                            We could not find any partner pharmacy near you that has <b>{medicine}</b> in stock.
                        </p>
                        <button
                            onClick={() => navigateTo('pharmacy')}
                            style={{
                                marginTop: 18, padding: '10px 22px', borderRadius: 10,
                                border: 'none', background: 'linear-gradient(135deg, #008080, #00BFA5)',
                                color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,128,128,0.25)'
                            }}>
                            ← Try Another Medicine
                        </button>
                    </div>
                )}

                {!searching && results.map((r) => {
                    const m = r.medicine;
                    const p = r.pharmacy;
                    const km = (p.distanceMeters / 1000).toFixed(2);
                    const addr = [p.address?.street, p.address?.city, p.address?.pincode].filter(Boolean).join(', ');
                    const maps = mapsHref(p.coords);
                    return (
                        <div key={m.batchId} style={{
                            background: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden',
                            boxShadow: '0 2px 10px rgba(0,128,128,0.08)',
                            border: '1px solid #e0f2f1'
                        }}>
                            {/* Top: pharmacy + price */}
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                            <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{p.name}</span>
                                            <span style={{
                                                fontSize: 9, fontWeight: 700, color: '#fff',
                                                background: '#16a34a', padding: '2px 6px', borderRadius: 4
                                            }}>VERIFIED</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{addr || '—'}</div>
                                        {p.phone && (
                                            <a href={'tel:' + p.phone}
                                               onClick={(e) => e.stopPropagation()}
                                               style={{
                                                   display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                                                   color: '#0f766e', fontSize: 12, fontWeight: 600, textDecoration: 'none'
                                               }}>
                                                📞 {p.phone}
                                            </a>
                                        )}
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            marginTop: 6, padding: '3px 10px', borderRadius: 999,
                                            background: '#E0F2F1', color: '#00695C', fontSize: 11, fontWeight: 700
                                        }}>
                                            📍 {km} km away
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: '#008080', lineHeight: 1 }}>₹{m.price}</div>
                                        {m.mrp && m.mrp > m.price && (
                                            <div style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through', marginTop: 4 }}>MRP ₹{m.mrp}</div>
                                        )}
                                    </div>
                                </div>
                                {/* Medicine info chips */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                    <span style={{ padding: '3px 10px', background: '#E8EAF6', borderRadius: 6, fontSize: 11, color: '#283593', fontWeight: 600 }}>
                                        {m.brandName}
                                    </span>
                                    {m.strength && (
                                        <span style={{ padding: '3px 10px', background: '#FFF3E0', borderRadius: 6, fontSize: 11, color: '#E65100', fontWeight: 600 }}>
                                            💪 {m.strength}
                                        </span>
                                    )}
                                    {m.manufacturer && (
                                        <span style={{ padding: '3px 10px', background: '#F3E5F5', borderRadius: 6, fontSize: 11, color: '#6A1B9A', fontWeight: 600 }}>
                                            🏭 {m.manufacturer}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Bottom: actions. If this batch is already in cart, show
                                "✓ Added" + qty controls instead of the Add button. */}
                            {(() => {
                                const inCartItem = (cart || []).find(it => it.batchId === m.batchId);
                                return (
                                    <div style={{ display: 'flex', gap: 0 }}>
                                        {maps && (
                                            <a href={maps} target="_blank" rel="noopener noreferrer"
                                                style={{
                                                    flex: 1, padding: '12px', textAlign: 'center', textDecoration: 'none',
                                                    color: '#0f172a', fontWeight: 700, fontSize: 13,
                                                    borderRight: '1px solid #f1f5f9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                                }}>
                                                🗺️ Open in Maps
                                            </a>
                                        )}
                                        {inCartItem ? (
                                            <div style={{
                                                flex: 1, padding: '8px 12px',
                                                background: '#0d9488',
                                                color: '#fff', fontWeight: 700, fontSize: 13,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                            }}>
                                                <button onClick={() => updateQty(inCartItem.name, -1)}
                                                    disabled={inCartItem.qty <= 1}
                                                    style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: inCartItem.qty <= 1 ? 'not-allowed' : 'pointer', opacity: inCartItem.qty <= 1 ? 0.5 : 1 }}>
                                                    −
                                                </button>
                                                <span style={{ minWidth: 60, textAlign: 'center', fontSize: 13 }}>
                                                    ✓ {inCartItem.qty} in cart
                                                </span>
                                                <button onClick={() => updateQty(inCartItem.name, 1)}
                                                    style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(r)}
                                                style={{
                                                    flex: 1, padding: '12px', border: 'none',
                                                    background: 'linear-gradient(135deg, #008080, #00BFA5)',
                                                    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                                }}>
                                                🛒 Add to Cart
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}

                {!searching && results.length > 0 && !viewAll && results.length >= 5 && (
                    <button
                        onClick={() => runSearch(true)}
                        style={{
                            width: '100%', marginTop: 8, padding: '14px',
                            borderRadius: 12, border: '2px dashed #00BFA5',
                            background: '#fff', color: '#008080',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer'
                        }}>
                        View all pharmacies within 5 km ↓
                    </button>
                )}
            </div>
        </div>
    );
};
