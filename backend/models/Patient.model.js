const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [1, 'Age must be at least 1'],
    max: [150, 'Age must be less than 150']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  
  // Patient ID (auto-generated)
  patientId: {
    type: String,
    unique: true,
    index: true
  },
  
  // Profile Information
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'male'
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  
  // Medical Information
  allergies: [String],
  chronicConditions: [String],
  currentMedications: [String],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique patient ID before saving
patientSchema.pre('save', async function(next) {
  if (!this.patientId) {
    // Generate 6-digit unique ID
    const count = await mongoose.model('Patient').countDocuments();
    this.patientId = `SWA-${String(count + 100001).slice(-6)}`;
  }
  next();
});

// Instance method to get safe patient data (without sensitive info)
patientSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static method to find by patient ID or phone
patientSchema.statics.findByIdentifier = function(identifier) {
  return this.findOne({
    $or: [
      { patientId: identifier.toUpperCase() },
      { phone: identifier }
    ]
  });
};

module.exports = mongoose.model('Patient', patientSchema);
