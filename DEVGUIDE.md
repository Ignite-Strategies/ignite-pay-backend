# Developer Guide - Ignite Payments System

## 🏗️ Architecture Overview

**Two separate repos:**
- **Frontend**: `ignite-ticketing` (React + Vite) → Deployed to **Vercel**
- **Backend**: `ignite-pay-backend` (Node.js + Express + Stripe) → Deployed to **Render** (this repo)

---

## ⚙️ PRODUCTION URLS (Hardcoded in Config Files)

### Backend (Render)
```
https://ignite-pay-backend.onrender.com
```

### Frontend (Vercel) 
```
https://ignite-ticketing.vercel.app
```
**⚠️ UPDATE THIS in `config.js` if your Vercel URL is different!**

---

## 🔧 Configuration Files (SOURCE OF TRUTH)

### Backend Config: `ignite-pay-backend/config.js`
```javascript
module.exports = {
  FRONTEND_URL: 'https://ignite-ticketing.vercel.app',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT || 3000,
};
```

### Frontend Config: `ignite-ticketing/src/config.js`
```javascript
export const CONFIG = {
  API_URL: 'https://ignite-pay-backend.onrender.com',
  STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
};
```

**⚠️ ALL URLs go in these config files. DON'T scatter them around!**

---

## 🚀 Backend Setup (This Repo)

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon.tech recommended)
- Stripe account

### Local Development

1. **Install dependencies**:
```bash
npm install
```

2. **Create `.env` file**:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ignite_pay
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

3. **Setup database**:
```bash
npx prisma generate
npx prisma migrate dev
```

4. **Run server**:
```bash
npm run dev
```

5. **Test health check**:
```bash
curl http://localhost:3000/health
```

---

## 🌐 Frontend Setup (ignite-ticketing repo)

1. **Install dependencies**:
```bash
npm install
```

2. **Config already set** in `src/config.js` - points to production backend

3. **Run dev server**:
```bash
npm run dev
```

4. **Visit**: http://localhost:5173

---

## 📡 API Endpoints

### 1. Health Check
```
GET /health
GET /api/health
```
Response:
```json
{"status":"ok","timestamp":"...","env":"production"}
```

### 2. Create Checkout Session
```
POST /api/checkout/session
```
Request:
```json
{
  "event": "brosandbrews",
  "amount": 2500,
  "metadata": {
    "type": "ticket",
    "eventName": "Bros & Brews - A Night of Impact",
    "region": "DMV",
    "name": "John Doe",
    "email": "john@example.com",
    "paxName": "Maverick",
    "ao": "Patriot"
  }
}
```
Response:
```json
{
  "clientSecret": "cs_test_a1B2c3D4...",
  "sessionId": "cs_test_a1B2c3D4..."
}
```

### 3. Verify Session
```
GET /api/checkout/verify/:sessionId
```
Response:
```json
{
  "success": true,
  "amount": 2500,
  "event": "brosandbrews",
  "customerEmail": "john@example.com"
}
```

### 4. Stripe Webhook
```
POST /api/webhook
```
Receives Stripe events (signature verified).

---

## 🔄 Payment Flow

1. **User fills form** on frontend (Vercel)
2. **Frontend calls**: `POST https://ignite-pay-backend.onrender.com/api/checkout/session`
3. **Backend**:
   - Finds/creates customer in DB
   - Calls Stripe API to create embedded checkout session
   - Saves order to DB (status: "pending")
   - Returns `clientSecret`
4. **Frontend**: Embeds Stripe checkout with `<EmbeddedCheckout />`
5. **User enters card** in Stripe iframe
6. **Stripe processes payment**
7. **Stripe redirects** to: `https://ignite-ticketing.vercel.app/success?session_id=...`
8. **Stripe sends webhook** to: `https://ignite-pay-backend.onrender.com/api/webhook`
9. **Backend webhook handler**: Updates order status to "paid"

---

## 🚀 Deployment

### Backend (Render)

1. **Connect GitHub repo** to Render
2. **Set environment variables**:
```
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
DATABASE_URL=postgresql://...
FRONTEND_URL=https://ignite-ticketing.vercel.app
NODE_ENV=production
```
3. **Deploy** - Auto-deploys on push to main

