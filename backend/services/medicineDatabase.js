const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'data', 'indian_medicines.csv');

const MIN_MATCH_CONFIDENCE = 65;
const AUTO_MATCH_THRESHOLD = 82;

const STRENGTH_RE = /(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|iu|%)/i;
const NAME_CLEAN_RE = /\s*\d+(?:\.\d+)?\s*(mg|mcg|ml|g|iu|%)?/gi;
const SUFFIX_RE = /\s*(tablet|capsule|syrup|injection|cream|drops|inhaler|gel|ointment|sr|xr|cr|od|duo|forte|plus|ds|er)s?$/i;

const FALLBACK_MEDICINES = [
  { brand_name: 'Dolo 650', salt_composition: 'Paracetamol', strength: '650mg', manufacturer: 'Micro Labs Ltd', type: 'Tablet', schedule: 'OTC' },
  { brand_name: 'Crocin Advance', salt_composition: 'Paracetamol', strength: '500mg', manufacturer: 'GlaxoSmithKline', type: 'Tablet', schedule: 'OTC' },
  { brand_name: 'Augmentin 625 Duo', salt_composition: 'Amoxicillin + Clavulanic Acid', strength: '500mg/125mg', manufacturer: 'GlaxoSmithKline', type: 'Tablet', schedule: 'H' },
  { brand_name: 'Azithral 500', salt_composition: 'Azithromycin', strength: '500mg', manufacturer: 'Alembic Pharma', type: 'Tablet', schedule: 'H' },
  { brand_name: 'Pantop 40', salt_composition: 'Pantoprazole', strength: '40mg', manufacturer: 'Aristo Pharma', type: 'Tablet', schedule: 'H' },
  { brand_name: 'Telma 40', salt_composition: 'Telmisartan', strength: '40mg', manufacturer: 'Glenmark', type: 'Tablet', schedule: 'H' }
];

