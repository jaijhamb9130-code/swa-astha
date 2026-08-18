#!/usr/bin/env node
// ============================================
// SEED PHARMACIES + INVENTORY
// Creates ~10 demo pharmacies around Jaipur and distributes all 1200+
// medicines from the CSV across them with randomized realistic pricing.
//
// Re-running this script is safe — it upserts pharmacies by ownerPhone and
// only inserts batches if the pharmacy currently has 0 batches.
//
// Usage:
//   cd backend
//   node scripts/seedPharmaciesAndInventory.js
// ============================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Pharmacy = require('../models/Pharmacy.model');
const Batch = require('../models/Batch.model');

const CSV_PATH = path.join(__dirname, '..', 'data', 'indian_medicines.csv');

// ── Demo pharmacies centred around Jaipur (26.91, 75.79) ────────────
// Coordinates are scattered within ~5 km so the patient app (which uses
// browser geolocation in this area) will pick them up in /pharmacy/find.
const DEMO_PHARMACIES = [
  { name: 'Apollo Pharmacy — MI Road',         ownerName: 'Rakesh Mehta',  ownerPhone: '9000000001', license: 'RJ-DL-10001', street: 'Shop 12, MI Road',           city: 'Jaipur', state: 'Rajasthan', pincode: '302001', lat: 26.9162, lng: 75.8138 },
  { name: 'MedPlus — C-Scheme',                 ownerName: 'Pooja Sharma',  ownerPhone: '9000000002', license: 'RJ-DL-10002', street: 'Plot 7, C-Scheme',          city: 'Jaipur', state: 'Rajasthan', pincode: '302001', lat: 26.9077, lng: 75.8003 },
  { name: 'Wellness Forever — Malviya Nagar',   ownerName: 'Anil Saini',    ownerPhone: '9000000003', license: 'RJ-DL-10003', street: 'Sector 4, Malviya Nagar',   city: 'Jaipur', state: 'Rajasthan', pincode: '302017', lat: 26.8537, lng: 75.8085 },
  { name: 'Netmeds Store — Vaishali Nagar',     ownerName: 'Sunita Verma',  ownerPhone: '9000000004', license: 'RJ-DL-10004', street: 'Vaishali Marg',             city: 'Jaipur', state: 'Rajasthan', pincode: '302021', lat: 26.9114, lng: 75.7424 },
  { name: 'PharmEasy — Mansarovar',             ownerName: 'Vikram Bhati',  ownerPhone: '9000000005', license: 'RJ-DL-10005', street: 'Sector 10, Mansarovar',     city: 'Jaipur', state: 'Rajasthan', pincode: '302020', lat: 26.8512, lng: 75.7610 },
  { name: 'Frank Ross — Raja Park',             ownerName: 'Meena Joshi',   ownerPhone: '9000000006', license: 'RJ-DL-10006', street: 'Raja Park Main Road',       city: 'Jaipur', state: 'Rajasthan', pincode: '302004', lat: 26.8993, lng: 75.8273 },
  { name: 'Sai Medical Store — Tonk Road',      ownerName: 'Pankaj Gupta',  ownerPhone: '9000000007', license: 'RJ-DL-10007', street: 'B-Block, Tonk Road',        city: 'Jaipur', state: 'Rajasthan', pincode: '302015', lat: 26.8753, lng: 75.8082 },
  { name: 'Surya Pharma — Sodala',              ownerName: 'Ravi Khandelwal',ownerPhone: '9000000008', license: 'RJ-DL-10008', street: 'Main Road, Sodala',         city: 'Jaipur', state: 'Rajasthan', pincode: '302019', lat: 26.8930, lng: 75.7762 },
  { name: 'Health Hub — Jagatpura',             ownerName: 'Nidhi Rathore', ownerPhone: '9000000009', license: 'RJ-DL-10009', street: 'JECRC Wall, Jagatpura',     city: 'Jaipur', state: 'Rajasthan', pincode: '302017', lat: 26.8407, lng: 75.8506 },
  { name: '24x7 Chemist — Bani Park',           ownerName: 'Deepak Mishra', ownerPhone: '9000000010', license: 'RJ-DL-10010', street: 'Collectorate Rd, Bani Park',city: 'Jaipur', state: 'Rajasthan', pincode: '302016', lat: 26.9296, lng: 75.7918 }
];