4. **Configure Stripe webhook**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://ignite-pay-backend.onrender.com/api/webhook`
   - Select events: `checkout.session.completed`
   - Copy webhook secret → Update `STRIPE_WEBHOOK_SECRET` on Render

### Frontend (Vercel)

1. **Connect GitHub repo** to Vercel
2. **Environment variables** (optional, config.js has defaults):
```
VITE_API_URL=https://ignite-pay-backend.onrender.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
```
3. **Deploy** - Auto-deploys on push to main

---

## 📊 Database Schema

### Customer
```prisma
model Customer {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  paxName   String?
  ao        String?
  region    String?
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Order
```prisma
model Order {
  id              String   @id @default(uuid())
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  stripeSessionId String   @unique
  amount          Int      // cents
  status          String   @default("pending")
  event           String
  eventName       String
  type            String   // ticket, donation
  region          String
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 🧪 Testing

### Test Cards (Stripe)
| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | ✅ Success |
| 4000 0000 0000 0002 | ❌ Decline |
| 4000 0027 6000 3184 | 🔐 3D Secure |

**Expiry:** Any future date (12/34)  
**CVC:** Any 3 digits (123)  
**ZIP:** Any code (12345)

### Test Backend Directly
```bash
# Health check
curl https://ignite-pay-backend.onrender.com/health

# Create session
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

### Test Webhooks Locally
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/webhook
# Copy webhook secret to .env

# Terminal 3: Test payment
# Complete checkout - webhook fires!
```

---

## 🐛 Troubleshooting

### Backend Not Starting
**Error:** `Can't reach database server`
- Check `DATABASE_URL` is set
- Verify database is running
- Get free DB from: https://neon.tech

### CORS Errors
**Error:** `Access blocked by CORS policy`
- Check `FRONTEND_URL` in `config.js` matches your Vercel URL
- Redeploy backend after changing

### ERR_CONNECTION_REFUSED (Frontend)
- Backend is down on Render
- Check Render logs for crashes
- Verify health check works: https://ignite-pay-backend.onrender.com/health

### Stripe Errors
**Error:** `No such price`
- Create product/price in Stripe dashboard
- Update `priceId` in `services/stripeService.js` line 10

### Webhook Signature Failed
**Error:** `Webhook signature verification failed`
- `STRIPE_WEBHOOK_SECRET` is wrong
- Update in Render env vars
- Get from Stripe dashboard → Webhooks

---

## 📁 Project Structure

```
ignite-pay-backend/
├── config.js                    # ⭐ CONFIG - ALL URLS HERE
├── index.js                     # Express server
├── routes/
│   ├── checkoutRoute.js        # POST /api/checkout/session
│   └── webhookRoute.js         # POST /api/webhook
├── services/
│   ├── stripeService.js        # Stripe API calls
│   ├── customerService.js      # DB customer operations
│   └── orderService.js         # DB order operations
├── models/
│   ├── Customer.js
│   └── Order.js
├── prisma/
│   └── schema.prisma           # Database schema
├── package.json
└── vercel.json                 # Vercel config (if using)
```

---

## 🔒 Security

- ✅ `.env` files in `.gitignore` (never commit secrets)
- ✅ Webhook signature verification (prevents fake webhooks)
- ✅ CORS only allows specified frontend origin
- ✅ Use test keys in development (`sk_test_...`)
- ✅ Use live keys in production (`sk_live_...`)
- ✅ HTTPS required for webhooks in production

---

## 📝 Common Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server with nodemon
npm start               # Start production server
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run migrations
npm run prisma:studio   # Open Prisma Studio (DB GUI)
```

### Deployment
```bash
git add .
git commit -m "Your changes"
git push origin main    # Auto-deploys to Render
```

---

## 🆘 Need Help?

1. Check backend logs on Render dashboard
2. Check frontend console (F12) for errors
3. Test backend health: https://ignite-pay-backend.onrender.com/health
4. Verify Stripe dashboard for payment/webhook logs
5. Check `PAYMENTS.md` for detailed troubleshooting

---

**Last Updated:** Oct 2, 2025  
**Maintained by:** Ignite Strategies Team  
**All docs live in:** `ignite-pay-backend` repo (source of truth)

