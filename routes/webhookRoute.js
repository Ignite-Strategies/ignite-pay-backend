const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');

// POST /api/webhook/stripe - Handle Stripe webhooks
router.post('/stripe', WebhookController.handleStripe);

module.exports = router;

