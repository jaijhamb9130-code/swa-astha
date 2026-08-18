const Razorpay = require('razorpay');

let _client = null;

function getRazorpay() {
  if (_client) return _client;
  const keyId = process.env.RAZORPAY_KEY || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  _client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _client;
}

function isConfigured() {
  return Boolean((process.env.RAZORPAY_KEY || process.env.RAZORPAY_KEY_ID) &&
                 (process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET));
}

module.exports = { getRazorpay, isConfigured };
