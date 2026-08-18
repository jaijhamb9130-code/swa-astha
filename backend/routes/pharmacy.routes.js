const express = require('express');
const router = express.Router();

const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Batch = require('../models/Batch.model');
const Pharmacy = require('../models/Pharmacy.model');
const Patient = require('../models/Patient.model');
const HealthRecord = require('../models/HealthRecord.model');
const { getMedicineDB } = require('../services/medicineDatabase');
const { idempotency } = require('../middleware/idempotency.middleware');
const {
  authenticatePharmacy,
  requireVerifiedPharmacy,
  authenticatePatient
} = require('../middleware/auth.middleware');

// ============================================
// CSV BRAND DATABASE LOOKUP (unchanged)
// ============================================
router.get('/inventory/search', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    if (!q) return res.json({ success: true, query: q, results: [] });
    const db = getMedicineDB();
    const results = db.search(q, limit);
    res.json({ success: true, query: q, results });
  } catch (err) {
    console.error('Inventory Search Error:', err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

router.get('/intelligence/substitutes', (req, res) => {
  try {
    const brand = (req.query.brand || '').trim();
    if (!brand) return res.status(400).json({ success: false, message: 'brand query param required' });
    const db = getMedicineDB();
    const match = db.fuzzyMatch(brand);
    const substitutes = db.findSubstitutes(brand, 10);
    res.json({
      success: true,
      brand,
      matched: match ? { brand_name: match.brand_matched, salt: match.salt_composition, score: match.match_score } : null,
      substitutes
    });
  } catch (err) {
    console.error('Substitutes Error:', err);
    res.status(500).json({ success: false, message: 'Failed to find substitutes' });
  }
});

// ============================================
// PATIENT-FACING: nearby pharmacies that stock a medicine
// ============================================

// GET /api/pharmacy/find?medicine=Paracetamol&lat=26.9&lng=75.7&radius=5000&limit=5
// Returns verified pharmacies that have the medicine in stock, sorted by distance.
router.get('/find', async (req, res) => {
  try {
    const medicine = (req.query.medicine || '').trim();
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Math.max(500, parseInt(req.query.radius || '5000', 10));
    const limit = Math.min(50, parseInt(req.query.limit || '5', 10));

    if (!medicine) {
      return res.status(400).json({ success: false, message: 'medicine query param required' });
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Provide lat & lng (browser geolocation)' });
    }

    // 1) Find all verified pharmacies within radius (ordered by distance).
    const nearbyPharmacies = await Pharmacy.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',     // metres
          maxDistance: radius,
          spherical: true,
          query: { isVerified: true, isActive: true }
        }
      },
      { $limit: 50 }
    ]);

    if (nearbyPharmacies.length === 0) {
      return res.json({ success: true, results: [], message: 'No verified pharmacies in range' });
    }

    const pharmacyIds = nearbyPharmacies.map(p => p._id);

    // 2) Find in-stock batches matching the brand name OR salt (case-insensitive).
    // This way picking "Dolo 650" surfaces any pharmacy stocking the salt
    // (Paracetamol) under a different brand like Crocin.
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const brandRe = new RegExp(escape(medicine), 'i');
    const orClauses = [{ brandName: brandRe }];
    const saltHint = (req.query.salt || '').trim();
    if (saltHint) orClauses.push({ salt: new RegExp(escape(saltHint), 'i') });
    // Also try the medicine string itself as a salt match (covers when the
    // patient typed a salt name like "Paracetamol" rather than a brand).
    orClauses.push({ salt: brandRe });

    const batches = await Batch.find({
      pharmacy: { $in: pharmacyIds },
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
      $or: orClauses
    }).lean();

    // For each pharmacy keep the cheapest matching batch (price = sellingPrice ?? mrp)
    const cheapestByPharmacy = new Map();
    for (const b of batches) {
      const price = (typeof b.sellingPrice === 'number' && b.sellingPrice > 0) ? b.sellingPrice : b.mrp;
      const pid = String(b.pharmacy);
      const cur = cheapestByPharmacy.get(pid);
      if (!cur || price < cur.price) {
        cheapestByPharmacy.set(pid, {
          batchId: b._id, brandName: b.brandName, salt: b.salt, strength: b.strength,
          price, mrp: b.mrp, manufacturer: b.manufacturer, quantity: b.quantity, expiryDate: b.expiryDate
        });
      }
    }

    // 3) Stitch: pharmacy + distance + cheapest match. Drop pharmacies without stock.
    const results = nearbyPharmacies
      .map(p => {
        const match = cheapestByPharmacy.get(String(p._id));
        if (!match) return null;
        const coords = (p.location && Array.isArray(p.location.coordinates))
          ? { lng: p.location.coordinates[0], lat: p.location.coordinates[1] }
          : null;
        return {
          pharmacy: {
            id: p._id,
            pharmacyId: p.pharmacyId,
            name: p.name,
            ownerName: p.ownerName,
            address: p.address,
            phone: p.ownerPhone,
            distanceMeters: Math.round(p.distance),
            coords // { lat, lng } — used by patient app for Google Maps link
          },
          medicine: match
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error('Pharmacy Find Error:', err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// Public details for a single pharmacy (used by patient app when viewing a card)
router.get('/public/:id', async (req, res) => {
  try {
    const p = await Pharmacy.findOne({ _id: req.params.id, isVerified: true, isActive: true });
    if (!p) return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    res.json({
      success: true,
      pharmacy: {
        id: p._id, pharmacyId: p.pharmacyId, name: p.name,
        ownerName: p.ownerName, address: p.address, phone: p.ownerPhone
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load pharmacy' });
  }
});

// ============================================
// PHARMACY-SCOPED (owner sees only their own)
// ============================================

// GET /api/pharmacy/me/inventory   — own batches (search optional)
router.get('/me/inventory', authenticatePharmacy, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = { pharmacy: req.pharmacy._id };
    if (q) filter.brandName = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const batches = await Batch.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, batches });
  } catch (err) {
    console.error('Own Inventory Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load inventory' });
  }
});

// POST /api/pharmacy/me/inventory/add-batch   — add stock under THIS pharmacy
router.post('/me/inventory/add-batch', authenticatePharmacy, requireVerifiedPharmacy, async (req, res) => {
  try {
    const { brandName, salt, strength, manufacturer, batchNumber, quantity, mrp, sellingPrice, expiryDate, supplier } = req.body || {};
    if (!brandName || !batchNumber || quantity == null || mrp == null || !expiryDate) {
      return res.status(400).json({ success: false, message: 'brandName, batchNumber, quantity, mrp and expiryDate are required' });
    }
    const batch = await Batch.create({
      pharmacy: req.pharmacy._id,
      brandName, salt, strength, manufacturer,
      batchNumber, quantity, mrp, sellingPrice,
      expiryDate: new Date(expiryDate),
      supplier
    });
    res.status(201).json({ success: true, batch });
  } catch (err) {
    console.error('Add Batch Error:', err);
    res.status(500).json({ success: false, message: 'Failed to add batch' });
  }
});

// PUT /api/pharmacy/me/inventory/:id   — update own batch
router.put('/me/inventory/:id', authenticatePharmacy, async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, pharmacy: req.pharmacy._id });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    const allowed = ['quantity', 'sellingPrice', 'mrp', 'expiryDate', 'supplier'];
    for (const k of allowed) if (req.body[k] !== undefined) batch[k] = req.body[k];
    await batch.save();
    res.json({ success: true, batch });
  } catch (err) {
    console.error('Update Batch Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update batch' });
  }
});

