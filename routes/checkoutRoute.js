const express = require('express');
const router = express.Router();
const CheckoutController = require('../controllers/checkoutController');

// POST /api/checkout/session - Create checkout session
router.post('/session', CheckoutController.createSession);

// GET /api/checkout/verify/:sessionId - Verify payment
router.get('/verify/:sessionId', CheckoutController.verifySession);

module.exports = router;

