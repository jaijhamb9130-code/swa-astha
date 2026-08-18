const express = require('express');
const router = express.Router();
const { getMedicineDB } = require('../services/medicineDatabase');

// Salt-based category classifier — maps salt-composition keywords to one of the
// 12 frontend categories. First match wins; unmatched falls into 'other'.
const CATEGORY_RULES = [
  ['bp',          ['amlodipine', 'losartan', 'telmisartan', 'olmesartan', 'enalapril', 'ramipril', 'lisinopril', 'metoprolol', 'atenolol', 'bisoprolol', 'valsartan', 'irbesartan', 'nifedipine', 'nebivolol', 'hydrochlorothiazide', 'chlorthalidone', 'indapamide']],
  ['heart',       ['atorvastatin', 'rosuvastatin', 'simvastatin', 'clopidogrel', 'aspirin', 'warfarin', 'apixaban', 'rivaroxaban', 'isosorbide', 'digoxin', 'amiodarone']],
  ['diabetes',    ['metformin', 'glimepiride', 'gliclazide', 'glipizide', 'sitagliptin', 'vildagliptin', 'teneligliptin', 'empagliflozin', 'dapagliflozin', 'insulin', 'pioglitazone', 'voglibose', 'acarbose']],
  ['acidity',     ['pantoprazole', 'omeprazole', 'esomeprazole', 'rabeprazole', 'lansoprazole', 'ranitidine', 'famotidine', 'sucralfate', 'antacid', 'aluminium hydroxide', 'magnesium hydroxide', 'simethicone', 'domperidone']],
  ['antibiotics', ['amoxicillin', 'clavulanic', 'azithromycin', 'cefixime', 'cefuroxime', 'ciprofloxacin', 'levofloxacin', 'ofloxacin', 'doxycycline', 'metronidazole', 'clarithromycin', 'cefpodoxime', 'cefdinir', 'ceftriaxone', 'penicillin', 'erythromycin']],
  ['cold',        ['cetirizine', 'levocetirizine', 'fexofenadine', 'loratadine', 'phenylephrine', 'pseudoephedrine', 'chlorpheniramine', 'montelukast', 'ambroxol', 'bromhexine', 'guaifenesin', 'dextromethorphan', 'oseltamivir']],
  ['fever',       ['paracetamol', 'acetaminophen', 'ibuprofen', 'nimesulide', 'mefenamic']],
  ['pain',        ['diclofenac', 'aceclofenac', 'naproxen', 'ketorolac', 'tramadol', 'piroxicam', 'etoricoxib', 'serratiopeptidase', 'thiocolchicoside']],
  ['thyroid',     ['levothyroxine', 'thyroxine', 'carbimazole', 'methimazole', 'propylthiouracil']],
  ['vitamins',    ['vitamin', 'cyanocobalamin', 'cholecalciferol', 'methylcobalamin', 'folic acid', 'iron', 'ferrous', 'calcium carbonate', 'multivitamin', 'biotin', 'zinc', 'magnesium', 'b12', 'b-complex']],
  ['skin',        ['clotrimazole', 'terbinafine', 'fluconazole', 'mupirocin', 'fusidic', 'permethrin', 'tretinoin', 'adapalene', 'clindamycin', 'isotretinoin', 'betamethasone', 'hydrocortisone', 'calamine']],
  ['eye',         ['moxifloxacin', 'tobramycin', 'olopatadine', 'ketotifen', 'timolol', 'latanoprost', 'brimonidine', 'carboxymethylcellulose', 'tropicamide']]
];

function classify(salt) {
  if (!salt) return 'other';
  const s = salt.toLowerCase();
  for (const [cat, keys] of CATEGORY_RULES) {
    for (const k of keys) {
      if (s.includes(k)) return cat;
    }
  }
  return 'other';
}

// Decorate a CSV record with the shape PharmacyScreen.jsx expects
function shape(med) {
  const cat = classify(med.salt_composition);
  return {
    name: med.brand_name,
    salt: med.salt_composition,
    use: med.salt_composition,
    strength: med.strength,
    dose: med.strength,
    manufacturer: med.manufacturer,
    type: med.type,
    schedule: med.schedule,
    category: cat,
    inStock: true,
    price: med.schedule === 'OTC' ? '₹ OTC' : '₹ Rx'
  };
}

