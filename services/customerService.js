const Customer = require('../models/Customer');

class CustomerService {
  static async findOrCreateCustomer(data) {
    return await Customer.findOrCreate({
      email: data.email,
      name: data.name || 'Guest',
      paxName: data.paxName,
      ao: data.ao,
      region: data.region || 'DMV',
    });
  }

  static async updateCustomerStats(customerId, stats) {
    return await Customer.incrementStats(customerId, {
      amount: stats.amount || 0,
      tickets: stats.tickets || 0,
      events: stats.events || 0,
    });
  }

  static async getCustomerByEmail(email) {
    return await Customer.findByEmail(email);
  }
}

module.exports = CustomerService;

