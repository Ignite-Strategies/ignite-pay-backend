const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/checkout/session
 * Create a Stripe Checkout session for event tickets/donations
 */
router.post('/session', async (req, res) => {
  try {
    const { event, amount, priceId, metadata = {} } = req.body;

    // Validate required fields
    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    // Event configuration
    const eventConfig = {
      brosandbrews: {
        name: '🍻 Bros & Brews - A Night of Impact',
        description: 'Supporting F3 Nation\'s Accelerate Campaign',
        images: ['https://highimpactevents.com/assets/brosandbrews.jpg'],
        // Optional: Pre-created Stripe Price ID for fixed-price ticket
        priceId: process.env.STRIPE_PRICE_BROSANDBREWS_TICKET || null,
      },
      // Add more events here as needed
    };

    const config = eventConfig[event.toLowerCase()];
    
    if (!config) {
      return res.status(400).json({ error: 'Invalid event name' });
    }

    // Use the fixed $25 Bros & Brews ticket price
    const lineItems = [{
      price: 'price_1SDCslJ80nlgpHNNqajMMKvQ', // $25 Bros & Brews ticket
      quantity: 1,
    }];

    // Create Stripe Checkout session (embedded mode)
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded', // Embedded checkout
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      return_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      
      // Collect customer info
      customer_email: metadata.email || undefined,
      billing_address_collection: 'auto',
      
      // Custom metadata to store with the payment
      metadata: {
        event: event,
        type: metadata.type || 'ticket',
        ao: metadata.ao || '',
        region: metadata.region || 'DMV',
        paxName: metadata.paxName || '',
        teamId: metadata.teamId || '',
        email: metadata.email || '',
      },
      
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    // Return the client secret for embedded checkout
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
 * Verify a checkout session (optional - for confirming payment on thank you page)
 */
router.get('/verify/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
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