const CATEGORY_META = [
  { id: 'bp',          name: 'Blood Pressure',         icon: '🫀', color: '#EF5350' },
  { id: 'fever',       name: 'Fever',                  icon: '🌡️', color: '#FF7043' },
  { id: 'cold',        name: 'Cold & Flu',             icon: '🤧', color: '#42A5F5' },
  { id: 'diabetes',    name: 'Diabetes',               icon: '💉', color: '#AB47BC' },
  { id: 'pain',        name: 'Pain Relief',            icon: '💪', color: '#EC407A' },
  { id: 'acidity',     name: 'Acidity',                icon: '🔥', color: '#26A69A' },
  { id: 'antibiotics', name: 'Antibiotics',            icon: '🧬', color: '#5C6BC0' },
  { id: 'heart',       name: 'Heart & Cholesterol',    icon: '❤️', color: '#E91E63' },
  { id: 'vitamins',    name: 'Vitamins & Supplements', icon: '🌿', color: '#66BB6A' },
  { id: 'thyroid',     name: 'Thyroid',                icon: '🦋', color: '#FF8A65' },
  { id: 'skin',        name: 'Skin Care',              icon: '🧴', color: '#8D6E63' },
  { id: 'eye',         name: 'Eye & Ear',              icon: '👁️', color: '#29B6F6' }
];

let _byCategoryCache = null;
function buildCategoryCache() {
  if (_byCategoryCache) return _byCategoryCache;
  const db = getMedicineDB();
  const buckets = { other: [] };
  for (const cat of CATEGORY_META) buckets[cat.id] = [];
  for (const m of db.medicines) {
    const cat = classify(m.salt_composition);
    buckets[cat].push(m);
  }
  _byCategoryCache = buckets;
  return buckets;
}

/**
 * @route   GET /api/medicines/categories
 */
router.get('/categories', (req, res) => {
  try {
    const buckets = buildCategoryCache();
    const categories = CATEGORY_META.map(cat => {
      const meds = (buckets[cat.id] || []).slice(0, 5).map(shape);
      return {
        ...cat,
        medicines: meds,
        count: (buckets[cat.id] || []).length
      };
    });
    res.json({ success: true, categories });
  } catch (err) {
    console.error('Get Categories Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

/**
 * @route   GET /api/medicines/popular?limit=10
 */
router.get('/popular', (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
    const db = getMedicineDB();
    const medicines = db.medicines.slice(0, limit).map(shape);
    res.json({ success: true, medicines });
  } catch (err) {
    console.error('Get Popular Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch popular medicines' });
  }
});

/**
 * @route   GET /api/medicines/search?q=...&category=...&limit=20
 */
router.get('/search', (req, res) => {
  try {
    const { q, category } = req.query;
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, query: q || '', count: 0, results: [], medicines: [] });
    }

    const db = getMedicineDB();
    let raw = db.search(q.trim(), 100);
    let shaped = raw.map(shape);
    if (category) shaped = shaped.filter(m => m.category === category);
    const results = shaped.slice(0, limit);

    // Return both `results` (what PharmacyScreen.jsx reads) and `medicines` (legacy callers)
    res.json({
      success: true,
      query: q,
      count: results.length,
      results,
      medicines: results
    });
  } catch (err) {
    console.error('Search Medicine Error:', err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

/**
 * @route   GET /api/medicines/category/:categoryId?limit=50
 */
router.get('/category/:categoryId', (req, res) => {
  try {
    const { categoryId } = req.params;
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const buckets = buildCategoryCache();
    const items = (buckets[categoryId] || []).slice(0, limit).map(shape);
    res.json({
      success: true,
      category: categoryId,
      count: items.length,
      medicines: items,
      results: items
    });
  } catch (err) {
    console.error('Get Category Medicines Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch medicines' });
  }
});

module.exports = router;
