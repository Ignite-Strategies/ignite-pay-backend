const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class User {
  static async findByEmail(email) {
    return await prisma.eventCustomer.findUnique({
      where: { email }
    });
  }

  static async create(data) {
    return await prisma.eventCustomer.create({
      data: {
        email: data.email,
        name: data.name,
        paxName: data.paxName,
        ao: data.ao,
        region: data.region || 'DMV',
      }
    });
  }

  static async findOrCreate(data) {
    let user = await this.findByEmail(data.email);
    
    if (!user) {
      user = await this.create(data);
    } else {
      // Update fields if provided
      if (data.paxName || data.ao) {
        user = await this.update(user.id, {
          paxName: data.paxName || user.paxName,
          ao: data.ao || user.ao,
        });
      }
    }
    
    return user;
  }

  static async update(id, data) {
    return await prisma.eventCustomer.update({
      where: { id },
      data
    });
  }

  static async incrementStats(id, stats) {
    return await prisma.eventCustomer.update({
      where: { id },
      data: {
        totalDonated: { increment: stats.amount || 0 },
        ticketsPurchased: { increment: stats.tickets || 0 },
        eventCount: { increment: stats.events || 0 },
      }
    });
  }
}

module.exports = User;
