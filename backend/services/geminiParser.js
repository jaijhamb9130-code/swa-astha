const { SYSTEM_INSTRUCTIONS, HEADER_PROMPT, VERIFY_PROMPT } = require('./geminiPrompts');

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash';

const GEN_CONFIG = {
  temperature: 0.1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json'
};

// Slightly higher temp for the second extraction pass — encourages capturing
// medicines the first pass may have skipped due to over-cautiousness.
const GEN_CONFIG_BROAD = { ...GEN_CONFIG, temperature: 0.25, topP: 0.98 };

let _client = null;
let _sdkLoadAttempted = false;
let _sdkLoadError = null;
let _GoogleGenAI = null;
let _sharp = null;

function _loadSDK() {
  if (_sdkLoadAttempted) return _sdkLoadError;
  _sdkLoadAttempted = true;
  try {
    _GoogleGenAI = require('@google/genai').GoogleGenAI;
  } catch (err) {
    _sdkLoadError = `@google/genai not installed (${err.message}). Run: npm install @google/genai`;
    return _sdkLoadError;
  }
  try {
    _sharp = require('sharp');
  } catch (err) {
    console.warn('[GeminiParser] sharp not available — image preprocessing disabled');
    _sharp = null;
  }
  return null;
}

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

function _getClient() {
  if (!isConfigured()) return null;
  const sdkErr = _loadSDK();
  if (sdkErr) {
    console.warn(`[GeminiParser] ${sdkErr}`);
    return null;
  }
  if (!_client) {
    _client = new _GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _client;
}

function _detectMime(buffer) {
  if (!buffer || buffer.length < 4) return 'image/jpeg';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

// ============================================
// IMAGE PREPROCESSING — makes faint handwriting much more readable.
// Pipeline: EXIF auto-rotate → upscale small images → grayscale → normalize
// (contrast stretch) → sharpen → median denoise. Heavier than the original
// "do nothing" path but dramatically improves OCR for phone-camera Rx photos.
// ============================================
async function _enhanceImage(buffer) {
  if (!_sharp) return null;
  try {
    const meta = await _sharp(buffer).metadata();
    if (!meta || !meta.width || !meta.height) return null;

    // Upscale small images so handwriting strokes have enough pixels for the model
    const targetWidth = meta.width < 1500 ? Math.min(2400, meta.width * 2) : meta.width;
    let pipe = _sharp(buffer).rotate(); // EXIF auto-orient

    if (targetWidth !== meta.width) {
      pipe = pipe.resize({ width: targetWidth, withoutEnlargement: false, kernel: 'lanczos3' });
    }

    const enhanced = await pipe
      .greyscale()         // strips color noise from teal/blue pen
      .normalise()         // stretches contrast (light pen → darker)
      .sharpen({ sigma: 1.2, m1: 1.5, m2: 2.0, x1: 2.0, y2: 10, y3: 20 })
      .median(1)           // gentle salt-and-pepper denoise
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    console.log(`[GeminiParser] Enhanced image: ${meta.width}×${meta.height} → ${targetWidth}px wide, ${enhanced.length} bytes`);
    return enhanced;
  } catch (err) {
    console.warn(`[GeminiParser] Image enhancement failed: ${err.message}`);
    return null;
  }
}

async function _cropHeader(buffer, ratio = 0.45) {
  if (!_sharp) return null;
  try {
    const img = _sharp(buffer).rotate();
    const { width, height } = await img.metadata();
    if (!width || !height) return null;
    const cropHeight = Math.max(1, Math.floor(height * ratio));
    return await _sharp(buffer)
      .rotate()
      .extract({ left: 0, top: 0, width, height: cropHeight })
      .normalise()
      .sharpen()
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch (err) {
    console.warn(`[GeminiParser] Header crop failed: ${err.message}`);
    return null;
  }
}

function _parseJSON(text) {
  if (!text) return {};
  try {
    let clean = text.trim();
    if (clean.includes('```json')) clean = clean.split('```json')[1].split('```')[0].trim();
    else if (clean.includes('```')) clean = clean.split('```')[1].split('```')[0].trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn(`[GeminiParser] JSON parse error: ${err.message}`);
    return {};
  }
}

function _validateAndClean(result) {
  if (!result || typeof result !== 'object') return { patient: {}, doctor: {}, medicines: [] };
  const out = {
    patient: result.patient && typeof result.patient === 'object' ? result.patient : {},
    doctor: result.doctor && typeof result.doctor === 'object' ? result.doctor : {},
    medicines: Array.isArray(result.medicines) ? result.medicines : []
  };
  for (const key of ['name', 'age', 'gender', 'date']) {
    if (out.patient[key] === undefined || out.patient[key] === 'null') out.patient[key] = null;
  }
  for (const key of ['name', 'clinic', 'registration_no']) {
    if (out.doctor[key] === undefined || out.doctor[key] === 'null') out.doctor[key] = null;
  }
  out.medicines = out.medicines
    .filter(m => m && typeof m === 'object' && (m.brand_raw || m.predicted_salt))
    .map(m => ({
      brand_raw: m.brand_raw || '',
      strength_raw: m.strength_raw || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
      route: m.route || '',
      notes: m.notes || '',
      predicted_salt: m.predicted_salt || '',
      predicted_use: m.predicted_use || ''
    }));
  return out;
}

async function _runWithFallback(client, contents, label, config) {
  const cfg = config || GEN_CONFIG;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      console.log(`[GeminiParser] ${label} — trying ${PRIMARY_MODEL} (attempt ${attempt + 1})`);
      const response = await client.models.generateContent({
        model: PRIMARY_MODEL,
        contents,
        config: cfg
      });
      const text = response?.text || (response?.candidates?.[0]?.content?.parts?.[0]?.text);
      if (text) return _parseJSON(text);
    } catch (err) {
      const msg = String(err?.message || err);
      console.warn(`[GeminiParser] ${label} — ${PRIMARY_MODEL} failed: ${msg.slice(0, 200)}`);
      if (/429|quota|rate/i.test(msg) && attempt === 0) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      break;
    }
  }
  try {
    console.log(`[GeminiParser] ${label} — falling back to ${FALLBACK_MODEL}`);
    const response = await client.models.generateContent({
      model: FALLBACK_MODEL,
      contents,
      config: cfg
    });
    const text = response?.text || (response?.candidates?.[0]?.content?.parts?.[0]?.text);
    if (text) return _parseJSON(text);
  } catch (err) {
    console.error(`[GeminiParser] Both models failed: ${err?.message || err}`);
  }
  return {};
}

// ============================================
// MEDICINE UNION — merges medicines extracted from two passes.
// Same medicine appearing in both passes is treated as HIGH-confidence; the
// merged entry takes the longest, most complete field from either side.
// Medicines appearing in only ONE pass are kept but marked needs_review.
// ============================================
function _normalizeName(s) {
  if (!s) return '';
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _bestOf(...vals) {
  // Pick the longest non-empty string — usually the most complete
  let best = '';
  for (const v of vals) {
    const s = (v == null) ? '' : String(v).trim();
    if (s.length > best.length) best = s;
  }
  return best;
}

function _unionMedicines(listA, listB) {
  // Index list A by normalized brand name
  const indexA = new Map();
  for (const m of (listA || [])) {
    const key = _normalizeName(m.brand_raw || m.predicted_salt);
    if (key) indexA.set(key, m);
  }
  const merged = [];
  const consumedFromA = new Set();

  for (const mb of (listB || [])) {
    const key = _normalizeName(mb.brand_raw || mb.predicted_salt);
    if (!key) continue;
    if (indexA.has(key)) {
      const ma = indexA.get(key);
      merged.push({
        brand_raw: _bestOf(ma.brand_raw, mb.brand_raw),
        strength_raw: _bestOf(ma.strength_raw, mb.strength_raw),
        frequency: _bestOf(ma.frequency, mb.frequency),
        duration: _bestOf(ma.duration, mb.duration),
        route: _bestOf(ma.route, mb.route),
        notes: _bestOf(ma.notes, mb.notes),
        predicted_salt: _bestOf(ma.predicted_salt, mb.predicted_salt),
        predicted_use: _bestOf(ma.predicted_use, mb.predicted_use),
        _confidence: 'high'  // present in both passes
      });
      consumedFromA.add(key);
    } else {
      merged.push({ ...mb, _confidence: 'medium' }); // only in B
    }
  }
  // Anything in A but not in B
  for (const [key, ma] of indexA.entries()) {
    if (!consumedFromA.has(key)) merged.push({ ...ma, _confidence: 'medium' });
  }
  return merged;
}

// ============================================
// VERIFICATION PASS
// Sends the merged medicine list back to Gemini with the original image and
// asks it to CONFIRM, CORRECT, or ADD anything missed. The model returns the
// final list. This catches:
//  - Hallucinated medicines (model removes them)
//  - Misread brand names (model corrects)
//  - Skipped medicines (model adds them)
// ============================================
async function _verifyPass(client, imagePart, medicines, requestId) {
  if (!medicines || medicines.length === 0) return medicines;
  try {
    const list = medicines.map((m, i) => `${i + 1}. ${m.brand_raw || ''}${m.strength_raw ? ' ' + m.strength_raw : ''}${m.frequency ? ' (' + m.frequency + ')' : ''}`).join('\n');
    const verifyPrompt = `[Request ID: ${requestId}] We extracted these medicines from the prescription:\n${list}\n\nINSTRUCTION: Look at the prescription image one more time. Return the FINAL corrected list of medicines:\n- KEEP medicines that match what you see\n- CORRECT misread brand names or strengths\n- ADD any medicine that was missed\n- REMOVE any medicine that was hallucinated and isn't in the image\nReturn the complete final list in the same JSON schema (with patient + doctor + medicines).`;

    const result = await _runWithFallback(
      client,
      [{ text: VERIFY_PROMPT }, imagePart, { text: verifyPrompt }],
      `Verify [${requestId}]`
    );
    if (result && Array.isArray(result.medicines) && result.medicines.length > 0) {
      return _validateAndClean(result).medicines;
    }
  } catch (err) {
    console.warn(`[GeminiParser] Verification pass failed: ${err.message}`);
  }
  return medicines;
}

// ============================================
// MAIN PIPELINE
// ============================================
async function analyzePrescription(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('Invalid image buffer');
  }
  if (!isConfigured()) {
    return { _error: 'AI_NOT_CONFIGURED', message: 'Set GEMINI_API_KEY in .env to enable AI prescription scanning.' };
  }
  const client = _getClient();
  if (!client) {
    return { _error: 'AI_SDK_UNAVAILABLE', message: _sdkLoadError || '@google/genai SDK not loaded' };
  }

  const mimeType = _detectMime(imageBuffer);
  const requestId = `REQ-${Math.random().toString(16).slice(2, 10)}-${Date.now()}`;
  console.log(`[GeminiParser] Starting analysis ${requestId}, image=${imageBuffer.length} bytes, mime=${mimeType}`);

  // Preprocess the image in parallel with starting Pass 1 to save wall time
  const enhancePromise = _enhanceImage(imageBuffer);

  const originalPart = { inlineData: { mimeType, data: imageBuffer.toString('base64') } };
  const pass1Prompt = `[Request ID: ${requestId}] Analyze this Indian medical prescription image carefully. FIRST scan the header/letterhead for doctor info and patient details, THEN extract EVERY medicine in the Rx section. Read each handwritten character individually. Use your knowledge of 1200+ Indian medicine brands to disambiguate. Return complete JSON with patient, doctor, and medicines arrays.`;

  // ── PASS 1: extraction on original image ──
  let pass1 = await _runWithFallback(
    client,
    [{ text: SYSTEM_INSTRUCTIONS }, originalPart, { text: pass1Prompt }],
    `Pass 1 [${requestId}]`
  );
  pass1 = _validateAndClean(pass1);

  // ── PASS 2: extraction on enhanced image (parallel of Pass 1 if possible) ──
  const enhancedBytes = await enhancePromise;
  let pass2 = { patient: {}, doctor: {}, medicines: [] };
  if (enhancedBytes) {
    const enhancedPart = { inlineData: { mimeType: 'image/jpeg', data: enhancedBytes.toString('base64') } };
    const pass2Prompt = `[Request ID: ${requestId}] This is the SAME prescription, image-enhanced for clarity (contrast boosted, sharpened, greyscaled). Re-extract all medicines paying special attention to faint or partial handwriting that you couldn't read before. Be thorough but do not invent medicines. Return the JSON schema.`;
    pass2 = await _runWithFallback(
      client,
      [{ text: SYSTEM_INSTRUCTIONS }, enhancedPart, { text: pass2Prompt }],
      `Pass 2 [${requestId}]`,
      GEN_CONFIG_BROAD
    );
    pass2 = _validateAndClean(pass2);
  }

  if ((!pass1.medicines || pass1.medicines.length === 0) && (!pass2.medicines || pass2.medicines.length === 0)) {
    return { _error: 'AI_EMPTY_RESPONSE', message: 'Model returned no medicines', patient: pass1.patient || {}, doctor: pass1.doctor || {}, medicines: [] };
  }

  // ── MERGE Pass 1 + Pass 2 ──
  const mergedMedicines = _unionMedicines(pass1.medicines, pass2.medicines);

  // Merge patient/doctor — prefer pass1 (original) but fill missing from pass2
  const patient = { ...(pass2.patient || {}), ...(pass1.patient || {}) };
  const doctor = { ...(pass2.doctor || {}), ...(pass1.doctor || {}) };

  // ── PASS 3 (header crop, existing): fill any missing patient/doctor fields ──
  const patientMissing = !patient.name && !patient.age;
  const doctorMissing = !doctor.name;

  if ((patientMissing || doctorMissing) && _sharp) {
    console.log(`[GeminiParser] Patient/doctor info incomplete — running header pass`);
    const headerBytes = await _cropHeader(imageBuffer, 0.45);
    if (headerBytes) {
      const headerPart = { inlineData: { mimeType: 'image/jpeg', data: headerBytes.toString('base64') } };
      const headerPrompt = `[Request ID: ${requestId}] Extract patient and doctor details from this prescription header. Read every character carefully.`;
      const headerResult = _validateAndClean(await _runWithFallback(
        client,
        [{ text: HEADER_PROMPT }, headerPart, { text: headerPrompt }],
        `Pass 3 [${requestId}]`
      ));
      const hp = headerResult.patient || {};
      const hd = headerResult.doctor || {};
      for (const k of ['name', 'age', 'gender', 'date']) {
        if (!patient[k] && hp[k]) patient[k] = hp[k];
      }
      for (const k of ['name', 'clinic', 'registration_no']) {
        if (!doctor[k] && hd[k]) doctor[k] = hd[k];
      }
    }
  }

  // ── PASS 4 (verification): re-prompt with the list to catch errors ──
  // Only fire if we have medicines and either had a uniqueness difference
  // (Pass1 ≠ Pass2) or there are very few medicines (likely incomplete).
  const pass1Count = (pass1.medicines || []).length;
  const pass2Count = (pass2.medicines || []).length;
  const verifyNeeded = mergedMedicines.length > 0 && (
    Math.abs(pass1Count - pass2Count) > 0 ||         // passes disagreed
    mergedMedicines.length < 3                       // suspiciously few
  );

  let finalMedicines = mergedMedicines;
  if (verifyNeeded) {
    finalMedicines = await _verifyPass(client, originalPart, mergedMedicines, requestId);
  }

  // Strip our internal _confidence metadata since the schema doesn't expect it
  finalMedicines = finalMedicines.map(m => {
    const { _confidence, ...rest } = m;
    return rest;
  });

  console.log(`[GeminiParser] ${requestId} → Pass1=${pass1Count}, Pass2=${pass2Count}, merged=${mergedMedicines.length}, final=${finalMedicines.length}${verifyNeeded ? ' (verified)' : ''}`);

  return {
    patient,
    doctor,
    medicines: finalMedicines
  };
}

module.exports = { analyzePrescription, isConfigured };
