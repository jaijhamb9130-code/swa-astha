const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true
  },
  
  // Category & Classification
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'bp', 'fever', 'cold', 'diabetes', 'pain', 'acidity',
      'antibiotics', 'heart', 'vitamins', 'thyroid', 'skin', 'eye', 'other'
    ],
    index: true
  },
  
  // Pricing
  price: {
    type: String,
    required: true
  },
  numPrice: {
    type: Number,
    required: true
  },
  mrp: {
    type: Number
  },
  discount: {
    type: Number,
    default: 0
  },
  
  // Usage Information
  use: {
    type: String,
    required: true
  },
  dose: {
    type: String,
    required: true
  },
  
  // Additional Details
  manufacturer: String,
  packSize: String,
  prescription: {
    type: Boolean,
    default: false
  },
  
  // Inventory
  inStock: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    default: 100
  },
  
  // Popularity & Stats
  popularity: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  },
  
  // Search & SEO
  searchKeywords: [String],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
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

// Text index for search
medicineSchema.index({ 
  name: 'text', 
  genericName: 'text', 
  use: 'text',
  searchKeywords: 'text'
});

// Compound indexes
medicineSchema.index({ category: 1, popularity: -1 });
medicineSchema.index({ inStock: 1, isActive: 1 });

// Static method to search medicines
medicineSchema.statics.search = function(query, options = {}) {
  const searchQuery = {
    isActive: true,
    $or: [
      { name: new RegExp(query, 'i') },
      { genericName: new RegExp(query, 'i') },
      { use: new RegExp(query, 'i') },
      { searchKeywords: new RegExp(query, 'i') }
    ]
  };
  
  if (options.category) {
    searchQuery.category = options.category;
  }
  
  if (options.inStockOnly) {
    searchQuery.inStock = true;
  }
  
  return this.find(searchQuery)
    .limit(options.limit || 20)
    .sort({ popularity: -1, name: 1 });
};

// Static method to get popular medicines
medicineSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isActive: true, inStock: true })
    .sort({ popularity: -1, salesCount: -1 })
    .limit(limit);
};

// Static method to get by category
medicineSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ category, isActive: true, inStock: true })
    .sort({ popularity: -1, name: 1 })
    .limit(limit);
};

module.exports = mongoose.model('Medicine', medicineSchema);