function normalizeName(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(NAME_CLEAN_RE, '')
    .replace(SUFFIX_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStrength(s) {
  if (!s) return '';
  const m = STRENGTH_RE.exec(String(s));
  return m ? `${m[1]}${m[2].toLowerCase()}` : '';
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

function ratio(a, b) {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.round((1 - dist / maxLen) * 100);
}

function partialRatio(a, b) {
  if (!a || !b) return 0;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (longer.includes(shorter)) return 100;
  let best = 0;
  for (let i = 0; i <= longer.length - shorter.length; i++) {
    const slice = longer.slice(i, i + shorter.length);
    const r = ratio(shorter, slice);
    if (r > best) best = r;
    if (best === 100) break;
  }
  return best;
}

function tokenSetRatio(a, b) {
  const setA = new Set(a.split(/\s+/).filter(Boolean));
  const setB = new Set(b.split(/\s+/).filter(Boolean));
  const inter = [...setA].filter(x => setB.has(x)).sort().join(' ');
  const diffA = [...setA].filter(x => !setB.has(x)).sort().join(' ');
  const diffB = [...setB].filter(x => !setA.has(x)).sort().join(' ');
  const t1 = inter;
  const t2 = (inter + ' ' + diffA).trim();
  const t3 = (inter + ' ' + diffB).trim();
  return Math.max(ratio(t1, t2), ratio(t1, t3), ratio(t2, t3));
}

function parseCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

class MedicineDB {
  constructor() {
    this.medicines = [];
    this.brandNames = [];
    this.brandNamesNormalized = [];
    this.saltList = [];
    this._loaded = false;
    this._load();
  }

  _load() {
    try {
      if (!fs.existsSync(CSV_PATH)) throw new Error(`CSV not found: ${CSV_PATH}`);
      const raw = fs.readFileSync(CSV_PATH, 'utf-8');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const header = parseCSVLine(lines[0]).map(h => h.trim());
      const idx = (name) => header.indexOf(name);
      const iBrand = idx('brand_name');
      const iSalt = idx('salt_composition');
      const iStrength = idx('strength');
      const iMfr = idx('manufacturer');
      const iType = idx('type');
      const iSched = idx('schedule');

      const salts = new Set();
      for (let li = 1; li < lines.length; li++) {
        const cols = parseCSVLine(lines[li]);
        const brand = (cols[iBrand] || '').trim();
        if (!brand) continue;
        const med = {
          brand_name: brand,
          salt_composition: (cols[iSalt] || '').trim(),
          strength: (cols[iStrength] || '').trim(),
          manufacturer: (cols[iMfr] || '').trim(),
          type: (cols[iType] || '').trim(),
          schedule: (cols[iSched] || '').trim()
        };
        this.medicines.push(med);
        this.brandNames.push(brand);
        this.brandNamesNormalized.push(normalizeName(brand));
        med.salt_composition.split('+').forEach(s => {
          const c = s.trim();
          if (c) salts.add(c);
        });
      }
      this.saltList = [...salts];
      this._loaded = true;
      console.log(`[MedicineDB] Loaded ${this.medicines.length} medicines and ${this.saltList.length} unique salts`);
    } catch (err) {
      console.warn(`[MedicineDB] CSV load failed (${err.message}), using fallback (${FALLBACK_MEDICINES.length} medicines)`);
      this.medicines = FALLBACK_MEDICINES;
      this.brandNames = FALLBACK_MEDICINES.map(m => m.brand_name);
      this.brandNamesNormalized = FALLBACK_MEDICINES.map(m => normalizeName(m.brand_name));
      this.saltList = [...new Set(FALLBACK_MEDICINES.flatMap(m => m.salt_composition.split('+').map(s => s.trim())))];
    }
  }

  get count() {
    return this.medicines.length;
  }

  // Generate OCR-equivalent variants of a query string so common handwriting
  // confusions like 'l'↔'1', 'O'↔'0', 'rn'↔'m' don't lose a match.
  _ocrVariants(s) {
    if (!s) return [s];
    const out = new Set([s]);
    // Number ↔ letter swaps
    out.add(s.replace(/0/g, 'o').replace(/1/g, 'l').replace(/5/g, 's'));
    out.add(s.replace(/o/g, '0').replace(/l/g, '1').replace(/s/g, '5'));
    // Common letter merges/splits
    out.add(s.replace(/rn/g, 'm'));
    out.add(s.replace(/m/g, 'rn'));
    out.add(s.replace(/cl/g, 'd'));
    out.add(s.replace(/vv/g, 'w'));
    out.add(s.replace(/w/g, 'vv'));
    out.add(s.replace(/u/g, 'v'));
    out.add(s.replace(/v/g, 'u'));
    out.add(s.replace(/h/g, 'b'));
    out.add(s.replace(/b/g, 'h'));
    out.add(s.replace(/ri/g, 'n'));
    return Array.from(out).filter(Boolean);
  }

  // hint: optional { predicted_salt: '...' } from the AI parser.
  // If brand fuzzy fails, we try matching the predicted salt against db salts.
  fuzzyMatch(rawName, hint) {
    if (!rawName || !this._loaded && this.medicines.length === 0) return null;
    const queryNorm = normalizeName(rawName);
    if (!queryNorm) return null;
    const queryStrength = extractStrength(rawName);
    const ocrQueries = this._ocrVariants(queryNorm);

    let best = null;
    let bestScore = 0;

    for (let i = 0; i < this.medicines.length; i++) {
      const candidateNorm = this.brandNamesNormalized[i];
      const candidateFull = this.brandNames[i];
      if (!candidateNorm) continue;

      // Take the best score across all OCR variants of the query
      let score = 0;
      for (const q of ocrQueries) {
        const r1 = ratio(q, candidateNorm);
        const r2 = partialRatio(q, candidateNorm);
        const r3 = tokenSetRatio(q, candidateNorm);
        const s = Math.max(r1, r2, r3);
        if (s > score) score = s;
      }

      // Bonus when strengths match — even handwritten "650" is a strong signal
      if (queryStrength && this.medicines[i].strength) {
        const candidateStrength = extractStrength(this.medicines[i].strength);
        if (candidateStrength === queryStrength) score = Math.min(100, score + 8);
      }
      // Bonus when AI predicted a salt and the db medicine matches that salt
      if (hint && hint.predicted_salt && this.medicines[i].salt_composition) {
        const hintSalt = String(hint.predicted_salt).toLowerCase();
        const candSalt = this.medicines[i].salt_composition.toLowerCase();
        if (hintSalt && (candSalt.includes(hintSalt) || hintSalt.includes(candSalt.split('+')[0].trim()))) {
          score = Math.min(100, score + 6);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = {
          brand_matched: candidateFull,
          salt_composition: this.medicines[i].salt_composition,
          strength_db: this.medicines[i].strength,
          manufacturer: this.medicines[i].manufacturer,
          type: this.medicines[i].type,
          schedule: this.medicines[i].schedule,
          match_score: score,
          status: score >= AUTO_MATCH_THRESHOLD ? 'matched' : (score >= MIN_MATCH_CONFIDENCE ? 'review' : 'auto')
        };
      }
    }

    // If brand match is too weak, fall back to salt-only matching using the
    // AI-predicted salt as the search key. Returns the first/best brand in the
    // db with that exact salt — gives the patient at least a usable match.
    if ((!best || bestScore < MIN_MATCH_CONFIDENCE) && hint && hint.predicted_salt) {
      const hintSalt = String(hint.predicted_salt).toLowerCase().trim();
      for (let i = 0; i < this.medicines.length; i++) {
        const m = this.medicines[i];
        const sc = (m.salt_composition || '').toLowerCase();
        if (!sc) continue;
        if (sc === hintSalt || sc.includes(hintSalt) || hintSalt.includes(sc.split('+')[0].trim())) {
          return {
            brand_matched: m.brand_name,
            salt_composition: m.salt_composition,
            strength_db: m.strength,
            manufacturer: m.manufacturer,
            type: m.type,
            schedule: m.schedule,
            match_score: 70,                 // moderate confidence — salt-only
            status: 'salt_fallback'
          };
        }
      }
    }

    if (!best || bestScore < MIN_MATCH_CONFIDENCE) return null;
    return best;
  }

  search(query, limit = 20) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    const results = [];
    for (const med of this.medicines) {
      const haystack = `${med.brand_name} ${med.salt_composition} ${med.manufacturer}`.toLowerCase();
      if (haystack.includes(q)) results.push(med);
      if (results.length >= limit) break;
    }
    return results;
  }

  findSubstitutes(brandName, limit = 10) {
    const match = this.fuzzyMatch(brandName);
    if (!match) return [];
    const targetSalt = (match.salt_composition || '').toLowerCase();
    if (!targetSalt) return [];
    return this.medicines
      .filter(m =>
        m.brand_name.toLowerCase() !== match.brand_matched.toLowerCase() &&
        m.salt_composition.toLowerCase() === targetSalt
      )
      .slice(0, limit);
  }
}

let _instance = null;
function getMedicineDB() {
  if (!_instance) _instance = new MedicineDB();
  return _instance;
}

module.exports = { MedicineDB, getMedicineDB };
