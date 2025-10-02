# Payments Integration - Complete Guide

**⚠️ ALL DOCS LIVE HERE (ignite-pay-backend) - This is the source of truth!**

---

## 🌐 PRODUCTION URLS

### Backend (Render)
```
https://ignite-pay-backend.onrender.com
```

### Frontend (Vercel)
```
https://ignite-ticketing.vercel.app
```

---

## 🔧 Configuration Files (DON'T MESS WITH OTHER FILES!)

### Backend: `ignite-pay-backend/config.js`
```javascript
module.exports = {
  FRONTEND_URL: 'https://ignite-ticketing.vercel.app',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
};
```

### Frontend: `ignite-ticketing/src/config.js`
```javascript
export const CONFIG = {
  API_URL: 'https://ignite-pay-backend.onrender.com',
  STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
};
```

**Files using these configs:**
- ✅ Backend: `index.js`, `services/stripeService.js`
- ✅ Frontend: `src/pages/CheckoutPage.jsx`

---

## 🚨 Fixed Issue: ERR_CONNECTION_REFUSED

**Problem:** Frontend was calling `localhost:3000` instead of production backend.

**Solution:** Hardcoded production URL in `config.js` as fallback.

---

## 🔄 How It Works

```
User (Browser)
    │
    ▼
Frontend (Vercel)
https://ignite-ticketing.vercel.app
    │
    ├─→ Shows checkout form
    ├─→ User fills: name, email, PAX name, AO
    ├─→ Clicks "Continue to Payment"
    │
    ▼
POST https://ignite-pay-backend.onrender.com/api/checkout/session
    │
    ▼
Backend (Render)
    │
    ├─→ Find/create customer in DB
    ├─→ Create Stripe checkout session (embedded mode)
    ├─→ Save order to DB (status: "pending")
    ├─→ Return clientSecret
    │
    ▼
Frontend receives clientSecret
    │
    ├─→ <EmbeddedCheckout /> loads Stripe iframe
    │
    ▼
User enters card in Stripe iframe
    │
    ▼
Stripe processes payment
    │
    ├─→ Redirects to: https://ignite-ticketing.vercel.app/success?session_id=...
    │
    ├─→ Webhook to: https://ignite-pay-backend.onrender.com/api/webhook
    │
    ▼
Backend webhook handler
    │
    └─→ Updates order status to "paid" in DB
```

---

## 🚀 Quick Deploy

### Frontend (ignite-ticketing)
```bash
cd ignite-ticketing
git add .
git commit -m "Updated config"
git push
```
Vercel auto-deploys.

### Backend (ignite-pay-backend)
```bash
cd ignite-pay-backend
git add .
git commit -m "Updated config"
git push
```
Render auto-deploys.

---

## 🧪 Testing

### 1. Check Backend Health
```bash
curl https://ignite-pay-backend.onrender.com/health
```
Should return: `{"status":"ok","timestamp":"...","env":"production"}`

### 2. Check Frontend Shows Correct URL
- Visit: https://ignite-ticketing.vercel.app
- Blue debug box should show: `🔧 API: https://ignite-pay-backend.onrender.com`

### 3. Test Checkout Flow
1. Fill form on frontend
2. Click "Continue to Payment"
3. Open console (F12) - look for:
   - 🔵 API_URL: https://ignite-pay-backend.onrender.com
   - 🔵 Fetching checkout session...
   - 🔵 Response status: 200
   - 🟢 Session created: {clientSecret: "cs_test_..."}
4. Stripe checkout should load
5. Use test card: `4242 4242 4242 4242`
6. Complete payment
7. Should redirect to success page

### 4. Test Backend API Directly
```bash
curl -X POST https://ignite-pay-backend.onrender.com/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{
    "event": "brosandbrews",
    "amount": 2500,
    "metadata": {
      "name": "Test User",
      "email": "test@example.com",
      "type": "ticket"
    }
  }'
```
Should return: `{"clientSecret":"cs_test_...","sessionId":"cs_test_..."}`

---

## 🐛 Common Issues

### ERR_CONNECTION_REFUSED
**Symptom:** Frontend can't reach backend
**Causes:**
- Backend down on Render
- Wrong URL in config
- Config not deployed yet

**Fix:**
1. Check health: `curl https://ignite-pay-backend.onrender.com/health`
2. If down, check Render logs
3. Verify config.js has correct URL
4. Redeploy both apps

### CORS Error
**Symptom:** `Access blocked by CORS policy`
**Cause:** Backend FRONTEND_URL doesn't match Vercel URL

**Fix:**
1. Check `ignite-pay-backend/config.js` has: `https://ignite-ticketing.vercel.app`
2. Redeploy backend
3. Clear browser cache

