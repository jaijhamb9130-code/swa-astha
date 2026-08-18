// ============================================
// APP CONTEXT - Global State Management
// Provides navigation, user, notification, and theme state
// ============================================

const { useState, useEffect, createContext, useContext, useRef } = React;

const AppContext = createContext();

window.AppProvider = ({ children }) => {
    const [currentScreen, setCurrentScreen] = useState('splash');
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('swaasth_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [notification, setNotification] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // ── Cart State (Global for reliable positioning) ──
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('swa_pharmacy_cart');
        return saved ? JSON.parse(saved) : [];
    });
    const [cartOpen, setCartOpen] = useState(false);
    const [address, setAddress] = useState(() => localStorage.getItem('swa_delivery_address') || '');

    // ── Order History State ──
    const ORDER_STATUSES = ['confirmed', 'collecting', 'packing', 'dispatched', 'delivered'];
    const ORDER_STATUS_LABELS = {
        confirmed: 'Confirmed',
        collecting: 'Collecting',
        packing: 'Packing',
        dispatched: 'Dispatched',
        delivered: 'Delivered'
    };
    const ORDER_STATUS_ICONS = {
        confirmed: '✅',
        collecting: '💊',
        packing: '📦',
        dispatched: '🚀',
        delivered: '✔️'
    };
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('swa_order_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);

    // ── Health History (Central record of all uploads, scans, bills, prescriptions) ──
    const [healthHistory, setHealthHistory] = useState(() => {
        const saved = localStorage.getItem('swa_health_history');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('swa_health_history', JSON.stringify(healthHistory));
        // Also continuously save per-user backup so data survives logout/login
        const storedUser = localStorage.getItem('swaasth_user');
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                if (u.phone) localStorage.setItem(`swa_health_history_${u.phone}`, JSON.stringify(healthHistory));
            } catch(e) {}
        }
    }, [healthHistory]);

    /**
     * Add an item to the global health history.
     * @param {object} record - { title, category, type, source, date, meta }
     *   category: 'report' | 'prescription' | 'bill' | 'scan' | 'order'
     *   source: 'reports' | 'pharmacy' | 'bills' | 'profile'
     */
    const addHealthRecord = (record) => {
        const entry = {
            id: Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
            timestamp: Date.now(),
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...record
        };
        setHealthHistory(prev => [entry, ...prev].slice(0, 200));
        return entry;
    };

    // Helper to set modal state and manage body overflow
    const setModalActive = (active) => {
        setIsModalOpen(active);
        if (active) {
            document.body.classList.add('modal-open');
        } else if (!cartOpen) { // Only remove if cart isn't also open
            document.body.classList.remove('modal-open');
        }
    };

    useEffect(() => {
        if (cartOpen || isModalOpen) {
            document.body.classList.add('nav-hidden');
        } else {
            document.body.classList.remove('nav-hidden');
        }
    }, [cartOpen, isModalOpen]);

    useEffect(() => {
        localStorage.setItem('swa_pharmacy_cart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        if (address) localStorage.setItem('swa_delivery_address', address);
    }, [address]);

    useEffect(() => {
        localStorage.setItem('swa_order_history', JSON.stringify(orders));
    }, [orders]);

    // Auto-advance order statuses over time for simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setOrders(prev => {
                let changed = false;
                const updated = prev.map(order => {
                    if (order.status === 'delivered') return order;
                    const elapsed = Date.now() - order.placedAt;
                    const idx = ORDER_STATUSES.indexOf(order.status);
                    // Advance every 30 seconds for demo
                    const expectedIdx = Math.min(Math.floor(elapsed / 30000), ORDER_STATUSES.length - 1);
                    if (expectedIdx > idx) {
                        changed = true;
                        return { ...order, status: ORDER_STATUSES[expectedIdx] };
                    }
                    return order;
                });
                return changed ? updated : prev;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const addToCart = (medicine, category) => {
        // numPrice can be derived from a string "₹ 30" OR a number direct on medicine.numPrice
        const priceNum = typeof medicine.numPrice === 'number'
            ? medicine.numPrice
            : (parseInt(String(medicine.price || '').replace(/[^0-9]/g, '')) || 0);

        // With multi-pharmacy we de-dupe by (name + pharmacy), so the same medicine
        // bought from two different pharmacies appears as two separate cart lines.
        const dedupKey = (medicine.pharmacy || '') + '|' + (medicine.name || '');
        const itemKey = (it) => (it.pharmacy || '') + '|' + (it.name || '');

        setCart(prev => {
            const existing = prev.find(i => itemKey(i) === dedupKey);
            if (existing) {
                return prev.map(i => itemKey(i) === dedupKey ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, {
                name: medicine.name,
                use: medicine.use,
                price: medicine.price,
                numPrice: priceNum,
                dose: medicine.dose,
                category: category,
                qty: 1,
                // Pharmacy context — carried so CartScreen / checkout know which shop fulfils this line
                pharmacy: medicine.pharmacy || null,
                pharmacyName: medicine.pharmacyName || null,
                batchId: medicine.batchId || null,
                distanceKm: medicine.distanceKm || null,
                mapsHref: medicine.mapsHref || null,
                salt: medicine.salt,
                strength: medicine.strength,
                manufacturer: medicine.manufacturer,
                icon: medicine.icon
            }];
        });
        showNotification(`${medicine.name} added to cart`, 'success');
    };

    const updateQty = (id, delta) => {
        setCart(prev => {
            const item = prev.find(i => i.name === id);
            if (!item) return prev;
            
            const newQty = item.qty + delta;
            if (newQty <= 0) {
                return prev.filter(i => i.name !== id);
            }
            
            return prev.map(i => i.name === id ? { ...i, qty: newQty } : i);
        });
    };

    const removeItem = (id) => {
        setCart(prev => prev.filter(item => item.name !== id));
    };

    const clearCart = () => {
        setCart([]);
    };

    const placeOrder = (currentAddress) => {
        if (!currentAddress || !currentAddress.trim()) {
            showNotification('Please enter delivery address', 'error');
            return false;
        }

        // Save order to LOCAL history (keeps the Pharmacy → My Orders flow alive)
        const subtotal = cart.reduce((sum, item) => sum + (item.numPrice * item.qty), 0);
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        const deliveryFee = subtotal > 500 || totalItems === 0 ? 0 : 40;

        const newOrder = {
            id: 'SWA-' + Date.now().toString(36).toUpperCase(),
            items: [...cart],
            address: currentAddress,
            subtotal,
            deliveryFee,
            total: subtotal + deliveryFee,
            totalItems,
            status: 'confirmed',
            placedAt: Date.now(),
            estimatedDelivery: '30-60 mins'
        };

        setOrders(prev => [newOrder, ...prev].slice(0, 100));
        showNotification('🎉 Order placed successfully!', 'success');

        // Also fire backend multi-pharmacy checkout so MongoDB has the order
        // (this is what Profile → My Orders reads from). Fire-and-forget — local
        // order is already shown, server-side just makes it cross-device.
        (async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const idKey = 'idem-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
                const res = await fetch('/api/pharmacy/billing/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token,
                        'X-Idempotency-Key': idKey
                    },
                    body: JSON.stringify({ address: currentAddress })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    console.warn('[checkout] backend rejected:', data.message || res.status);
                } else {
                    console.log('[checkout] backend created', (data.orders || []).length, 'order(s)');
                }
            } catch (e) {
                console.warn('[checkout] backend call failed:', e.message);
            }
        })();

        setCart([]);
        setCartOpen(false);
        setAddress('');
        return true;
    };

    const toggleCart = (open) => {
        setCartOpen(open === undefined ? !cartOpen : open);
    };

    // ── Theme State ──
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('swa_theme') || 'light';
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('swa_theme', newTheme);
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // ── Download Manager ──
    const [downloads, setDownloads] = useState([]);
    const downloadIdRef = useRef(0);

    // Permanent record of downloaded files (survives toast removal)
    const [downloadedFiles, setDownloadedFiles] = useState(() => {
        try { return JSON.parse(localStorage.getItem('swa_downloaded_files') || '[]'); } catch { return []; }
    });
    const markAsDownloaded = (fileName) => {
        setDownloadedFiles(prev => {
            if (prev.includes(fileName)) return prev;
            const next = [...prev, fileName];
            localStorage.setItem('swa_downloaded_files', JSON.stringify(next));
            // Also save per-user backup
            const storedUser = localStorage.getItem('swaasth_user');
            if (storedUser) {
                try {
                    const u = JSON.parse(storedUser);
                    if (u.phone) localStorage.setItem(`swa_downloaded_files_${u.phone}`, JSON.stringify(next));
                } catch(e) {}
            }
            return next;
        });
    };

    const startDownload = (fileName) => {
        const id = ++downloadIdRef.current;
        const entry = { id, fileName, status: 'downloading', progress: 0 };
        setDownloads(prev => [entry, ...prev].slice(0, 6));

        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 25 + 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: 100, status: 'complete' } : d));
                markAsDownloaded(fileName);
                // Auto-remove toast after showing "complete" for 2.5s
                setTimeout(() => {
                    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'exiting' } : d));
                    setTimeout(() => {
                        setDownloads(prev => prev.filter(d => d.id !== id));
                    }, 400);
                }, 2500);
            } else {
                setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: Math.min(progress, 95) } : d));
            }
        }, 300 + Math.random() * 200);

        return id;
    };

    const scrollPosRef = useRef({});

    const navigateTo = (screen) => {
        // Save current scroll position before leaving
        scrollPosRef.current[currentScreen] = window.scrollY;

        setIsLoading(true);
        setTimeout(() => {
            setCurrentScreen(screen);
            setIsLoading(false);

            // Restore or Reset scroll after short layout delay
            setTimeout(() => {
                const savedPos = screen === 'home' ? (scrollPosRef.current['home'] || 0) : 0;
                window.scrollTo(0, savedPos);
            }, 100);
        }, 150);
    };

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('swaasth_user', JSON.stringify(userData));

        // Restore user-specific health history & downloaded files from previous sessions
        if (userData.phone) {
            const savedHistory = localStorage.getItem(`swa_health_history_${userData.phone}`);
            if (savedHistory) {
                try {
                    const parsed = JSON.parse(savedHistory);
                    setHealthHistory(parsed);
                    localStorage.setItem('swa_health_history', JSON.stringify(parsed));
                } catch(e) {}
            }
            const savedDl = localStorage.getItem(`swa_downloaded_files_${userData.phone}`);
            if (savedDl) {
                try {
                    const parsed = JSON.parse(savedDl);
                    setDownloadedFiles(parsed);
                    localStorage.setItem('swa_downloaded_files', JSON.stringify(parsed));
                } catch(e) {}
            }
        }

        showNotification('Welcome back!', 'success');
        navigateTo('home');
    };

    const updateUser = async (updates) => {
        const token = localStorage.getItem('token');
        if (!token) return false;
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (res.ok && data.user) {
                setUser(data.user);
                localStorage.setItem('swaasth_user', JSON.stringify(data.user));
                return true;
            }
        } catch (e) { console.error('Profile update failed:', e); }
        return false;
    };

    const logout = () => {
        // Save user-specific data before clearing (so it restores on re-login)
        if (user?.phone) {
            localStorage.setItem(`swa_health_history_${user.phone}`, JSON.stringify(healthHistory));
            localStorage.setItem(`swa_downloaded_files_${user.phone}`, JSON.stringify(downloadedFiles));
        }
        setUser(null);
        // Clear all user data from localStorage on sign-out
        localStorage.removeItem('swaasth_user');
        localStorage.removeItem('token');
        localStorage.removeItem('swa_pharmacy_cart');
        localStorage.removeItem('swa_delivery_address');
        localStorage.removeItem('swa_order_history');
        localStorage.removeItem('swa_health_history');
        localStorage.removeItem('swa_asth_access');
        localStorage.removeItem('swa_downloaded_files');
        // Reset in-memory state
        setCart([]);
        setOrders([]);
        setHealthHistory([]);
        setDownloadedFiles([]);
        setAddress('');
        showNotification('Logged out successfully', 'info');
        navigateTo('splash');
    };

    return (
        <AppContext.Provider value={{
            currentScreen, navigateTo,
            user, login, logout, updateUser,
            notification, showNotification,
            isLoading, setIsLoading,
            theme, toggleTheme,
            cart, cartOpen, toggleCart, address, setAddress,
            addToCart, updateQty, removeItem, clearCart, placeOrder,
            orders, ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_ICONS,
            isModalOpen, setModalActive,
            healthHistory, addHealthRecord,
            downloads, startDownload, downloadedFiles
        }}>
            {children}
        </AppContext.Provider>
    );
};

window.useApp = () => useContext(AppContext);
window.AppContext = AppContext;
