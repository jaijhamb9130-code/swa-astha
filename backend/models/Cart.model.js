const mongoose = require("mongoose");

// A single cart can hold items from multiple pharmacies. At checkout we
// split it into one Order per pharmacy so each pharmacy only sees its own.
const cartSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true
  },
  items: [
    {
      medicineId: String,
      name: String,
      price: Number,
      quantity: Number,
      pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
      pharmacyName: String,
      batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }
    }
  ],
  totalAmount: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Cart", cartSchema);