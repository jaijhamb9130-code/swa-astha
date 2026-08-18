const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage.model');
const DoctorPatientLink = require('../models/DoctorPatientLink.model');
const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const {
  authenticatePatient,
  authenticateDoctor
} = require('../middleware/auth.middleware');

// ------------------------------------------------------------------
// Helper: returns the (doctorId, patientId) pair from any caller, or
// 403 if no DoctorPatientLink exists for that pair (chat is gated by
// the doctor having looked up the patient at least once).
// ------------------------------------------------------------------
async function resolvePair(req, res, otherIdParam) {
  if (req.patient) {
    const doctorId = otherIdParam;
    const link = await DoctorPatientLink.findOne({ doctor: doctorId, patient: req.patient._id });
    if (!link) {
      res.status(403).json({ success: false, message: 'No active connection with this doctor' });
      return null;
    }
    return { doctorId, patientId: req.patient._id, role: 'patient' };
  }
  if (req.doctor) {
    const patientId = otherIdParam;
    const link = await DoctorPatientLink.findOne({ doctor: req.doctor._id, patient: patientId });
    if (!link) {
      res.status(403).json({ success: false, message: 'You have not viewed this patient yet' });
      return null;
    }
    return { doctorId: req.doctor._id, patientId, role: 'doctor' };
  }
  res.status(401).json({ success: false, message: 'Unauthorized' });
  return null;
}

// =====================================================================
// PATIENT-SIDE
// =====================================================================

// GET /api/chat/patient/threads   — list doctors patient can chat with
router.get('/patient/threads', authenticatePatient, async (req, res) => {
  try {
    const links = await DoctorPatientLink.find({
      patient: req.patient._id,
      hiddenByPatient: false
    })
      .populate('doctor', 'name specialization clinicName city isVerified')
      .sort({ lastViewedAt: -1 })
      .lean();

    // For each thread, attach the last message + unread count
    const out = [];
    for (const l of links) {
      if (!l.doctor) continue;
      const last = await ChatMessage.findOne({ doctor: l.doctor._id, patient: req.patient._id })
        .sort({ createdAt: -1 }).lean();
      const unread = await ChatMessage.countDocuments({
        doctor: l.doctor._id, patient: req.patient._id,
        senderRole: 'doctor', readByPatient: false
      });
      out.push({
        doctorId: l.doctor._id,
        doctor: {
          name: l.doctor.name,
          specialization: l.doctor.specialization,
          clinic: l.doctor.clinicName,
          city: l.doctor.city
        },
        lastMessage: last ? { text: last.text, at: last.createdAt, senderRole: last.senderRole } : null,
        unread
      });
    }
    res.json({ success: true, threads: out });
  } catch (err) {
    console.error('Patient threads error:', err);
    res.status(500).json({ success: false, message: 'Failed to load threads' });
  }
});

// GET /api/chat/patient/messages/:doctorId   — full history with one doctor
router.get('/patient/messages/:doctorId', authenticatePatient, async (req, res) => {
  try {
    const pair = await resolvePair(req, res, req.params.doctorId);
    if (!pair) return;
    const msgs = await ChatMessage.find({ doctor: pair.doctorId, patient: pair.patientId })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();
    // Mark doctor-sent messages as read by patient
    await ChatMessage.updateMany(
      { doctor: pair.doctorId, patient: pair.patientId, senderRole: 'doctor', readByPatient: false },
      { $set: { readByPatient: true } }
    );
    res.json({ success: true, messages: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

// POST /api/chat/patient/send   — { doctorId, text }
router.post('/patient/send', authenticatePatient, async (req, res) => {
  try {
    const { doctorId, text } = req.body || {};
    if (!doctorId || !text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'doctorId and non-empty text required' });
    }
    const pair = await resolvePair(req, res, doctorId);
    if (!pair) return;
    const msg = await ChatMessage.create({
      doctor: pair.doctorId,
      patient: pair.patientId,
      senderRole: 'patient',
      text: text.trim(),
      readByPatient: true
    });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send' });
  }
});

// GET /api/chat/patient/poll/:doctorId?since=<iso>   — lightweight polling
router.get('/patient/poll/:doctorId', authenticatePatient, async (req, res) => {
  try {
    const pair = await resolvePair(req, res, req.params.doctorId);
    if (!pair) return;
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60_000);
    const msgs = await ChatMessage.find({
      doctor: pair.doctorId, patient: pair.patientId,
      createdAt: { $gt: since }
    }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, messages: msgs, now: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Poll failed' });
  }
});

// =====================================================================
// DOCTOR-SIDE  (mirror of the above)
// =====================================================================

router.get('/doctor/threads', authenticateDoctor, async (req, res) => {
  try {
    const links = await DoctorPatientLink.find({ doctor: req.doctor._id })
      .populate('patient', 'name patientId phone age gender')
      .sort({ lastViewedAt: -1 })
      .lean();

    const out = [];
    for (const l of links) {
      if (!l.patient) continue;
      const last = await ChatMessage.findOne({ doctor: req.doctor._id, patient: l.patient._id })
        .sort({ createdAt: -1 }).lean();
      const unread = await ChatMessage.countDocuments({
        doctor: req.doctor._id, patient: l.patient._id,
        senderRole: 'patient', readByDoctor: false
      });
      out.push({
        patientId: l.patient._id,
        patient: {
          name: l.patient.name,
          patientCode: l.patient.patientId,
          age: l.patient.age,
          gender: l.patient.gender
        },
        lastMessage: last ? { text: last.text, at: last.createdAt, senderRole: last.senderRole } : null,
        unread
      });
    }
    res.json({ success: true, threads: out });
  } catch (err) {
    console.error('Doctor threads error:', err);
    res.status(500).json({ success: false, message: 'Failed to load threads' });
  }
});

router.get('/doctor/messages/:patientId', authenticateDoctor, async (req, res) => {
  try {
    const pair = await resolvePair(req, res, req.params.patientId);
    if (!pair) return;
    const msgs = await ChatMessage.find({ doctor: pair.doctorId, patient: pair.patientId })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();
    await ChatMessage.updateMany(
      { doctor: pair.doctorId, patient: pair.patientId, senderRole: 'patient', readByDoctor: false },
      { $set: { readByDoctor: true } }
    );
    res.json({ success: true, messages: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

router.post('/doctor/send', authenticateDoctor, async (req, res) => {
  try {
    const { patientId, text } = req.body || {};
    if (!patientId || !text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'patientId and non-empty text required' });
    }
    const pair = await resolvePair(req, res, patientId);
    if (!pair) return;
    const msg = await ChatMessage.create({
      doctor: pair.doctorId,
      patient: pair.patientId,
      senderRole: 'doctor',
      text: text.trim(),
      readByDoctor: true
    });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send' });
  }
});

router.get('/doctor/poll/:patientId', authenticateDoctor, async (req, res) => {
  try {
    const pair = await resolvePair(req, res, req.params.patientId);
    if (!pair) return;
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60_000);
    const msgs = await ChatMessage.find({
      doctor: pair.doctorId, patient: pair.patientId,
      createdAt: { $gt: since }
    }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, messages: msgs, now: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Poll failed' });
  }
});

module.exports = router;
