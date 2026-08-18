const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  // Owner pharmacy — every batch belongs to exactly one pharmacy.
  // Patients see batches grouped by pharmacy; pharmacies see only their own.
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true, index: true },

  brandName: { type: String, required: true, index: true },
  salt: String,
  strength: String,
  manufacturer: String,
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },

  // mrp = printed cap, sellingPrice = what THIS pharmacy actually charges.
  // Patient comparison uses sellingPrice; defaults to mrp if unset.
  mrp: { type: Number, required: true },
  sellingPrice: { type: Number },

  expiryDate: { type: Date, required: true },
  supplier: String,
  receivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

batchSchema.index({ brandName: 1, expiryDate: 1 });
batchSchema.index({ pharmacy: 1, brandName: 1 });

module.exports = mongoose.model('Batch', batchSchema);
