const mongoose = require('mongoose');
const Patient = require('./models/Patient.model');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swaastha');
    const user = await Patient.findOne({ phone: '7976421414' });
    console.log('User found:', user ? user.toSafeObject() : 'null');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkUser();
