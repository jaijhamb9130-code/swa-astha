const router = require('express').Router();
const { getRazorpay, isConfigured } = require('../services/payment');

router.post('/create-payment', async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Payments not configured. Set RAZORPAY_KEY and RAZORPAY_SECRET in .env',
      code: 'PAYMENTS_NOT_CONFIGURED'
    });
  }
  try {
    const { amount } = req.body || {};
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'amount (in INR) required' });
    }
    const client = getRazorpay();
    const order = await client.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR'
    });
    res.json({ success: true, order });
  } catch (err) {
    console.error('Razorpay Create Order Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
});

module.exports = router;