const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor.model');
const Pharmacy = require('../models/Pharmacy.model');

// Admin gate — header-only. Query-string secrets leak into access logs,
// browser history, and referrer headers, so we no longer accept them.
// Use a constant-time comparison to avoid timing-based secret discovery.
const crypto = require('crypto');

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return res.status(503).json({ success: false, message: 'Admin not configured (missing ADMIN_SECRET)' });
  }
  const provided = req.headers['x-admin-secret'];
  if (!provided || typeof provided !== 'string') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

/**
 * @route   GET /api/admin/doctors/pending
 * @desc    Doctors awaiting review or freshly registered
 */
router.get('/doctors/pending', requireAdmin, async (req, res) => {
  try {
    const doctors = await Doctor.find({
      verificationStatus: { $in: ['pending', 'under_review'] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, doctors: doctors.map(d => d.toSafeObject()) });
  } catch (err) {
    console.error('Admin Pending Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
});

/**
 * @route   GET /api/admin/doctors/all
 * @desc    Full doctor list with verification status
 */
router.get('/doctors/all', requireAdmin, async (req, res) => {
  try {
    const doctors = await Doctor.find({}).sort({ createdAt: -1 });
    res.json({ success: true, doctors: doctors.map(d => d.toSafeObject()) });
  } catch (err) {
    console.error('Admin All Doctors Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
});

/**
 * @route   POST /api/admin/doctor/:phone/approve
 * @desc    Approve a doctor's verification
 */
router.post('/doctor/:phone/approve', requireAdmin, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ phone: req.params.phone });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    doctor.verificationStatus = 'approved';
    doctor.isVerified = true;
    doctor.verifiedAt = new Date();
    if (req.body && req.body.notes) doctor.verificationNotes = req.body.notes;
    await doctor.save();

    res.json({ success: true, message: 'Doctor approved', doctor: doctor.toSafeObject() });
  } catch (err) {
    console.error('Admin Approve Error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve doctor' });
  }
});

/**
 * @route   POST /api/admin/doctor/:phone/reject
 * @desc    Reject a doctor's verification
 */
router.post('/doctor/:phone/reject', requireAdmin, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ phone: req.params.phone });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    doctor.verificationStatus = 'rejected';
    doctor.isVerified = false;
    if (req.body && req.body.notes) doctor.verificationNotes = req.body.notes;
    await doctor.save();

    res.json({ success: true, message: 'Doctor rejected', doctor: doctor.toSafeObject() });
  } catch (err) {
    console.error('Admin Reject Error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject doctor' });
  }
});

// ============================================
// PHARMACY VERIFICATION (mirrors doctor flow)
// ============================================

router.get('/pharmacies/pending', requireAdmin, async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find({
      verificationStatus: { $in: ['pending', 'under_review'] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, pharmacies: pharmacies.map(p => p.toSafeObject()) });
  } catch (err) {
    console.error('Admin Pending Pharmacies Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pharmacies' });
  }
});

router.get('/pharmacies/all', requireAdmin, async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find({}).sort({ createdAt: -1 });
    res.json({ success: true, pharmacies: pharmacies.map(p => p.toSafeObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pharmacies' });
  }
});

router.post('/pharmacy/:phone/approve', requireAdmin, async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ ownerPhone: req.params.phone });
    if (!pharmacy) return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    pharmacy.verificationStatus = 'approved';
    pharmacy.isVerified = true;
    pharmacy.verifiedAt = new Date();
    if (req.body && req.body.notes) pharmacy.verificationNotes = req.body.notes;
    await pharmacy.save();
    res.json({ success: true, message: 'Pharmacy approved', pharmacy: pharmacy.toSafeObject() });
  } catch (err) {
    console.error('Admin Approve Pharmacy Error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve pharmacy' });
  }
});

router.post('/pharmacy/:phone/reject', requireAdmin, async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ ownerPhone: req.params.phone });
    if (!pharmacy) return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    pharmacy.verificationStatus = 'rejected';
    pharmacy.isVerified = false;
    if (req.body && req.body.notes) pharmacy.verificationNotes = req.body.notes;
    await pharmacy.save();
    res.json({ success: true, message: 'Pharmacy rejected', pharmacy: pharmacy.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject pharmacy' });
  }
});

module.exports = router;
module.exports.requireAdmin = requireAdmin;
