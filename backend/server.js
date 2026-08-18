require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS — allow-list explicit origins via FRONTEND_URL (comma-separated).
// Always allow same-origin (no Origin header, or Origin matches the server's
// own host). In development we additionally allow ANY http(s)://localhost:*
// or http(s)://127.0.0.1:* so the patient SPA, doctor SPA, and Next.js
// pharmacy portal can all call this API without configuration friction.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const isDev = process.env.NODE_ENV !== 'production';
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                  // curl / Postman / same-origin
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (isDev && LOCALHOST_RE.test(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Admin-Secret']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Gated uploads — uploaded patient files (prescriptions, reports, scans) must
// not be world-readable. We require any valid patient or doctor JWT, supplied
// via Authorization header or ?t=<token> query (the latter is needed so
// <img src> tags still work; tokens are user-scoped and short-lived enough).
const { verifyToken } = require('./utils/jwt.util');
function gateUpload(req, res, next) {
  let token = null;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) token = auth.substring(7);
  else if (req.query.t) token = String(req.query.t);
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    const decoded = verifyToken(token);
    if (decoded.type !== 'patient' && decoded.type !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Invalid token type' });
    }
    req.uploadActor = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
app.use('/uploads', gateUpload, express.static(path.join(__dirname, 'uploads')));
// Disable browser caching for HTML/JSX/JS in /public so frontend edits propagate
// immediately during development (no more stale-cache "the changes don't show" loops).
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (/\.(html|jsx|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swaastha')
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Eager-load AI medicine database so the first scan request isn't slow
require('./services/medicineDatabase').getMedicineDB();
const { isConfigured: aiConfigured } = require('./services/geminiParser');
console.log(`[AI Engine] GEMINI_API_KEY ${aiConfigured() ? 'configured ✅' : 'NOT configured (prescription scan disabled)'}`);

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/doctor', require('./routes/doctor.routes'));
app.use('/api/patient', require('./routes/patient.routes'));
app.use('/api/pharmacy-auth', require('./routes/pharmacyAuth.routes'));
app.use('/api/pharmacy', require('./routes/pharmacy.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/health-records', require('./routes/healthRecords.routes'));
app.use('/api/medicines', require('./routes/medicines.routes'));
app.use('/api/prescription', require('./routes/uploads.routes'));
app.use('/api/reports', require('./routes/uploads.routes'));
app.use('/api/bills', require('./routes/bills.routes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SwaAstha Backend is running',
    aiScanner: aiConfigured() ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString()
  });
});

// Admin panel — the HTML page itself is unauthenticated (no data leaks just
// from loading the shell); the page prompts the operator for the secret and
// sends it via X-Admin-Secret header on every /api/admin/* call.
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Patient SPA — any non-API route falls back to index.html so client-side
// routing can take over. /api/* and /uploads/* hit the 404 handler instead.
app.get(/^\/(?!api|uploads|admin).*/, (req, res, next) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('Swa-Astha Backend Server');
  console.log('==================================================');
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Patient app: http://localhost:${PORT}/`);
  console.log(`🩺 Admin panel: http://localhost:${PORT}/admin  (you'll be prompted for the secret)`);
  console.log(`📡 API base:    http://localhost:${PORT}/api`);
  console.log('==================================================\n');
});

module.exports = app;
