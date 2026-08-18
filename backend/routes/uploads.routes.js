const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticatePatient } = require('../middleware/auth.middleware');
const HealthRecord = require('../models/HealthRecord.model');
const { analyzePrescription, isConfigured: aiConfigured } = require('../services/geminiParser');
const { getMedicineDB } = require('../services/medicineDatabase');

// ── Storage ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + suffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
    const okMime = allowed.test(file.mimetype);
    if (okExt && okMime) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG) and PDFs are allowed'));
  }
});

// Skip multer if the request is not multipart (so JSON requests pass through)
const maybeMulter = (fieldName) => (req, res, next) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('multipart/form-data')) {
    return upload.single(fieldName)(req, res, next);
  }
  next();
};

// Decode either a multer file OR a base64 data URL into a Buffer + persisted file.
// Returns { buffer, fileName, mimeType, fileUrl, fileSize } or throws.
function ingestFile({ req, defaultPrefix }) {
  if (req.file) {
    return {
      buffer: fs.readFileSync(req.file.path),
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      fileUrl: '/uploads/' + req.file.filename,
      fileSize: req.file.size
    };
  }
  const raw = req.body?.image || req.body?.file;
  if (!raw || typeof raw !== 'string') return null;

  let mimeType = 'image/jpeg';
  let b64 = raw;
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/.exec(raw);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    b64 = dataUrlMatch[2];
  } else if (req.body?.fileType) {
    mimeType = req.body.fileType;
  }
  const buffer = Buffer.from(b64, 'base64');
  if (!buffer || buffer.length === 0) return null;

  const ext = mimeType.includes('png') ? '.png'
            : mimeType.includes('pdf') ? '.pdf'
            : mimeType.includes('webp') ? '.webp'
            : '.jpg';
  const fileName = (defaultPrefix || 'file') + '-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
  const dest = path.join('uploads', fileName);
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });
  fs.writeFileSync(dest, buffer);

  return { buffer, fileName, mimeType, fileUrl: '/uploads/' + fileName, fileSize: buffer.length };
}

function shapeMedicine(med, db) {
  const rawName = med.brand_raw || '';
  // Pass predicted_salt as a hint so brand match gets a bonus when salts align,
  // and a salt-only fallback kicks in if the brand alone doesn't pass threshold.
  const match = rawName ? db.fuzzyMatch(rawName, { predicted_salt: med.predicted_salt }) : null;
  const salt = med.predicted_salt || (match && match.salt_composition) || '';
  const strength = med.strength_raw || (match && match.strength_db) || '';
  const confidence = match ? match.match_score : 85;
  const status = match ? match.status : 'auto';
  let notes = med.notes || '';
  if (med.predicted_use) notes = `Use: ${med.predicted_use}${notes ? ' | ' + notes : ''}`;

  return {
    name: (match && match.brand_matched) || rawName || 'Unknown',
    brand_raw: rawName,
    salt: salt || '',
    strength: strength || '',
    dosage: med.frequency || '',
    duration: med.duration || '',
    route: med.route || '',
    notes,
    confidence,
    status
  };
}

/**
 * @route   POST /api/prescription/scan
 * @desc    Scan prescription image. Accepts:
 *           - multipart/form-data with field "prescription"
 *           - JSON { image: "data:image/...;base64,..." }
 */
router.post('/scan', authenticatePatient, maybeMulter('prescription'), async (req, res) => {
  const startTime = Date.now();
  try {
    if (!aiConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI prescription scanning is not configured. Set GEMINI_API_KEY in backend/.env',
        code: 'AI_NOT_CONFIGURED'
      });
    }

    const file = ingestFile({ req, defaultPrefix: 'prescription' });
    if (!file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const aiResult = await analyzePrescription(file.buffer);
    if (aiResult._error) {
      return res.status(502).json({ success: false, message: aiResult.message || 'AI extraction failed', code: aiResult._error });
    }
    if (!aiResult.medicines || aiResult.medicines.length === 0) {
      return res.status(422).json({ success: false, message: 'Could not extract medicines from this image. Try a clearer photo.' });
    }

    const db = getMedicineDB();
    const medicines = aiResult.medicines.map(m => shapeMedicine(m, db));
    const patient = aiResult.patient || {};
    const doctor = aiResult.doctor || {};
    const doctorName = doctor.name || 'Unknown Doctor';
    const processingTime = Date.now() - startTime;

    const record = new HealthRecord({
      patient: req.patient._id,
      patientId: req.patient.patientId,
      title: 'Prescription Scan' + (doctor.name ? ' — ' + doctor.name : ''),
      category: 'prescription',
      type: 'prescription',
      source: 'upload',
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.mimeType,
      fileSize: file.fileSize,
      meta: { extractedMedicines: medicines, doctor, patient, processingTimeMs: processingTime }
    });
    await record.save();

    console.log(`[SCAN] ${medicines.length} medicines (doctor: ${doctorName}, ${processingTime}ms)`);

    res.json({
      success: true,
      message: `Prescription processed — ${medicines.length} medicines found`,
      extractedText: `Prescription by ${doctorName}`,
      doctor: doctorName,
      patient: { name: patient.name || null, age: patient.age || null, gender: patient.gender || null, date: patient.date || null },
      doctorInfo: { name: doctor.name || null, clinic: doctor.clinic || null, registration_no: doctor.registration_no || null },
      medicines,
      status: 'extracted',
      processedAt: Date.now(),
      pipelineInfo: { engine: 'A.I. System', time_ms: processingTime },
      recordId: record._id
    });
  } catch (err) {
    console.error('Prescription Scan Error:', err);
    res.status(500).json({ success: false, message: 'Failed to process prescription' });
  }
});

const TYPE_MAP = {
  'pdf': 'other',
  'image': 'other',
  'application/pdf': 'other',
  'image/jpeg': 'other',
  'image/png': 'other',
  'image/webp': 'other',
  'JPG': 'other',
  'PNG': 'other',
  'PDF': 'other',
  'blood-test': 'blood-test',
  'scan': 'scan',
  'prescription': 'prescription',
  'bill': 'bill',
  'insurance': 'insurance',
  'other': 'other'
};
const CATEGORY_MAP = {
  'report': 'report', 'prescription': 'prescription', 'bill': 'bill',
  'scan': 'scan', 'order': 'order', 'other': 'other', 'General': 'report'
};

/**
 * @route   POST /api/reports/upload
 * @desc    Upload medical report. Accepts:
 *           - multipart/form-data with field "report"
 *           - JSON { file: "data:...;base64,...", fileName, fileType, category, title }
 */
router.post('/upload', authenticatePatient, maybeMulter('report'), async (req, res) => {
  try {
    const file = ingestFile({ req, defaultPrefix: 'report' });
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const { title, category, type } = req.body || {};
    const validType = TYPE_MAP[type] || 'other';
    const validCategory = CATEGORY_MAP[category] || 'report';

    const record = new HealthRecord({
      patient: req.patient._id,
      patientId: req.patient.patientId,
      title: title || req.body?.fileName || 'Medical Report',
      category: validCategory,
      type: validType,
      source: 'upload',
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.mimeType,
      fileSize: file.fileSize
    });
    await record.save();

    res.json({
      success: true,
      message: 'Report uploaded successfully',
      record: {
        id: record._id,
        title: record.title,
        category: record.category,
        fileUrl: record.fileUrl,
        uploadedAt: record.createdAt
      }
    });
  } catch (err) {
    console.error('Report Upload Error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload report' });
  }
});

module.exports = router;
