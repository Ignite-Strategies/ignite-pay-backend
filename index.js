const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const config = require('./config');

const app = express();

// Import routes
const checkoutRouter = require('./routes/checkoutRoute');
const webhookRouter = require('./routes/webhookRoute');

// CORS configuration
const corsOptions = {
  origin: config.FRONTEND_URL,
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));

// Important: Webhook route needs raw body for signature verification
app.use('/api/webhook', express.raw({ type: 'application/json', verify: (req, res, buf) => { req.rawBody = buf; } }), webhookRouter);

// All other routes use JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/checkout', checkoutRouter);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  console.log(`Health check: http://localhost:${config.PORT}/health`);
  console.log(`Webhook endpoint: http://localhost:${config.PORT}/webhook`);
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
