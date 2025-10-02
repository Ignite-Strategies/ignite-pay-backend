/**
 * PRODUCTION CONFIGURATION
 * 
 * ⚠️ IMPORTANT: These are the PRODUCTION URLs
 * If you need to change them, change them HERE, not scattered in files
 */

module.exports = {
  // Frontend URL (Vercel)
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://ignite-ticketing.vercel.app',
  
  // Stripe Keys
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Database
  MONGO_URI: process.env.MONGO_URI,
  
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Log config on startup (helps debugging - but hide secrets)
console.log('🔧 Backend CONFIG:', {
  FRONTEND_URL: module.exports.FRONTEND_URL,
  PORT: module.exports.PORT,
  NODE_ENV: module.exports.NODE_ENV,
  STRIPE_SECRET_KEY: module.exports.STRIPE_SECRET_KEY ? '✅ SET' : '❌ MISSING',
  MONGO_URI: module.exports.MONGO_URI ? '✅ SET' : '❌ MISSING',
});

