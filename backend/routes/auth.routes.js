const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient.model');
const { generateAndSendOTP, verifyOTP } = require('../utils/otp.util');
const { generatePatientToken } = require('../utils/jwt.util');
const { authenticatePatient } = require('../middleware/auth.middleware');
const { otpRateLimiter } = require('../middleware/rateLimit.middleware');

// ============================================
// PATIENT AUTHENTICATION
// ============================================

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post('/send-otp', otpRateLimiter, async (req, res) => {
  try {
    const { phone, requireAccount } = req.body;
    console.log(`[AUTH] /send-otp: phone=${phone}, requireAccount=${!!requireAccount}`);
    
    // Validate phone number
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }
    
    // Check if account exists
    const existingPatient = await Patient.findOne({ phone });
    
    if (requireAccount && !existingPatient) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number. Please sign up first.'
      });
    }
    
    if (!requireAccount && existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered. Please sign in.'
      });
    }
    
    // Generate and send OTP
    const result = await generateAndSendOTP(phone, requireAccount ? 'login' : 'registration');

    res.json({
      success: true,
      message: 'OTP sent successfully to your phone',
      ...(process.env.NODE_ENV !== 'production' && { otp: result.otp })
    });
    
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register new patient
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, age, phone, otp } = req.body;
    
    // Validate input
    if (!name || !age || !phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Check if patient already exists
    const existingPatient = await Patient.findOne({ phone });
    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'User already registered with this phone number'
      });
    }
    
    // Verify OTP
    const otpVerification = await verifyOTP(phone, otp, 'registration');
    if (!otpVerification.valid) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message
      });
    }
    
    // Create new patient
    const patient = new Patient({
      name: name.trim(),
      age: parseInt(age),
      phone,
      isVerified: true,
      lastLogin: new Date()
    });
    
    await patient.save();
    
    // Generate token
    const token = generatePatientToken(patient);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: patient.toSafeObject()
    });
    
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login patient
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log(`[AUTH] /login: phone=${phone}, otp=${otp}`);
    
    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and OTP'
      });
    }
    
    // Find patient
    const patient = await Patient.findOne({ phone });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number'
      });
    }
    
    // Verify OTP
    const otpVerification = await verifyOTP(phone, otp, 'login');
    if (!otpVerification.valid) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message
      });
    }
    
    // Update last login
    patient.lastLogin = new Date();
    await patient.save();
    
    // Generate token
    const token = generatePatientToken(patient);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: patient.toSafeObject()
    });
    
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get patient profile
 * @access  Private (Patient)
 */
router.get('/profile', authenticatePatient, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.patient.toSafeObject()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update patient profile
 * @access  Private (Patient)
 */
router.put('/profile', authenticatePatient, async (req, res) => {
  try {
    const allowedUpdates = [
      'name', 'age', 'email', 'gender', 'bloodGroup',
      'address', 'emergencyContact', 'allergies',
      'chronicConditions', 'currentMedications'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    // Update patient
    Object.assign(req.patient, updates);
    await req.patient.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: req.patient.toSafeObject()
    });
    
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Doctor authentication routes are mounted at /api/doctor/* in doctor.routes.js
// (matches the frontend's BASE_URL of "/api/doctor")

module.exports = router;
