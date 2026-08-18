const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  // Patient Reference
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  
  // Record Details
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['report', 'prescription', 'bill', 'scan', 'order', 'other']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['blood-test', 'scan', 'prescription', 'bill', 'insurance', 'other']
  },
  
  // Source Information
  source: {
    type: String,
    enum: ['reports', 'pharmacy', 'bills', 'profile', 'doctor', 'upload'],
    default: 'upload'
  },
  
  // File/Document Information
  fileUrl: String,
  fileName: String,
  fileType: String,
  fileSize: Number,
  
  // Additional Metadata
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Doctor Information (if record was created/viewed by a doctor)
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  doctorNotes: String,
  
  // Timestamps
  recordDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
healthRecordSchema.index({ patient: 1, recordDate: -1 });
healthRecordSchema.index({ patientId: 1, category: 1 });
healthRecordSchema.index({ createdAt: -1 });

// Static method to get patient's complete health history
healthRecordSchema.statics.getPatientHistory = function(patientId, options = {}) {
  const query = { patientId };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ recordDate: -1 })
    .limit(options.limit || 100)
    .populate('doctor', 'name specialization');
};

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
