require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const HealthRecord = require('../models/HealthRecord.model');
const PharmacyOrder = require('../models/Order.model');
const Medicine = require('../models/Medicine.model');

// Sample medicines data
const sampleMedicines = [
  // Blood Pressure
  { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'bp', use: 'High Blood Pressure', dose: '1 tablet daily', price: '₹45', numPrice: 45, popularity: 90, manufacturer: 'Cipla', searchKeywords: ['bp', 'blood pressure', 'hypertension'] },
  { name: 'Telmisartan 40mg', genericName: 'Telmisartan', category: 'bp', use: 'Hypertension', dose: '1 tablet daily', price: '₹120', numPrice: 120, popularity: 85, manufacturer: 'Dr. Reddys', searchKeywords: ['bp', 'blood pressure'] },
  
  // Fever & Pain
  { name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'fever', use: 'Fever, Pain relief', dose: '1-2 tablets every 6 hours', price: '₹25', numPrice: 25, popularity: 100, manufacturer: 'Mankind', searchKeywords: ['fever', 'pain', 'headache'] },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'pain', use: 'Pain, Inflammation', dose: '1 tablet 3 times daily', price: '₹40', numPrice: 40, popularity: 95, searchKeywords: ['pain', 'inflammation'] },
  { name: 'Dolo 650mg', genericName: 'Paracetamol', category: 'fever', use: 'Fever, Body ache', dose: '1 tablet when needed', price: '₹30', numPrice: 30, popularity: 98, searchKeywords: ['fever', 'dolo'] },
  
  // Cold & Flu
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'cold', use: 'Allergies, Cold', dose: '1 tablet daily at bedtime', price: '₹15', numPrice: 15, popularity: 92, searchKeywords: ['cold', 'allergy', 'sneezing'] },
  { name: 'Sinarest Tablet', genericName: 'Paracetamol + Chlorpheniramine', category: 'cold', use: 'Cold, Flu symptoms', dose: '1 tablet 3 times daily', price: '₹50', numPrice: 50, popularity: 88, searchKeywords: ['cold', 'flu', 'sinarest'] },
  
  // Diabetes
  { name: 'Metformin 500mg', genericName: 'Metformin', category: 'diabetes', use: 'Type 2 Diabetes', dose: '1 tablet twice daily with meals', price: '₹55', numPrice: 55, popularity: 93, searchKeywords: ['diabetes', 'sugar'] },
  { name: 'Glimepiride 1mg', genericName: 'Glimepiride', category: 'diabetes', use: 'Blood sugar control', dose: '1 tablet before breakfast', price: '₹65', numPrice: 65, popularity: 80, searchKeywords: ['diabetes', 'sugar'] },
  
  // Acidity
  { name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', category: 'acidity', use: 'Acidity, GERD', dose: '1 tablet before breakfast', price: '₹70', numPrice: 70, popularity: 90, searchKeywords: ['acidity', 'gas', 'heartburn'] },
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'acidity', use: 'Acid reflux, Ulcers', dose: '1 capsule daily', price: '₹60', numPrice: 60, popularity: 87, searchKeywords: ['acidity', 'ulcer'] },
  { name: 'Digene Tablet', genericName: 'Antacid', category: 'acidity', use: 'Heartburn, Indigestion', dose: '1-2 tablets after meals', price: '₹35', numPrice: 35, popularity: 95, searchKeywords: ['acidity', 'digene', 'gas'] },
  
  // Heart & Cholesterol
  { name: 'Atorvastatin 10mg', genericName: 'Atorvastatin', category: 'heart', use: 'High Cholesterol', dose: '1 tablet at night', price: '₹90', numPrice: 90, popularity: 88, searchKeywords: ['cholesterol', 'heart'] },
  { name: 'Aspirin 75mg', genericName: 'Aspirin', category: 'heart', use: 'Heart attack prevention', dose: '1 tablet daily', price: '₹45', numPrice: 45, popularity: 85, prescription: true, searchKeywords: ['heart', 'aspirin'] },
  
  // Vitamins
  { name: 'Vitamin D3 60K IU', genericName: 'Cholecalciferol', category: 'vitamins', use: 'Vitamin D deficiency', dose: '1 sachet weekly', price: '₹55', numPrice: 55, popularity: 92, searchKeywords: ['vitamin', 'vitamin d'] },
  { name: 'Calcium + Vitamin D', genericName: 'Calcium Carbonate', category: 'vitamins', use: 'Bone health', dose: '1 tablet daily', price: '₹85', numPrice: 85, popularity: 87, searchKeywords: ['calcium', 'bone', 'vitamin'] },
  { name: 'Multivitamin Capsule', genericName: 'Multivitamins', category: 'vitamins', use: 'Overall health', dose: '1 capsule daily', price: '₹120', numPrice: 120, popularity: 90, searchKeywords: ['vitamin', 'multivitamin'] },
  
  // Antibiotics
  { name: 'Azithromycin 500mg', genericName: 'Azithromycin', category: 'antibiotics', use: 'Bacterial infections', dose: '1 tablet daily', price: '₹150', numPrice: 150, popularity: 83, prescription: true, searchKeywords: ['antibiotic', 'infection'] },
  { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'antibiotics', use: 'Bacterial infections', dose: '1 capsule 3 times daily', price: '₹80', numPrice: 80, popularity: 85, prescription: true, searchKeywords: ['antibiotic', 'infection'] },
  
  // Thyroid
  { name: 'Thyroxine 50mcg', genericName: 'Levothyroxine', category: 'thyroid', use: 'Hypothyroidism', dose: '1 tablet before breakfast', price: '₹75', numPrice: 75, popularity: 85, searchKeywords: ['thyroid'] },
  
  // Skin
  { name: 'Betamethasone Cream', genericName: 'Betamethasone', category: 'skin', use: 'Skin inflammation, Rashes', dose: 'Apply thin layer twice daily', price: '₹110', numPrice: 110, popularity: 75, searchKeywords: ['skin', 'rash', 'cream'] },
  
  // Eye
  { name: 'Refresh Tears Eye Drops', genericName: 'Carboxymethylcellulose', category: 'eye', use: 'Dry eyes', dose: '1-2 drops as needed', price: '₹140', numPrice: 140, popularity: 82, searchKeywords: ['eye', 'dry eyes', 'drops'] }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swaastha', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🗑️  Clearing existing data...');
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await HealthRecord.deleteMany({});
    await PharmacyOrder.deleteMany({});
    await Medicine.deleteMany({});
    
    console.log('\n💊 Creating medicines...');
    const medicines = await Medicine.insertMany(sampleMedicines);
    console.log(`✅ Created ${medicines.length} medicines`);
    
    console.log('\n👤 Creating sample patients...');
    const samplePatients = [
      { patientId: 'SWA-100001', name: 'Rajesh Kumar', age: 35, phone: '9876543210', email: 'rajesh@example.com', gender: 'male', bloodGroup: 'O+', isVerified: true },
      { patientId: 'SWA-100002', name: 'Priya Sharma', age: 28, phone: '9876543211', email: 'priya@example.com', gender: 'female', bloodGroup: 'A+', isVerified: true },
      { patientId: 'SWA-100003', name: 'Amit Patel', age: 42, phone: '9876543212', email: 'amit@example.com', gender: 'male', bloodGroup: 'B+', isVerified: true }
    ];
    const patients = await Patient.insertMany(samplePatients);
    console.log(`✅ Created ${patients.length} patients`);
    patients.forEach(p => console.log(`   - ${p.name} (${p.patientId}) - Phone: ${p.phone}`));
    
    console.log('\n👨‍⚕️ Creating sample doctors...');
    const sampleDoctors = [
      { name: 'Dr. Sarah Johnson', phone: '9123456789', email: 'dr.sarah@example.com', registrationNumber: 'MED123456', specialization: 'Cardiology', degree: 'MBBS, MD (Cardiology)', experience: '10 years', clinicName: 'Heart Care Clinic', city: 'Mumbai', gender: 'female', isVerified: true, verificationStatus: 'approved' },
      { name: 'Dr. Arjun Reddy', phone: '9123456790', email: 'dr.arjun@example.com', registrationNumber: 'MED123457', specialization: 'General Medicine', degree: 'MBBS, MD', experience: '8 years', clinicName: 'City General Hospital', city: 'Delhi', gender: 'male', isVerified: true, verificationStatus: 'approved' }
    ];
    const doctors = await Doctor.insertMany(sampleDoctors);
    console.log(`✅ Created ${doctors.length} doctors`);
    doctors.forEach(d => console.log(`   - ${d.name} (${d.specialization}) - Phone: ${d.phone}`));
    
    if (patients.length > 0 && doctors.length > 0) {
      console.log('\n📋 Creating sample health records...');
      const sampleRecords = [
        { patient: patients[0]._id, patientId: patients[0].patientId, title: 'Complete Blood Count (CBC)', category: 'report', type: 'blood-test', source: 'reports', doctor: doctors[0]._id, doctorNotes: 'All parameters within normal range' },
        { patient: patients[0]._id, patientId: patients[0].patientId, title: 'Chest X-Ray', category: 'scan', type: 'scan', source: 'reports', doctor: doctors[0]._id, doctorNotes: 'No abnormalities detected' }
      ];
      const records = await HealthRecord.insertMany(sampleRecords);
      console.log(`✅ Created ${records.length} health records`);
    }
    
    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📝 Quick Reference:');
    console.log('   Patient Phones: 9876543210, 9876543211, 9876543212');
    console.log('   Doctor Phones: 9123456789, 9123456790');
    console.log(`   Medicines: ${medicines.length} available`);
    console.log('   Test OTP: Any 6-digit number\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

seedDatabase();
