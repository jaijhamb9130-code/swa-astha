const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient.model');
const Order = require('../models/Order.model');
const DoctorPatientLink = require('../models/DoctorPatientLink.model');
const { authenticatePatient } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/patient/info
 * @desc    Get patient's own information
 * @access  Private (Patient)
 */
router.get('/info', authenticatePatient, async (req, res) => {
  try {
    res.json({
      success: true,
      patient: req.patient.toSafeObject()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient information'
    });
  }
});

/**
 * @route   PUT /api/patient/info
 * @desc    Update patient information
 * @access  Private (Patient)
 */
router.put('/info', authenticatePatient, async (req, res) => {
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
    
    Object.assign(req.patient, updates);
    await req.patient.save();
    
    res.json({
      success: true,
      message: 'Information updated successfully',
      patient: req.patient.toSafeObject()
    });
    
  } catch (error) {
    console.error('Patient Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update information'
    });
  }
});

/**
 * GET /api/patient/orders   — My Orders list (across all pharmacies)
 */
router.get('/orders', authenticatePatient, async (req, res) => {
  try {
    const orders = await Order.find({ patientId: req.patient.patientId })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({
      success: true,
      orders: orders.map(o => ({
        id: o._id,
        orderId: o.orderId,
        pharmacyName: o.pharmacyName,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        itemCount: (o.items || []).length,
        createdAt: o.createdAt
      }))
    });
  } catch (err) {
    console.error('Patient Orders Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load orders' });
  }
});

/**
 * GET /api/patient/orders/:orderId   — Single order detail (full items)
 */
router.get('/orders/:orderId', authenticatePatient, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      patientId: req.patient.patientId
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load order' });
  }
});

/**
 * GET /api/patient/doctor-visits   — Doctors who looked up this patient.
 * Joined with Doctor for the display fields the UI needs.
 */
router.get('/doctor-visits', authenticatePatient, async (req, res) => {
  try {
    const links = await DoctorPatientLink.find({
      patient: req.patient._id,
      hiddenByPatient: false
    })
      .sort({ lastViewedAt: -1 })
      .populate('doctor', 'name specialization clinicName city email phone isVerified')
      .lean();

    const visits = links
      .filter(l => l.doctor) // doctor still exists
      .map(l => ({
        linkId: l._id,
        doctor: {
          id: l.doctor._id,
          name: l.doctor.name,
          specialization: l.doctor.specialization,
          clinic: l.doctor.clinicName,
          city: l.doctor.city,
          isVerified: l.doctor.isVerified
        },
        firstViewedAt: l.firstViewedAt,
        lastViewedAt: l.lastViewedAt,
        viewCount: l.viewCount
      }));

    res.json({ success: true, visits });
  } catch (err) {
    console.error('Doctor Visits Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load doctor visits' });
  }
});

/**
 * PATCH /api/patient/doctor-visits/:linkId/hide   — hide a doctor from the list
 */
router.patch('/doctor-visits/:linkId/hide', authenticatePatient, async (req, res) => {
  try {
    const link = await DoctorPatientLink.findOne({ _id: req.params.linkId, patient: req.patient._id });
    if (!link) return res.status(404).json({ success: false, message: 'Visit not found' });
    link.hiddenByPatient = true;
    await link.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to hide visit' });
  }
});

module.exports = router;
