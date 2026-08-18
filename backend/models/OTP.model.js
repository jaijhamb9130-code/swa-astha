const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'verification', 'password_reset'],
    default: 'registration'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - document will be auto-deleted after expiresAt
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
otpSchema.index({ phone: 1, createdAt: -1 });

// Static method to generate and save OTP
otpSchema.statics.generateOTP = async function(phone, purpose = 'registration') {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiry to 10 minutes from now
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
  // Save OTP
  const otpDoc = await this.create({
    phone,
    otp,
    purpose,
    expiresAt
  });
  
  return otpDoc;
};

// Maximum verification attempts per OTP before it's locked
const MAX_OTP_ATTEMPTS = 3;

// Static method to verify OTP — enforces a 3-attempt limit per generated OTP.
// Counts failed attempts on the *latest* unused OTP for (phone, purpose) and
// locks it (marks isUsed=true) once the cap is reached.
otpSchema.statics.verifyOTP = async function(phone, otp, purpose = 'registration') {
  // Grab the most recent unused, non-expired OTP for this phone+purpose
  const latest = await this.findOne({
    phone,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!latest) {
    return { valid: false, message: 'Invalid or expired OTP. Please request a new one.' };
  }

  // Already exhausted attempts on this OTP
  if (latest.attempts >= MAX_OTP_ATTEMPTS) {
    latest.isUsed = true;
    await latest.save();
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  // Check OTP match
  if (String(latest.otp) !== String(otp)) {
    latest.attempts += 1;
    const remaining = MAX_OTP_ATTEMPTS - latest.attempts;

    if (latest.attempts >= MAX_OTP_ATTEMPTS) {
      latest.isUsed = true; // lock it
      await latest.save();
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }
    await latest.save();
    return {
      valid: false,
      message: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      attemptsRemaining: remaining
    };
  }

  // Match — consume it
  latest.isUsed = true;
  await latest.save();
  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = mongoose.model('OTP', otpSchema);
