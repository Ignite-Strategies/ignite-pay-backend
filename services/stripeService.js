const config = require('../config');
const stripe = require('stripe')(config.STRIPE_SECRET_KEY);

class StripeService {
  static async createCheckoutSession({ event, amount, metadata }) {
    // Event configuration
    const eventConfig = {
      brosandbrews: {
        name: '🍻 Bros & Brews - A Night of Impact',
        description: 'Supporting F3 Nation\'s Accelerate Campaign',
        priceId: 'price_1SDCslJ80nlgpHNNqajMMKvQ', // $25 ticket
      },
    };

    const eventDetails = eventConfig[event.toLowerCase()];
    
    if (!eventDetails) {
      throw new Error('Invalid event name');
    }

    // Log the URL being sent to Stripe (for debugging)
    const returnUrl = `${config.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
    console.log('🔵 Stripe return_url:', returnUrl);
    console.log('🔵 config.FRONTEND_URL:', config.FRONTEND_URL);

    // Create Stripe Checkout session (embedded mode)
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      line_items: [{
        price: eventDetails.priceId,
        quantity: 1,
      }],
      mode: 'payment',
      return_url: returnUrl,
      
      customer_email: metadata.email,
      billing_address_collection: 'auto',
      
      metadata: {
        event,
        type: metadata.type || 'ticket',
        ao: metadata.ao || '',
        region: metadata.region || 'DMV',
        paxName: metadata.paxName || '',
        email: metadata.email || '',
      },
      
      allow_promotion_codes: true,
    });

    return session;
  }

  static async retrieveSession(sessionId) {
    return await stripe.checkout.sessions.retrieve(sessionId);
  }

  static async constructWebhookEvent(payload, signature) {
    const webhookConfig = require('../config');
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookConfig.STRIPE_WEBHOOK_SECRET
    );
  }
}

module.exports = StripeService;

