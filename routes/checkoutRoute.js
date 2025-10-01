const express = require('express');
const router = express.Router();
const StripeService = require('../services/stripeService');
const CustomerService = require('../services/customerService');
const OrderService = require('../services/orderService');

/**
 * POST /api/checkout/session
 * Create a Stripe Checkout session for event tickets/donations
 */
router.post('/session', async (req, res) => {
  try {
    const { event, amount, metadata = {} } = req.body;

    // Validate
    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    if (!metadata.email || !metadata.name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Find or create customer
    const customer = await CustomerService.findOrCreateCustomer(metadata);

    // Create Stripe checkout session
    const session = await StripeService.createCheckoutSession({
      event,
      amount,
      metadata: {
        ...metadata,
        customerId: customer.id,
      }
    });

    // Create order record
    await OrderService.createOrder({
      customerId: customer.id,
      stripeSessionId: session.id,
      amount: amount || 2500,
      event,
      eventName: metadata.eventName || 'Bros & Brews - A Night of Impact',
      type: metadata.type || 'ticket',
      email: metadata.email,
      name: metadata.name,
      ao: metadata.ao,
      region: metadata.region || 'DMV',
      paxName: metadata.paxName,
      metadata,
    });

    // Return client secret for embedded checkout
    res.json({ 
      clientSecret: session.client_secret,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

/**
 * GET /api/checkout/verify/:sessionId
 * Verify a checkout session
 */
router.get('/verify/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await StripeService.retrieveSession(sessionId);
    
    if (session.payment_status === 'paid') {
      res.json({
        success: true,
        amount: session.amount_total,
        event: session.metadata.event,
        customerEmail: session.customer_details?.email,
      });
    } else {
      res.json({
        success: false,
        status: session.payment_status,
      });
    }
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ 
      error: 'Failed to verify session' 
    });
  }
});

module.exports = router;
