const OTP = require('../models/OTP.model');

/**
 * Send OTP via SMS (console in development, Twilio in production)
 * @param {String} phone - Phone number
 * @param {String} otp - OTP code
 */
const sendOTPviaSMS = async (phone, otp) => {
  // In development, just log to console
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n📱 OTP for ${phone}: ${otp}`);
    console.log(`⏰ Valid for 10 minutes\n`);
    return { success: true, message: 'OTP sent (development mode)' };
  }
  
  // In production, use Twilio
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }
    
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    // Format phone number (add country code if not present)
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      // Default to India (+91) if no country code
      formattedPhone = `+91${phone}`;
    }
    
    await client.messages.create({
      body: `Your SwaAstha verification code is: ${otp}. Valid for 10 minutes. Do not share with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('SMS Error:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
};

/**
 * Generate and send OTP
 * @param {String} phone - Phone number
 * @param {String} purpose - Purpose of OTP (registration, login, etc.)
 * @returns {Object} Result with OTP (in development) or success message
 */
const generateAndSendOTP = async (phone, purpose = 'registration') => {
  try {
    // Generate OTP and save to database
    const otpDoc = await OTP.generateOTP(phone, purpose);
    
    // Send OTP via SMS
    const smsResult = await sendOTPviaSMS(phone, otpDoc.otp);

    // In development, return the OTP for easy testing
    if (process.env.NODE_ENV !== 'production') {
      return {
        success: true,
        message: 'OTP sent successfully',
        otp: otpDoc.otp // Only in development
      };
    }

    return smsResult;
  } catch (error) {
    console.error('Generate OTP Error:', error);
    throw error;
  }
};

/**
 * Verify OTP
 * @param {String} phone - Phone number
 * @param {String} otp - OTP to verify
 * @param {String} purpose - Purpose of OTP
 * @returns {Object} Verification result
 */
const verifyOTP = async (phone, otp, purpose = 'registration') => {
  try {
    const result = await OTP.verifyOTP(phone, otp, purpose);
    return result;
  } catch (error) {
    console.error('Verify OTP Error:', error);
    throw error;
  }
};

module.exports = {
  generateAndSendOTP,
  verifyOTP,
  sendOTPviaSMS
};
