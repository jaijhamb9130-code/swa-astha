const mongoose = require('mongoose');

// One row = one message between a (doctor, patient) pair.
// We keep the pair denormalized so polling queries don't need a join.
const chatMessageSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },

  // who actually sent this row
  senderRole: { type: String, enum: ['doctor', 'patient'], required: true },

  text: { type: String, required: true, maxlength: 2000, trim: true },

  // read-receipts (set by the recipient when they fetch and view)
  readByDoctor: { type: Boolean, default: false },
  readByPatient: { type: Boolean, default: false }
}, { timestamps: true });

chatMessageSchema.index({ doctor: 1, patient: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
