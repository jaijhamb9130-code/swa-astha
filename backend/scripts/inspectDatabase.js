const mongoose = require('mongoose');
const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const HealthRecord = require('../models/HealthRecord.model');
const Order = require('../models/Order.model');
const Medicine = require('../models/Medicine.model');

async function inspect() {
  try {
    await mongoose.connect('mongodb://localhost:27017/swaastha');
    console.log('\n======================================================');
    console.log('📊 SWA-ASTHA DATABASE INSPECTION SUMMARY');
    console.log('======================================================');
    console.log(`Database Name: swaastha`);
    console.log(`Host:          localhost:27017`);
    console.log('------------------------------------------------------');

    const collections = [
      { name: 'Patients', model: Patient },
      { name: 'Doctors', model: Doctor },
      { name: 'HealthRecords', model: HealthRecord },
      { name: 'Orders (Pharmacy)', model: Order },
      { name: 'Medicines (CSV Seeded)', model: Medicine }
    ];

    for (const col of collections) {
      const count = await col.model.countDocuments();
      console.log(`📂 Collection: ${col.name.padEnd(22)} 🔢 Count: ${count}`);
    }

    console.log('\n======================================================');
    console.log('👤 SEEDED PATIENTS (Sample Records)');
    console.log('======================================================');
    const patients = await Patient.find({}).limit(5);
    patients.forEach(p => {
      console.log(`🆔 ID: ${p.patientId} | 👤 Name: ${p.name.padEnd(15)} | 📞 Phone: ${p.phone} | 🩸 Blood: ${p.bloodGroup || 'N/A'}`);
    });

    console.log('\n======================================================');
    console.log('👨‍⚕️ SEEDED DOCTORS (Sample Records)');
    console.log('======================================================');
    const doctors = await Doctor.find({}).limit(5);
    doctors.forEach(d => {
      console.log(`🩺 Name: ${d.name.padEnd(20)} | 📞 Phone: ${d.phone} | 🎓 Specialization: ${d.specialization}`);
    });

    console.log('\n======================================================');
    console.log('📋 SAMPLE HEALTH RECORDS');
    console.log('======================================================');
    const records = await HealthRecord.find({}).limit(2);
    records.forEach(r => {
      console.log(`📄 Title: ${r.title} | 🏷️ Type: ${r.type} | 🧑‍⚕️ Doctor Notes: ${r.doctorNotes}`);
    });

    console.log('======================================================\n');
  } catch (err) {
    console.error('Inspection Error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

inspect();
