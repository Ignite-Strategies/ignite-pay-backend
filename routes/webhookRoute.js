const express = require('express');
const router = express.Router();
const StripeService = require('../services/stripeService');
const OrderService = require('../services/orderService');
const CustomerService = require('../services/customerService');

/**
 * POST /api/webhook/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    const event = await StripeService.constructWebhookEvent(
      req.rawBody,
      signature
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Complete the order
        const order = await OrderService.completeOrder(session.id, {
          paymentIntentId: session.payment_intent
        });
        
        // Update customer stats
        if (order) {
          await CustomerService.updateCustomerStats(order.customerId, {
            amount: order.amount,
            tickets: order.type === 'ticket' ? 1 : 0,
            events: 1
          });
        }
        
        console.log(`✅ Payment successful for session: ${session.id}`);
        break;

      case 'checkout.session.async_payment_succeeded':
        const asyncSession = event.data.object;
        const asyncOrder = await OrderService.completeOrder(asyncSession.id);
        
        if (asyncOrder) {
          await CustomerService.updateCustomerStats(asyncOrder.customerId, {
            amount: asyncOrder.amount,
            tickets: asyncOrder.type === 'ticket' ? 1 : 0,
            events: 1
          });
        }
        
        console.log(`✅ Async payment succeeded: ${asyncSession.id}`);
        break;

      case 'checkout.session.async_payment_failed':
        const failedSession = event.data.object;
        await OrderService.failOrder(failedSession.id);
        console.log(`❌ Async payment failed: ${failedSession.id}`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
});

module.exports = router;