### Stripe Checkout Doesn't Load
**Symptom:** Spinner forever or `fetchClientSecret failed`
**Causes:**
- Backend returned error (check console)
- Missing clientSecret in response
- Stripe keys wrong

**Fix:**
1. Check console for 🔴 errors
2. Test backend API directly (see above)
3. Verify Stripe keys on Render

### Webhook Not Firing
**Symptom:** Payment succeeds but order stays "pending"
**Cause:** Stripe webhook not configured or signature verification failing

**Fix:**
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://ignite-pay-backend.onrender.com/api/webhook`
3. Select events: `checkout.session.completed`
4. Copy webhook secret
5. Update `STRIPE_WEBHOOK_SECRET` on Render
6. Redeploy backend

---

## 🔒 Environment Variables

### Render (Backend) - REQUIRED
```
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
```

### Render (Backend) - OPTIONAL
```
FRONTEND_URL=https://ignite-ticketing.vercel.app
PORT=3000
NODE_ENV=production
```
(Config.js has defaults)

### Vercel (Frontend) - OPTIONAL
```
VITE_API_URL=https://ignite-pay-backend.onrender.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
```
(Config.js has defaults)

---

## 📡 API Endpoints

### Backend (Render)
- `GET /health` - Health check
- `GET /api/health` - Health check (alternate)
- `POST /api/checkout/session` - Create Stripe session
- `GET /api/checkout/verify/:sessionId` - Verify payment
- `POST /api/webhook` - Stripe webhook receiver

### Frontend (Vercel)
- `/` - Checkout page
- `/success` - Payment success page
- `/cancel` - Payment cancelled page

---

## 📊 Database

**Provider:** PostgreSQL (Neon.tech recommended)

**Tables:**
- `Customer` - Stores customer info (email, name, PAX name, AO)
- `Order` - Stores orders (amount, status, event, metadata)

**Access DB:**
```bash
cd ignite-pay-backend
npx prisma studio
```

---

## 🔐 Stripe Setup

### Products & Prices
1. Go to: https://dashboard.stripe.com/test/products
2. Create product: "Bros & Brews Ticket"
3. Create price: $25.00
4. Copy price ID (e.g., `price_1SDCslJ80nlgpHNNqajMMKvQ`)
5. Update `services/stripeService.js` line 10

### Webhook
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://ignite-pay-backend.onrender.com/api/webhook`
3. Select events: `checkout.session.completed`
4. Copy webhook secret
5. Add to Render: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Test vs Live Mode
- **Test keys:** `sk_test_...` / `pk_test_...`
- **Live keys:** `sk_live_...` / `pk_live_...`
- Use test in development, live in production
- Keys must match same mode (both test or both live)

---

## 🧰 Useful Commands

### Backend
```bash
# Development
npm run dev              # Start with nodemon
npm run prisma:studio   # Open DB GUI

# Deployment
git push                 # Auto-deploys to Render

# Database
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Run migrations (dev)
npx prisma migrate deploy  # Run migrations (prod)
```

### Frontend
```bash
# Development
npm run dev             # Start Vite dev server

# Deployment
git push                # Auto-deploys to Vercel

# Build
npm run build          # Test production build
npm run preview        # Preview production build
```

---

## 🆘 Debug Checklist

```bash
# 1. Backend running?
curl https://ignite-pay-backend.onrender.com/health

# 2. Frontend deployed?
curl https://ignite-ticketing.vercel.app

# 3. Test backend API?
curl -X POST https://ignite-pay-backend.onrender.com/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{"event":"brosandbrews","amount":2500,"metadata":{"name":"Test","email":"test@test.com","type":"ticket"}}'

# 4. Check Render logs
# Go to Render dashboard → Your service → Logs

# 5. Check Vercel logs
# Go to Vercel dashboard → Your project → Deployments → View logs

# 6. Check Stripe logs
# Go to: https://dashboard.stripe.com/test/logs
```

---

## 📚 Documentation Files

All docs live in `ignite-pay-backend`:
- ✅ `DEVGUIDE.md` - Complete developer guide
- ✅ `PAYMENTS.md` - This file (payment integration details)
- ✅ `README.md` - Quick overview

Frontend `ignite-ticketing` should just have:
- `README.md` - Simple overview pointing to backend docs

---

## ⚠️ CRITICAL RULES

1. **ALL URLs go in config files** - Don't scatter them!
2. **All docs live in backend repo** - Don't duplicate!
3. **Never commit .env files** - They're in .gitignore
4. **Always use config imports** - Don't hardcode elsewhere
5. **Test health check first** - Before debugging other issues

---

**Last Updated:** Oct 2, 2025  
**Maintained by:** Ignite Strategies Team  
**Primary repo:** ignite-pay-backend (source of truth for docs)