// ── Parsing helpers ─────────────────────────────────────────────────
function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadMedicines() {
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = parseCSVLine(lines[0]);
  const i = (name) => header.indexOf(name);
  const iBrand = i('brand_name'), iSalt = i('salt_composition'), iStrength = i('strength'),
        iMfr = i('manufacturer'), iType = i('type');
  const meds = [];
  for (let li = 1; li < lines.length; li++) {
    const c = parseCSVLine(lines[li]);
    const brand = (c[iBrand] || '').trim();
    if (!brand) continue;
    meds.push({
      brand_name: brand,
      salt_composition: (c[iSalt] || '').trim(),
      strength: (c[iStrength] || '').trim(),
      manufacturer: (c[iMfr] || '').trim(),
      type: (c[iType] || '').trim()
    });
  }
  return meds;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickMRP(strength) {
  // Try to derive a sensible MRP from the strength. Otherwise fall back to a
  // random plausible value. Indian retail medicines are ₹5–₹500 mostly.
  const m = String(strength || '').match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (n <= 1) return rand(20, 60);
    if (n <= 50) return rand(15, 80);
    if (n <= 250) return rand(20, 120);
    if (n <= 650) return rand(25, 200);
    return rand(40, 350);
  }
  return rand(15, 250);
}

function makeBatchNumber(prefix, i) {
  return `${prefix}-B${String(i).padStart(4, '0')}`;
}

function futureExpiry(monthsMin, monthsMax) {
  const months = rand(monthsMin, monthsMax);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

// ── Main ────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swaastha');
  console.log('✅ Connected to MongoDB');

  if (!fs.existsSync(CSV_PATH)) {
    console.error('❌ CSV not found at ' + CSV_PATH);
    process.exit(1);
  }
  const allMeds = loadMedicines();
  console.log(`📚 Loaded ${allMeds.length} medicines from CSV`);

  let created = 0, updated = 0, batchesInserted = 0;

  for (const p of DEMO_PHARMACIES) {
    // Upsert pharmacy (auto-approved so patients can see them immediately)
    let pharmacy = await Pharmacy.findOne({ ownerPhone: p.ownerPhone });
    if (!pharmacy) {
      pharmacy = new Pharmacy({
        name: p.name,
        ownerName: p.ownerName,
        ownerPhone: p.ownerPhone,
        email: p.ownerName.toLowerCase().replace(/\s+/g, '.') + '@swa-demo.in',
        licenseNumber: p.license,
        address: { street: p.street, city: p.city, state: p.state, pincode: p.pincode },
        location: { type: 'Point', coordinates: [p.lng, p.lat] },
        isVerified: true,
        verificationStatus: 'approved',
        verifiedAt: new Date(),
        isActive: true,
        lastLogin: new Date()
      });
      await pharmacy.save();
      created++;
      console.log(`  + Created ${p.name} (${pharmacy.pharmacyId})`);
    } else {
      // Make sure the demo pharmacy stays verified + coords up to date
      pharmacy.isVerified = true;
      pharmacy.verificationStatus = 'approved';
      pharmacy.verifiedAt = pharmacy.verifiedAt || new Date();
      pharmacy.location = { type: 'Point', coordinates: [p.lng, p.lat] };
      await pharmacy.save();
      updated++;
      console.log(`  ~ Updated ${p.name} (${pharmacy.pharmacyId})`);
    }

    // If this pharmacy already has batches, skip inventory seeding for it
    const existing = await Batch.countDocuments({ pharmacy: pharmacy._id });
    if (existing > 0) {
      console.log(`     ↳ already has ${existing} batches — skipping inventory seed`);
      continue;
    }

    // Pick a random subset of medicines: 400–700 brands per pharmacy.
    // Pharmacies don't stock every medicine — overlap is realistic.
    const stockSize = rand(400, 700);
    const shuffled = [...allMeds].sort(() => Math.random() - 0.5).slice(0, stockSize);

    const batches = shuffled.map((m, i) => {
      const mrp = pickMRP(m.strength);
      // Most pharmacies sell slightly below MRP. Some sell at MRP.
      const discount = Math.random() < 0.6 ? rand(2, 18) : 0;
      const sellingPrice = Math.max(1, mrp - discount);
      return {
        pharmacy: pharmacy._id,
        brandName: m.brand_name,
        salt: m.salt_composition,
        strength: m.strength,
        manufacturer: m.manufacturer || 'Generic',
        batchNumber: makeBatchNumber(pharmacy.pharmacyId, i),
        quantity: rand(20, 300),
        mrp,
        sellingPrice,
        expiryDate: futureExpiry(12, 36),
        supplier: 'Demo Distributor'
      };
    });
    await Batch.insertMany(batches);
    batchesInserted += batches.length;
    console.log(`     ↳ inserted ${batches.length} batches`);
  }

  console.log('');
  console.log('════════════════════════════════════════');
  console.log(`✓ Pharmacies created: ${created}`);
  console.log(`✓ Pharmacies updated: ${updated}`);
  console.log(`✓ Batches inserted:   ${batchesInserted}`);
  console.log(`✓ Total pharmacies in DB: ${await Pharmacy.countDocuments()}`);
  console.log(`✓ Total batches in DB:    ${await Batch.countDocuments()}`);
  console.log('════════════════════════════════════════');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
