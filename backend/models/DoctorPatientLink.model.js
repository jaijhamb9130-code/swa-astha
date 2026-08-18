const mongoose = require('mongoose');

// Created the first time a verified doctor looks up a patient by ID.
// This is the permission gate for chat: a patient sees a doctor in their
// "Doctor Visits" tab — and can chat — only if a link exists.
const doctorPatientLinkSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  patientId: { type: String, required: true, index: true },

  firstViewedAt: { type: Date, default: Date.now },
  lastViewedAt: { type: Date, default: Date.now },
  viewCount: { type: Number, default: 1 },

  // patient can mute / hide a doctor from their list without deleting history
  hiddenByPatient: { type: Boolean, default: false }
}, { timestamps: true });

doctorPatientLinkSchema.index({ doctor: 1, patient: 1 }, { unique: true });

module.exports = mongoose.model('DoctorPatientLink', doctorPatientLinkSchema);
