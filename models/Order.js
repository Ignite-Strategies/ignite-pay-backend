const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class Order {
  static async create(data) {
    return await prisma.purchase.create({
      data: {
        customerId: data.customerId,
        stripeCheckoutSessionId: data.stripeSessionId,
        stripePaymentIntentId: data.paymentIntentId,
        amount: data.amount,
        status: data.status || 'pending',
        event: data.event,
        eventName: data.eventName || data.event,
        type: data.type || 'ticket',
        customerEmail: data.email,
        customerName: data.name,
        ao: data.ao,
        region: data.region || 'DMV',
        paxName: data.paxName,
        metadata: data.metadata || {},
      }
    });
  }

  static async findBySessionId(sessionId) {
    return await prisma.purchase.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      include: { customer: true }
    });
  }

  static async updateStatus(sessionId, status, paymentData = {}) {
    const updateData = { 
      status,
      updatedAt: new Date(),
    };

    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    if (paymentData.paymentIntentId) {
      updateData.stripePaymentIntentId = paymentData.paymentIntentId;
    }

    return await prisma.purchase.update({
      where: { stripeCheckoutSessionId: sessionId },
      data: updateData
    });
  }

  static async findByCustomer(customerId) {
    return await prisma.purchase.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getEventStats(event) {
    const stats = await prisma.purchase.aggregate({
      where: { 
        event,
        status: 'paid'
      },
      _sum: { amount: true },
      _count: true
    });

    return {
      totalRaised: stats._sum.amount || 0,
      ticketsSold: stats._count || 0
    };
  }
}

module.exports = Order;
