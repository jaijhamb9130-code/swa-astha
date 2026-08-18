const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  
  // Professional Information
  registrationNumber: {
    type: String,
    required: [true, 'Medical registration number is required'],
    unique: true,
    trim: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required']
  },
  degree: {
    type: String,
    required: [true, 'Degree is required']
  },
  experience: {
    type: String
  },
  
  // Practice Details
  clinicName: String,
  city: String,
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'male'
  },
  languages: {
    type: [String],
    default: ['Hindi', 'English']
  },
  about: {
    type: String,
    maxlength: 500
  },
  
  // Verification Status
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationDocuments: {
    license: String,
    degreeCertificate: String,
    idProof: String
  },
  verificationNotes: String,
  verifiedAt: Date,
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Statistics
  totalPatientsViewed: {
    type: Number,
    default: 0
  },
  totalRecordsAccessed: {
    type: Number,
    default: 0
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

// Instance method to get safe doctor data
doctorSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Doctor', doctorSchema);
