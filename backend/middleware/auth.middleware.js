const { verifyToken } = require('../utils/jwt.util');
const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const Pharmacy = require('../models/Pharmacy.model');

/**
 * Middleware to authenticate patient requests
 */
const authenticatePatient = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type'
      });
    }
    
    // Get patient from database
    const patient = await Patient.findById(decoded.id);
    
    if (!patient || !patient.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Patient not found or inactive'
      });
    }
    
    // Attach patient to request
    req.patient = patient;
    req.patientId = patient.patientId;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to authenticate doctor requests
 */
const authenticateDoctor = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type'
      });
    }
    
    // Get doctor from database
    const doctor = await Doctor.findById(decoded.id);
    
    if (!doctor || !doctor.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Doctor not found or inactive'
      });
    }
    
    // Attach doctor to request
    req.doctor = doctor;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to check if doctor is verified
 */
const requireVerifiedDoctor = (req, res, next) => {
  if (!req.doctor.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Doctor account not verified. Please complete KYC verification.',
      code: 'DOCTOR_NOT_VERIFIED'
    });
  }
  next();
};

/**
 * Doctor must be verified AND have a complete profile (clinic, city, address,
 * specialization, degree, registrationNumber). Used to gate full portal access.
 */
const requireCompleteDoctor = (req, res, next) => {
  const d = req.doctor;
  if (!d.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'KYC verification pending. Once approved by admin you will get full access.',
      code: 'DOCTOR_NOT_VERIFIED'
    });
  }
  const missing = [];
  if (!d.clinicName) missing.push('clinicName');
  if (!d.city) missing.push('city');
  if (!d.specialization) missing.push('specialization');
  if (!d.degree) missing.push('degree');
  if (!d.registrationNumber) missing.push('registrationNumber');
  if (missing.length) {
    return res.status(403).json({
      success: false,
      message: 'Please complete your profile to access this feature.',
      code: 'DOCTOR_PROFILE_INCOMPLETE',
      missingFields: missing
    });
  }
  next();
};

/**
 * Middleware to authenticate pharmacy owner requests
 */
const authenticatePharmacy = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided. Please login.' });
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded.type !== 'pharmacy') {
      return res.status(403).json({ success: false, message: 'Invalid token type' });
    }
    const pharmacy = await Pharmacy.findById(decoded.id);
    if (!pharmacy || !pharmacy.isActive) {
      return res.status(401).json({ success: false, message: 'Pharmacy not found or inactive' });
    }
    req.pharmacy = pharmacy;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const requireVerifiedPharmacy = (req, res, next) => {
  if (!req.pharmacy.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Pharmacy not verified yet. Admin will review your KYC documents.',
      code: 'PHARMACY_NOT_VERIFIED'
    });
  }
  next();
};

module.exports = {
  authenticatePatient,
  authenticateDoctor,
  requireVerifiedDoctor,
  requireCompleteDoctor,
  authenticatePharmacy,
  requireVerifiedPharmacy
};
