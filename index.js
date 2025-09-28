const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stripe webhook endpoint
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      await handleSuccessfulPayment(session);
      console.log('Payment processed successfully:', session.id);
    } catch (error) {
      console.error('Error processing payment:', error);
      return res.status(500).json({ error: 'Failed to process payment' });
    }
  }

  res.json({ received: true });
});

async function handleSuccessfulPayment(session) {
  const { customer_email, customer_details, amount_total, metadata } = session;
  
  // Extract data from session
  const email = customer_email || customer_details?.email;
  const name = customer_details?.name || metadata?.name;
  const amount = amount_total; // Stripe amount is in cents
  const type = metadata?.type || 'donation'; // Default to donation if not specified
  const region = metadata?.region || 'unknown';

  if (!email) {
    throw new Error('No email found in checkout session');
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        tickets: 0,
        donations: 0
      }
    });
  } else if (name && !user.name) {
    // Update name if we have it and user doesn't have one
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name }
    });
  }

  // Create transaction record
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      amount,
      type,
      region,
      stripeId: session.id
    }
  });

  // Update user's totals
  const updateData = {};
  if (type === 'ticket') {
    updateData.tickets = { increment: 1 };
  } else if (type === 'donation') {
    updateData.donations = { increment: amount };
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
  }

  console.log('Transaction created:', {
    transactionId: transaction.id,
    userId: user.id,
    email,
    amount,
    type,
    region
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
