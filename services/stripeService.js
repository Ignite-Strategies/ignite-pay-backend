const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

    const config = eventConfig[event.toLowerCase()];
    
    if (!config) {
      throw new Error('Invalid event name');
    }

    // Create Stripe Checkout session (embedded mode)
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      line_items: [{
        price: config.priceId,
        quantity: 1,
      }],
      mode: 'payment',
      return_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      
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
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }
}

module.exports = StripeService;

