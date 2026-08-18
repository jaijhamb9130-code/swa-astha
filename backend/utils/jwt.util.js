const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Set it in backend/.env');
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn(`[SECURITY] JWT_SECRET is only ${process.env.JWT_SECRET.length} chars; recommended >=32. Rotate it when convenient.`);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Generate JWT token
 * @param {Object} payload - Data to encode in token
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate patient authentication token
 * @param {Object} patient - Patient object
 * @returns {String} JWT token
 */
const generatePatientToken = (patient) => {
  return generateToken({
    id: patient._id,
    patientId: patient.patientId,
    phone: patient.phone,
    type: 'patient'
  });
};

/**
 * Generate doctor authentication token
 * @param {Object} doctor - Doctor object
 * @returns {String} JWT token
 */
const generateDoctorToken = (doctor) => {
  return generateToken({
    id: doctor._id,
    phone: doctor.phone,
    registrationNumber: doctor.registrationNumber,
    type: 'doctor'
  });
};

/**
 * Generate pharmacy owner authentication token
 */
const generatePharmacyToken = (pharmacy) => {
  return generateToken({
    id: pharmacy._id,
    pharmacyId: pharmacy.pharmacyId,
    phone: pharmacy.ownerPhone,
    type: 'pharmacy'
  });
};

module.exports = {
  generateToken,
  verifyToken,
  generatePatientToken,
  generateDoctorToken,
  generatePharmacyToken
};
