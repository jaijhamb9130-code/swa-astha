const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const HealthRecord = require('../models/HealthRecord.model');
const DoctorPatientLink = require('../models/DoctorPatientLink.model');
const { authenticateDoctor, requireCompleteDoctor } = require('../middleware/auth.middleware');
const { otpRateLimiter } = require('../middleware/rateLimit.middleware');
const { generateAndSendOTP, verifyOTP } = require('../utils/otp.util');
const { generateDoctorToken } = require('../utils/jwt.util');

// ============================================
// DOCTOR AUTHENTICATION
// ============================================

/**
 * @route   POST /api/doctor/send-otp
 * @desc    Send OTP to doctor's phone (rate-limited)
 * @access  Public
 */
router.post('/send-otp', otpRateLimiter, async (req, res) => {
  try {
    const { phone, requireAccount } = req.body;
    console.log(`[DOCTOR] /send-otp: phone=${phone}, requireAccount=${!!requireAccount}`);
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number' });
    }
    const existingDoctor = await Doctor.findOne({ phone });
    if (requireAccount && !existingDoctor) {
      return res.status(404).json({ success: false, message: 'No doctor account found. Please sign up first.' });
    }
    if (!requireAccount && existingDoctor) {
      return res.status(400).json({ success: false, message: 'Phone number already registered. Please sign in.' });
    }
    const result = await generateAndSendOTP(phone, requireAccount ? 'login' : 'registration');
    res.json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp: result.otp })
    });
  } catch (error) {
    console.error('Doctor Send OTP Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

/**
 * @route   POST /api/doctor/register
 * @desc    Register new doctor
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phone, otp } = req.body;
    if (!name || !phone || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide name, phone and OTP' });
    }
    const existingDoctor = await Doctor.findOne({ phone });
    if (existingDoctor) {
      return res.status(400).json({ success: false, message: 'Doctor already registered with this phone number' });
    }
    const otpVerification = await verifyOTP(phone, otp, 'registration');
    if (!otpVerification.valid) {
      return res.status(400).json({ success: false, message: otpVerification.message });
    }
    // Professional credentials (registrationNumber / specialization / degree) are
    // collected during the KYC verification step on the dashboard. Use placeholders
    // here so the strict schema is satisfied but the user still sees "pending" state.
    const doctor = new Doctor({
      name: name.trim(),
      phone,
      registrationNumber: `PENDING-${phone}`,
      specialization: 'Pending Verification',
      degree: 'Pending Verification',
      lastLogin: new Date()
    });
    await doctor.save();
    const token = generateDoctorToken(doctor);
    res.status(201).json({
      success: true,
      message: 'Doctor registration successful',
      token,
      doctor: doctor.toSafeObject()
    });
  } catch (error) {
    console.error('Doctor Registration Error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

/**
 * @route   POST /api/doctor/login
 * @desc    Login doctor
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log(`[DOCTOR] /login: phone=${phone}, otp=${otp}`);
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide phone and OTP' });
    }
    const doctor = await Doctor.findOne({ phone });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'No doctor account found' });
    }
    const otpVerification = await verifyOTP(phone, otp, 'login');
    if (!otpVerification.valid) {
      return res.status(400).json({ success: false, message: otpVerification.message });
    }
    doctor.lastLogin = new Date();
    await doctor.save();
    const token = generateDoctorToken(doctor);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      doctor: doctor.toSafeObject()
    });
  } catch (error) {
    console.error('Doctor Login Error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ============================================
// DOCTOR PROFILE & PATIENT LOOKUP
// ============================================

/**
 * @route   GET /api/doctor/profile
 * @desc    Get doctor profile
 * @access  Private (Doctor)
 */
router.get('/profile', authenticateDoctor, async (req, res) => {
  try {
    res.json({
      success: true,
      ...req.doctor.toSafeObject()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * @route   PUT /api/doctor/profile
 * @desc    Update doctor profile
 * @access  Private (Doctor)
 */
router.put('/profile', authenticateDoctor, async (req, res) => {
  try {
    const allowedUpdates = [
      'email', 'clinicName', 'city', 'specialization',
      'experience', 'degree', 'gender', 'languages', 'about'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    Object.assign(req.doctor, updates);
    await req.doctor.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      ...req.doctor.toSafeObject()
    });
    
  } catch (error) {
    console.error('Doctor Profile Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route   POST /api/doctor/verify
 * @desc    Submit verification documents
 * @access  Private (Doctor)
 */
router.route('/verify')
  .post(authenticateDoctor, async (req, res) => {
    try {
      const {
        email, specialization, experience, gender,
        clinicName, city, registrationNumber, degree
      } = req.body;
      
      // Update doctor information
      req.doctor.email = email;
      req.doctor.specialization = specialization;
      req.doctor.experience = experience;
      req.doctor.gender = gender;
      req.doctor.clinicName = clinicName;
      req.doctor.city = city;
      req.doctor.degree = degree;
      req.doctor.registrationNumber = registrationNumber;
      
      // Update verification status
      req.doctor.verificationStatus = 'under_review';
      
      await req.doctor.save();
      
      res.json({
        success: true,
        message: 'Verification submitted. Your profile will be reviewed within 24-48 hours.',
        doctor: req.doctor.toSafeObject()
      });
      
    } catch (error) {
      console.error('Doctor Verification Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit verification'
      });
    }
  })
  .put(authenticateDoctor, async (req, res) => {
    try {
      const {
        email, specialization, experience, gender,
        clinicName, city, registrationNumber, degree
      } = req.body;
      
      // Update doctor information
      req.doctor.email = email;
      req.doctor.specialization = specialization;
      req.doctor.experience = experience;
      req.doctor.gender = gender;
      req.doctor.clinicName = clinicName;
      req.doctor.city = city;
      req.doctor.degree = degree;
      req.doctor.registrationNumber = registrationNumber;
      
      // Update verification status
      req.doctor.verificationStatus = 'under_review';
      
      await req.doctor.save();
      
      res.json({
        success: true,
        message: 'Verification updated and submitted for review.',
        doctor: req.doctor.toSafeObject()
      });
      
    } catch (error) {
      console.error('Doctor Verification Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update verification'
      });
    }
  });

/**
 * @route   GET /api/doctor/patient/:patientId
 * @desc    Search and get patient details with health records
 * @access  Private (Doctor)
 */
router.get('/patient/:patientId', authenticateDoctor, requireCompleteDoctor, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Find patient by ID or phone
    const patient = await Patient.findByIdentifier(patientId);

    if (!patient) {
      return res.json({
        success: true,
        found: false,
        message: 'Patient not found in our records'
      });
    }

    // Get patient's health records
    const records = await HealthRecord.getPatientHistory(patient.patientId);

    // Upsert the DoctorPatientLink — this is the gate for chat permission
    // and shows the doctor in the patient's "Doctor Visits" tab.
    await DoctorPatientLink.findOneAndUpdate(
      { doctor: req.doctor._id, patient: patient._id },
      {
        $setOnInsert: { firstViewedAt: new Date(), patientId: patient.patientId },
        $set: { lastViewedAt: new Date() },
        $inc: { viewCount: 1 }
      },
      { upsert: true, new: true }
    );

    // Update doctor's statistics
    req.doctor.totalPatientsViewed += 1;
    req.doctor.totalRecordsAccessed += records.length;
    await req.doctor.save();
    
    res.json({
      success: true,
      found: true,
      patient: patient.toSafeObject(),
      records: records.map(r => ({
        id: r._id,
        title: r.title,
        category: r.category,
        type: r.type,
        source: r.source,
        recordDate: r.recordDate,
        createdAt: r.createdAt,
        meta: r.meta,
        doctorNotes: r.doctorNotes
      }))
    });
    
  } catch (error) {
    console.error('Patient Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search patient'
    });
  }
});

/**
 * @route   GET /api/doctor/patients/recent
 * @desc    Get recently viewed patients
 * @access  Private (Doctor)
 */
router.get('/patients/recent', authenticateDoctor, requireCompleteDoctor, async (req, res) => {
  try {
    // Get recent health records accessed by this doctor
    const recentRecords = await HealthRecord.find({ doctor: req.doctor._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('patient', 'name patientId age phone');
    
    // Extract unique patients
    const patientsMap = new Map();
    recentRecords.forEach(record => {
      if (record.patient && !patientsMap.has(record.patient.patientId)) {
        patientsMap.set(record.patient.patientId, {
          name: record.patient.name,
          patientId: record.patient.patientId,
          age: record.patient.age,
          phone: record.patient.phone,
          lastViewed: record.createdAt
        });
      }
    });
    
    const patients = Array.from(patientsMap.values());
    
    res.json({
      success: true,
      patients
    });
    
  } catch (error) {
    console.error('Recent Patients Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent patients'
    });
  }
});

/**
 * @route   POST /api/doctor/patient/:patientId/record
 * @desc    Add health record for a patient
 * @access  Private (Doctor)
 */
router.post('/patient/:patientId/record', authenticateDoctor, requireCompleteDoctor, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { title, category, type, notes } = req.body;
    
    // Find patient
    const patient = await Patient.findByIdentifier(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Create health record
    const record = new HealthRecord({
      patient: patient._id,
      patientId: patient.patientId,
      title,
      category,
      type,
      source: 'doctor',
      doctor: req.doctor._id,
      doctorNotes: notes
    });
    
    await record.save();
    
    res.status(201).json({
      success: true,
      message: 'Health record added successfully',
      record: {
        id: record._id,
        title: record.title,
        category: record.category,
        type: record.type,
        recordDate: record.recordDate,
        doctorNotes: record.doctorNotes
      }
    });
    
  } catch (error) {
    console.error('Add Record Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add health record'
    });
  }
});

module.exports = router;
