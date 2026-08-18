const mongoose = require("mongoose");

// Each order belongs to ONE pharmacy. A patient's cart with items from
// multiple pharmacies splits into one Order per pharmacy at checkout —
// that keeps each pharmacy's view clean (they only see their own orders).
const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, index: true },

  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  patientId: { type: String, required: true, index: true },

  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true, index: true },
  pharmacyName: String,

  items: [
    {
      medicineId: String,
      name: String,
      price: Number,
      quantity: Number,
      batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }
    }
  ],

  totalAmount: Number,

  status: {
    type: String,
    enum: ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },

  // Delivery snapshot taken at checkout (patient's address at the time)
  deliveryAddress: {
    street: String, city: String, state: String, pincode: String
  }
}, { timestamps: true });

orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    this.orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
