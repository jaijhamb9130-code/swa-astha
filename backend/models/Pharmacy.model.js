const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  // Basic / Business info
  name: { type: String, required: [true, 'Pharmacy name is required'], trim: true },
  ownerName: { type: String, required: [true, 'Owner name is required'], trim: true },
  ownerPhone: {
    type: String,
    required: [true, 'Owner phone is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  licenseNumber: {
    type: String,
    required: [true, 'Drug license number is required'],
    unique: true,
    trim: true
  },

  // Where the pharmacy physically is
  address: {
    street: String,
    city: String,
    state: String,
    pincode: { type: String, match: /^[0-9]{6}$/ }
  },
  // GeoJSON Point — coordinates are [lng, lat] (MongoDB convention)
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },

  // KYC / verification (admin-approved, like doctors)
  isVerified: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationDocuments: {
    license: String,        // /uploads/...
    gst: String,
    ownerIdProof: String,
    shopPhoto: String
  },
  verificationNotes: String,
  verifiedAt: Date,

  // Auto-generated pharmacy id (display)
  pharmacyId: { type: String, unique: true, index: true },

  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

pharmacySchema.index({ location: '2dsphere' });

pharmacySchema.pre('save', async function(next) {
  if (!this.pharmacyId) {
    const count = await mongoose.model('Pharmacy').countDocuments();
    this.pharmacyId = `PH-${String(count + 100001).slice(-6)}`;
  }
  next();
});

pharmacySchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Pharmacy', pharmacySchema);
