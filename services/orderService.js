const Order = require('../models/Order');

class OrderService {
  static async createOrder(data) {
    return await Order.create({
      customerId: data.customerId,
      stripeSessionId: data.stripeSessionId,
      amount: data.amount,
      status: 'pending',
      event: data.event,
      eventName: data.eventName,
      type: data.type || 'ticket',
      email: data.email,
      name: data.name,
      ao: data.ao,
      region: data.region || 'DMV',
      paxName: data.paxName,
      metadata: data.metadata || {},
    });
  }

  static async completeOrder(sessionId, paymentData = {}) {
    const order = await Order.updateStatus(sessionId, 'paid', {
      paymentIntentId: paymentData.paymentIntentId
    });
    return order;
  }

  static async failOrder(sessionId) {
    return await Order.updateStatus(sessionId, 'failed');
  }

  static async getOrderBySession(sessionId) {
    return await Order.findBySessionId(sessionId);
  }

  static async getCustomerOrders(customerId) {
    return await Order.findByCustomer(customerId);
  }

  static async getEventStats(event) {
    return await Order.getEventStats(event);
  }
}

module.exports = OrderService;

