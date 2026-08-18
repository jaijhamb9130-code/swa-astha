const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticatePatient } = require('../middleware/auth.middleware');
const HealthRecord = require('../models/HealthRecord.model');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads/bills')) fs.mkdirSync('uploads/bills', { recursive: true });
    cb(null, 'uploads/bills/');
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'bill-' + suffix + path.extname(file.originalname));
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
    cb(new Error('Only images and PDFs are allowed'));
  }
});

const maybeMulter = (fieldName) => (req, res, next) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('multipart/form-data')) {
    return upload.single(fieldName)(req, res, next);
  }
  next();
};

function ingestBill(req) {
  if (req.file) {
    return {
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      fileUrl: '/uploads/bills/' + req.file.filename,
      fileSize: req.file.size
    };
  }
  const raw = req.body?.file || req.body?.image;
  if (!raw || typeof raw !== 'string') return null;

  let mimeType = 'image/jpeg';
  let b64 = raw;
  const m = /^data:([^;]+);base64,(.+)$/.exec(raw);
  if (m) { mimeType = m[1]; b64 = m[2]; }
  else if (req.body?.fileType) mimeType = req.body.fileType;

  const buffer = Buffer.from(b64, 'base64');
  if (!buffer || buffer.length === 0) return null;

  const ext = mimeType.includes('png') ? '.png'
            : mimeType.includes('pdf') ? '.pdf'
            : mimeType.includes('webp') ? '.webp'
            : '.jpg';
  const fileName = 'bill-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
  const dir = 'uploads/bills';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), buffer);

  return { fileName, mimeType, fileUrl: '/uploads/bills/' + fileName, fileSize: buffer.length };
}

/**
 * @route   POST /api/bills/upload
 * @desc    Upload medical bill. Accepts:
 *           - multipart/form-data with field "bill"
 *           - JSON { file: "data:...;base64,...", fileName, hospital, amount, date }
 */
router.post('/upload', authenticatePatient, maybeMulter('bill'), async (req, res) => {
  try {
    const f = ingestBill(req);
    if (!f) return res.status(400).json({ success: false, message: 'No file provided' });

    const { title, amount, hospital, date, fileName: bodyFileName } = req.body || {};
    const billDate = date || new Date().toISOString();

    const record = new HealthRecord({
      patient: req.patient._id,
      patientId: req.patient.patientId,
      title: title || bodyFileName || 'Medical Bill',
      category: 'bill',
      type: 'bill',
      source: 'upload',
      fileName: f.fileName,
      fileUrl: f.fileUrl,
      fileType: f.mimeType,
      fileSize: f.fileSize,
      meta: {
        amount: amount != null ? Number(amount) : null,
        hospital: hospital || null,
        billDate
      }
    });
    await record.save();

    res.json({
      success: true,
      message: 'Bill uploaded successfully',
      bill: {
        id: record._id,
        title: record.title,
        hospital: record.meta?.hospital,
        amount: record.meta?.amount,
        date: record.meta?.billDate,
        fileUrl: record.fileUrl,
        uploadedAt: record.createdAt
      },
      record: {
        id: record._id,
        title: record.title,
        fileUrl: record.fileUrl,
        uploadedAt: record.createdAt
      }
    });
  } catch (err) {
    console.error('Bill Upload Error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload bill' });
  }
});

/**
 * @route   GET /api/bills
 * @desc    List all bills for the authenticated patient
 */
router.get('/', authenticatePatient, async (req, res) => {
  try {
    const bills = await HealthRecord.find({
      patient: req.patient._id,
      category: 'bill'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bills.length,
      bills: bills.map(b => ({
        id: b._id,
        title: b.title,
        amount: b.meta?.amount,
        hospital: b.meta?.hospital,
        billDate: b.meta?.billDate,
        fileUrl: b.fileUrl,
        uploadedAt: b.createdAt
      }))
    });
  } catch (err) {
    console.error('Get Bills Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bills' });
  }
});

/**
 * @route   GET /api/bills/list
 * @desc    Alias for GET /api/bills (frontend compatibility)
 */
router.get('/list', authenticatePatient, async (req, res) => {
  try {
    const bills = await HealthRecord.find({
      patient: req.patient._id,
      category: 'bill'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bills.length,
      bills: bills.map(b => ({
        id: b._id,
        title: b.title,
        amount: b.meta?.amount,
        hospital: b.meta?.hospital,
        billDate: b.meta?.billDate,
        fileUrl: b.fileUrl,
        uploadedAt: b.createdAt
      }))
    });
  } catch (err) {
    console.error('Get Bills Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bills' });
  }
});

module.exports = router;
