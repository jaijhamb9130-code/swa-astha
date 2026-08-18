const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart.model");
const Batch = require("../models/Batch.model");
const Pharmacy = require("../models/Pharmacy.model");
const { authenticatePatient } = require("../middleware/auth.middleware");

// Recompute cart totals based on current items
function recomputeTotal(cart) {
  cart.totalAmount = (cart.items || []).reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);
  cart.updatedAt = new Date();
}

// POST /api/cart/add  — Add a specific Batch (which is owned by a pharmacy) to cart.
// Body: { batchId, quantity }
// We tag the line item with the batch's pharmacy so checkout can split correctly.
router.post("/add", authenticatePatient, async (req, res) => {
  try {
    const { batchId, quantity } = req.body || {};
    const qty = Math.max(1, parseInt(quantity || 1, 10));
    if (!batchId) return res.status(400).json({ success: false, message: "batchId is required" });

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found" });
    if (batch.quantity < qty) {
      return res.status(400).json({ success: false, message: "Not enough stock" });
    }
    const pharmacy = await Pharmacy.findById(batch.pharmacy);
    if (!pharmacy) return res.status(404).json({ success: false, message: "Pharmacy not found" });

    const price = (typeof batch.sellingPrice === 'number' && batch.sellingPrice > 0) ? batch.sellingPrice : batch.mrp;
    const patientId = req.patient.patientId;

    let cart = await Cart.findOne({ patientId });
    if (!cart) cart = new Cart({ patientId, items: [], totalAmount: 0 });

    // Match on batch (same medicine + same pharmacy + same batch = same line)
    const existing = cart.items.find(i => String(i.batch) === String(batch._id));
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.items.push({
        medicineId: String(batch._id),
        name: batch.brandName,
        price,
        quantity: qty,
        pharmacy: pharmacy._id,
        pharmacyName: pharmacy.name,
        batch: batch._id
      });
    }
    recomputeTotal(cart);
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    console.error('Cart Add Error:', err);
    res.status(500).json({ success: false, message: "Failed to add to cart" });
  }
});

// GET /api/cart  — current patient's cart, grouped by pharmacy
router.get("/", authenticatePatient, async (req, res) => {
  try {
    const cart = await Cart.findOne({ patientId: req.patient.patientId });
    if (!cart) return res.json({ success: true, cart: { items: [], totalAmount: 0, groups: [] } });

    // group by pharmacy for UI
    const groups = {};
    for (const it of cart.items) {
      const k = String(it.pharmacy || 'unknown');
      groups[k] = groups[k] || { pharmacy: it.pharmacy, pharmacyName: it.pharmacyName, items: [], subtotal: 0 };
      groups[k].items.push(it);
      groups[k].subtotal += (it.price || 0) * (it.quantity || 1);
    }
    res.json({
      success: true,
      cart: {
        totalAmount: cart.totalAmount,
        items: cart.items,
        groups: Object.values(groups)
      }
    });
  } catch (err) {
    console.error('Cart Get Error:', err);
    res.status(500).json({ success: false, message: "Failed to load cart" });
  }
});

// POST /api/cart/update  — change quantity on a line item
router.post("/update", authenticatePatient, async (req, res) => {
  try {
    const { batchId, quantity } = req.body || {};
    const qty = Math.max(0, parseInt(quantity || 0, 10));
    const cart = await Cart.findOne({ patientId: req.patient.patientId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart empty" });
    const idx = cart.items.findIndex(i => String(i.batch) === String(batchId));
    if (idx < 0) return res.status(404).json({ success: false, message: "Item not in cart" });
    if (qty === 0) cart.items.splice(idx, 1);
    else cart.items[idx].quantity = qty;
    recomputeTotal(cart);
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update cart" });
  }
});

// DELETE /api/cart/remove  — remove a line item
router.delete("/remove", authenticatePatient, async (req, res) => {
  try {
    const { batchId } = req.body || {};
    const cart = await Cart.findOne({ patientId: req.patient.patientId });
    if (!cart) return res.json({ success: true, cart: { items: [], totalAmount: 0 } });
    cart.items = cart.items.filter(i => String(i.batch) !== String(batchId));
    recomputeTotal(cart);
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove item" });
  }
});

// DELETE /api/cart/clear
router.delete("/clear", authenticatePatient, async (req, res) => {
  try {
    await Cart.deleteOne({ patientId: req.patient.patientId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
});

module.exports = router;
