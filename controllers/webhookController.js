const StripeService = require('../services/stripeService');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

class WebhookController {
  static async handleStripe(req, res) {
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
          
          // Update order status
          const order = await Order.updateStatus(session.id, 'paid', {
            paymentIntentId: session.payment_intent
          });
          
          // Update customer stats
          if (order) {
            await Customer.incrementStats(order.customerId, {
              amount: order.amount,
              tickets: order.type === 'ticket' ? 1 : 0,
              events: 1
            });
          }
          
          console.log(`✅ Payment successful for session: ${session.id}`);
          break;

        case 'checkout.session.async_payment_succeeded':
          const asyncSession = event.data.object;
          const asyncOrder = await Order.updateStatus(asyncSession.id, 'paid');
          
          if (asyncOrder) {
            await Customer.incrementStats(asyncOrder.customerId, {
              amount: asyncOrder.amount,
              tickets: asyncOrder.type === 'ticket' ? 1 : 0,
              events: 1
            });
          }
          
          console.log(`✅ Async payment succeeded: ${asyncSession.id}`);
          break;

        case 'checkout.session.async_payment_failed':
          const failedSession = event.data.object;
          await Order.updateStatus(failedSession.id, 'failed');
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
  }
}

module.exports = WebhookController;

