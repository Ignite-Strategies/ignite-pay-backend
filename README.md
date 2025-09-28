# Ignite Pay Backend

Stripe webhook backend for F3 The Capital's Brothers & Brews fundraiser.

## Features

- Handles Stripe checkout session completion webhooks
- Stores user and transaction data in PostgreSQL
- No authentication required (one-time transactions)
- Captures name, email, amount, type, and region from successful payments

## Tech Stack

- Node.js + Express
- Stripe SDK
- Prisma ORM + PostgreSQL
- Deployable to Vercel or Render

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
```

Edit `.env` with your actual values:
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook endpoint secret
- `DATABASE_URL`: Your PostgreSQL connection string

3. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

4. Run the server:
```bash
npm run dev
```

## Environment Variables

- `STRIPE_SECRET_KEY`: Stripe secret key (starts with `sk_`)
- `STRIPE_WEBHOOK_SECRET`: Webhook endpoint secret (starts with `whsec_`)
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

### Health Check
```
GET /health
```

### Stripe Webhook
```
POST /webhook
```

## Database Schema

### User
- `id`: UUID primary key
- `email`: Unique email address
- `name`: Optional name
- `tickets`: Number of tickets purchased
- `donations`: Total donations in cents
- `createdAt`: Timestamp

### Transaction
- `id`: UUID primary key
- `userId`: Foreign key to User
- `amount`: Amount in cents
- `type`: "ticket" or "donation"
- `region`: Geographic region
- `stripeId`: Stripe checkout session ID
- `createdAt`: Timestamp

## Stripe Webhook Setup

1. In your Stripe dashboard, create a webhook endpoint
2. Set the URL to: `https://your-domain.com/webhook`
3. Select the `checkout.session.completed` event
4. Copy the webhook secret to your environment variables

## Deployment

### Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Render
1. Create a new Web Service
2. Connect your GitHub repository
3. Set environment variables
4. Deploy

## Development

```bash
# Start development server
npm run dev

# Run database migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```