// DELETE /api/pharmacy/me/inventory/:id
router.delete('/me/inventory/:id', authenticatePharmacy, async (req, res) => {
  try {
    const r = await Batch.deleteOne({ _id: req.params.id, pharmacy: req.pharmacy._id });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete batch' });
  }
});

// GET /api/pharmacy/me/orders   — orders directed at THIS pharmacy
router.get('/me/orders', authenticatePharmacy, async (req, res) => {
  try {
    const orders = await Order.find({ pharmacy: req.pharmacy._id })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Own Orders Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load orders' });
  }
});

// PATCH /api/pharmacy/me/orders/:orderId/status   — accept/preparing/delivered/etc.
router.patch('/me/orders/:orderId/status', authenticatePharmacy, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const order = await Order.findOne({ _id: req.params.orderId, pharmacy: req.pharmacy._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.status = status;
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// ============================================
// BILLING — multi-pharmacy checkout
// ============================================

// POST /api/pharmacy/billing/checkout   — splits cart by pharmacy into one Order per pharmacy
router.post('/billing/checkout', authenticatePatient, idempotency, async (req, res) => {
  try {
    const patientId = req.patient.patientId;
    const cart = await Cart.findOne({ patientId });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Group items by pharmacy
    const groups = new Map();
    for (const it of cart.items) {
      if (!it.pharmacy) continue; // legacy items missing pharmacy ref are skipped
      const k = String(it.pharmacy);
      if (!groups.has(k)) groups.set(k, { pharmacy: it.pharmacy, pharmacyName: it.pharmacyName, items: [], total: 0 });
      const g = groups.get(k);
      g.items.push(it);
      g.total += (it.price || 0) * (it.quantity || 1);
    }
    if (groups.size === 0) {
      return res.status(400).json({ success: false, message: 'No valid items in cart (missing pharmacy on items)' });
    }

    const createdOrders = [];
    for (const g of groups.values()) {
      const order = new Order({
        patient: req.patient._id,
        patientId,
        pharmacy: g.pharmacy,
        pharmacyName: g.pharmacyName,
        items: g.items.map(i => ({
          medicineId: i.medicineId, name: i.name, price: i.price, quantity: i.quantity, batch: i.batch
        })),
        totalAmount: g.total,
        deliveryAddress: req.patient.address || {}
      });
      await order.save();
      createdOrders.push(order);
    }
    await Cart.deleteOne({ patientId });
    res.json({ success: true, orders: createdOrders, count: createdOrders.length });
  } catch (err) {
    console.error('Checkout Error:', err);
    res.status(500).json({ success: false, message: 'Checkout failed' });
  }
});

// ============================================
// PRESCRIPTIONS — list a patient's prescription history (unchanged)
// ============================================

router.get('/prescriptions/:patientId', async (req, res) => {
  try {
    const records = await HealthRecord.find({
      patientId: req.params.patientId,
      category: 'prescription'
    }).sort({ createdAt: -1 }).limit(50);
    res.json({
      success: true,
      patientId: req.params.patientId,
      prescriptions: records.map(r => ({
        id: r._id, title: r.title, fileUrl: r.fileUrl, createdAt: r.createdAt, meta: r.meta
      }))
    });
  } catch (err) {
    console.error('Prescriptions Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch prescriptions' });
  }
});

// ============================================
// LEGACY patient-facing orders endpoint
// ============================================

router.get('/orders/:patientId', async (req, res) => {
  try {
    const orders = await Order.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Orders Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

module.exports = router;
