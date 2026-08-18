const express = require('express');
const router = express.Router();
const Pharmacy = require('../models/Pharmacy.model');
const { generateAndSendOTP, verifyOTP } = require('../utils/otp.util');
const { generatePharmacyToken } = require('../utils/jwt.util');
const { authenticatePharmacy } = require('../middleware/auth.middleware');
const { otpRateLimiter } = require('../middleware/rateLimit.middleware');

// ============================================
// PHARMACY OWNER AUTHENTICATION (OTP, mirrors doctor flow)
// ============================================

router.post('/send-otp', otpRateLimiter, async (req, res) => {
  try {
    const { phone, requireAccount } = req.body;
    console.log(`[PHARMACY] /send-otp: phone=${phone}, requireAccount=${!!requireAccount}`);
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Provide a valid 10-digit phone' });
    }
    const existing = await Pharmacy.findOne({ ownerPhone: phone });
    if (requireAccount && !existing) {
      return res.status(404).json({ success: false, message: 'No pharmacy account. Please sign up first.' });
    }
    if (!requireAccount && existing) {
      return res.status(400).json({ success: false, message: 'Already registered. Please sign in.' });
    }
    const result = await generateAndSendOTP(phone, requireAccount ? 'login' : 'registration');
    res.json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp: result.otp })
    });
  } catch (err) {
    console.error('Pharmacy Send OTP Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const {
      name, ownerName, ownerPhone, email, licenseNumber, otp,
      address, location // location: { lat, lng }
    } = req.body;

    if (!name || !ownerName || !ownerPhone || !licenseNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Provide pharmacy name, owner, phone, license and OTP' });
    }
    const dup = await Pharmacy.findOne({ $or: [{ ownerPhone }, { licenseNumber }] });
    if (dup) {
      return res.status(400).json({ success: false, message: 'A pharmacy with that phone or license already exists' });
    }
    const verification = await verifyOTP(ownerPhone, otp, 'registration');
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    const pharmacy = new Pharmacy({
      name: name.trim(),
      ownerName: ownerName.trim(),
      ownerPhone,
      email: email ? email.trim() : undefined,
      licenseNumber: licenseNumber.trim().toUpperCase(),
      address: address || {},
      location: (location && typeof location.lat === 'number' && typeof location.lng === 'number')
        ? { type: 'Point', coordinates: [location.lng, location.lat] }
        : undefined,
      lastLogin: new Date()
    });
    await pharmacy.save();
    const token = generatePharmacyToken(pharmacy);
    res.status(201).json({
      success: true,
      message: 'Pharmacy registered. KYC pending admin approval.',
      token,
      pharmacy: pharmacy.toSafeObject()
    });
  } catch (err) {
    console.error('Pharmacy Registration Error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log(`[PHARMACY] /login: phone=${phone}, otp=${otp}`);
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Provide phone and OTP' });
    }
    const pharmacy = await Pharmacy.findOne({ ownerPhone: phone });
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'No pharmacy account found' });
    }
    const verification = await verifyOTP(phone, otp, 'login');
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    pharmacy.lastLogin = new Date();
    await pharmacy.save();
    const token = generatePharmacyToken(pharmacy);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      pharmacy: pharmacy.toSafeObject()
    });
  } catch (err) {
    console.error('Pharmacy Login Error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.get('/profile', authenticatePharmacy, async (req, res) => {
  res.json({ success: true, pharmacy: req.pharmacy.toSafeObject() });
});

router.put('/profile', authenticatePharmacy, async (req, res) => {
  try {
    const allowed = ['name', 'ownerName', 'email', 'address', 'verificationDocuments'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    // Allow updating coordinates separately as {lat,lng}
    if (req.body.location && typeof req.body.location.lat === 'number' && typeof req.body.location.lng === 'number') {
      updates.location = { type: 'Point', coordinates: [req.body.location.lng, req.body.location.lat] };
    }
    Object.assign(req.pharmacy, updates);
    await req.pharmacy.save();
    res.json({ success: true, pharmacy: req.pharmacy.toSafeObject() });
  } catch (err) {
    console.error('Pharmacy Profile Update Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Owner submits KYC docs (file URLs already uploaded via /api/uploads-style flow,
// or just URL strings for now). Moves status to 'under_review'.
router.post('/kyc/submit', authenticatePharmacy, async (req, res) => {
  try {
    const { license, gst, ownerIdProof, shopPhoto } = req.body || {};
    req.pharmacy.verificationDocuments = {
      license: license || req.pharmacy.verificationDocuments?.license,
      gst: gst || req.pharmacy.verificationDocuments?.gst,
      ownerIdProof: ownerIdProof || req.pharmacy.verificationDocuments?.ownerIdProof,
      shopPhoto: shopPhoto || req.pharmacy.verificationDocuments?.shopPhoto
    };
    req.pharmacy.verificationStatus = 'under_review';
    await req.pharmacy.save();
    res.json({ success: true, message: 'KYC submitted for review', pharmacy: req.pharmacy.toSafeObject() });
  } catch (err) {
    console.error('Pharmacy KYC Error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit KYC' });
  }
});

module.exports = router;
