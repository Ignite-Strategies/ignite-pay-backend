const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * POST /api/webhook/stripe
 * Handle Stripe webhook events
 * 
 * IMPORTANT: This route must use raw body, not JSON parsed body
 * Set up in main index.js with express.raw() for this specific route
 */
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Webhook received:', event.type);

  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }

  // Return 200 to acknowledge receipt
  res.json({ received: true });
});

/**
 * Handle successful checkout session completion
 * Maps Stripe data to our EventCustomer + Purchase models
 */
async function handleCheckoutCompleted(session) {
  console.log('💰 Processing checkout.session.completed:', session.id);

  // Extract data from Stripe session object
  // Docs: https://stripe.com/docs/api/checkout/sessions/object
  const {
    id: sessionId,
    customer_email,
    customer_details,
    amount_total,
    payment_intent,
    customer: stripeCustomerId,
    payment_status,
    metadata
  } = session;

  // Customer info from Stripe
  const email = customer_email || customer_details?.email;
  const name = customer_details?.name || metadata?.paxName;
  const phone = customer_details?.phone;
  
  // Address from Stripe (when billing_address_collection is enabled)
  const address = customer_details?.address || {};
  const city = address.city;
  const state = address.state;
  const zip = address.postal_code;
  const country = address.country || 'US';

  // F3 metadata
  const ao = metadata?.ao || null;
  const region = metadata?.region || 'DMV';
  const paxName = metadata?.paxName || null;
  const event = metadata?.event || 'unknown';
  const type = metadata?.type || 'ticket';

  // Amount
  const amount = amount_total; // In cents

  if (!email) {
    console.error('❌ No email found in checkout session');
    throw new Error('No email found in checkout session');
  }

  console.log('📧 Processing payment for:', email);

  // 1. Find or create EventCustomer
  let customer = await prisma.eventCustomer.findUnique({
    where: { email }
  });

  if (!customer) {
    // Create new customer
    customer = await prisma.eventCustomer.create({
      data: {
        email,
        name: name || null,
        phone: phone || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        country: country || 'US',
        ao: ao || null,
        region: region || 'DMV',
        paxName: paxName || null,
        stripeCustomerId: stripeCustomerId || null,
        totalDonated: amount,
        ticketsPurchased: type === 'ticket' ? 1 : 0,
        eventCount: 1,
      }
    });
    console.log('✨ New customer created:', email);
  } else {
    // Update existing customer
    const updateData = {
      totalDonated: { increment: amount },
      eventCount: { increment: 1 },
    };

    // Update optional fields if we have new data
    if (name && !customer.name) updateData.name = name;
    if (phone && !customer.phone) updateData.phone = phone;
    if (city && !customer.city) updateData.city = city;
    if (state && !customer.state) updateData.state = state;
    if (ao && !customer.ao) updateData.ao = ao;
    if (paxName && !customer.paxName) updateData.paxName = paxName;
    if (stripeCustomerId && !customer.stripeCustomerId) {
      updateData.stripeCustomerId = stripeCustomerId;
    }

    if (type === 'ticket') {
      updateData.ticketsPurchased = { increment: 1 };
    }

    customer = await prisma.eventCustomer.update({
      where: { id: customer.id },
      data: updateData
    });
    console.log('📝 Customer updated:', email);
  }

  // 2. Create Purchase record
  const purchase = await prisma.purchase.create({
    data: {
      customerId: customer.id,
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: payment_intent || null,
      stripeCustomerId: stripeCustomerId || null,
      event: event,
      eventName: metadata?.eventName || null,
      amount: amount,
      currency: 'usd',
      type: type,
      status: payment_status === 'paid' ? 'paid' : 'pending',
      customerEmail: email,
      customerName: name || null,
      customerPhone: phone || null,
      city: city || null,
      state: state || null,
      ao: ao || null,
      region: region || 'DMV',
      paxName: paxName || null,
      metadata: metadata || {},
      paidAt: payment_status === 'paid' ? new Date() : null,
    }
  });

  console.log('✅ Purchase recorded:', {
    purchaseId: purchase.id,
    customerId: customer.id,
    email,
    amount: `$${(amount / 100).toFixed(2)}`,
    type,
    event,
    ao,
    region
  });

  // TODO: Send confirmation email
  // await sendConfirmationEmail(email, purchase, customer);

  return { customer, purchase };
}

/**
 * Handle successful payment intent
 */
async function handlePaymentSucceeded(paymentIntent) {
  console.log('✅ Payment succeeded:', paymentIntent.id);
  // Additional logic if needed
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent) {
  console.error('❌ Payment failed:', paymentIntent.id);
  // TODO: Log failed payment, notify admin
}

module.exports = router;
