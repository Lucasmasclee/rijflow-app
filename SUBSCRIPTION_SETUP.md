# Abonnements- en Betalingsstructuur Setup

Deze gids helpt je bij het opzetten van de volledige abonnements- en betalingsstructuur voor RijFlow.

## 🚀 Overzicht

Het systeem bevat:
- **60 dagen gratis proefperiode** voor nieuwe gebruikers
- **Twee abonnementsniveaus**: Maandelijks (€39,99) en Jaarlijks (€359,88)
- **Stripe Checkout** voor betalingen
- **Webhook integratie** voor automatische updates
- **Beveiligde toegang** op basis van abonnementstype

## 📋 Vereiste Configuratie

### 1. Environment Variables

Voeg de volgende variabelen toe aan je `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Stripe Setup

#### A. Producten en Prijzen Aanmaken

1. Ga naar je [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigeer naar **Products** → **Add Product**
3. Maak twee producten aan:

**Product 1: RijFlow Maandelijks**
- Name: `RijFlow Maandelijks`
- Price: `€39.99` per month
- Noteer de Price ID (bijv. `price_1ABC123...`)

**Product 2: RijFlow Jaarlijks**
- Name: `RijFlow Jaarlijks`
- Price: `€359.88` per year
- Noteer de Price ID (bijv. `price_1DEF456...`)

#### B. Webhook Endpoint Configureren

1. Ga naar **Developers** → **Webhooks**
2. Klik op **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Noteer de Webhook Secret (begint met `whsec_`)

#### C. Update Price IDs

Update de price IDs in `src/lib/stripe.ts`:

```typescript
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'price_YOUR_MONTHLY_PRICE_ID', // Vervang met je echte price ID
    name: 'Maandelijks',
    price: 39.99,
    interval: 'month',
    description: '€39,99 per maand'
  },
  yearly: {
    id: 'price_YOUR_YEARLY_PRICE_ID', // Vervang met je echte price ID
    name: 'Jaarlijks',
    price: 359.88,
    interval: 'year',
    description: '€359,88 per jaar (25% korting)'
  }
} as const
```

### 3. Supabase Setup

#### A. Database Schema

Voer het SQL script uit in je Supabase SQL Editor:

```sql
-- Voer het script uit uit: supabase-migrations/create-subscriptions-table.sql
```

#### B. Row Level Security (RLS)

Het script maakt automatisch de juiste RLS policies aan, maar controleer of ze actief zijn:

1. Ga naar je Supabase Dashboard
2. Navigeer naar **Authentication** → **Policies**
3. Controleer of de `subscriptions` tabel de juiste policies heeft

## 🔧 Implementatie Details

### API Routes

De volgende API routes zijn geïmplementeerd:

- `POST /api/stripe/create-checkout-session` - Maakt Stripe Checkout sessie
- `POST /api/stripe/webhook` - Verwerkt Stripe webhooks
- `POST /api/stripe/cancel-subscription` - Annuleert abonnement
- `GET /api/stripe/get-subscription` - Haalt abonnement op

### Middleware

De middleware (`src/middleware.ts`) beschermt alle dashboard routes:

- Alle routes onder `/dashboard` vereisen een actief abonnement of proefperiode
- Alleen `/dashboard/abonnement` is toegankelijk zonder actief abonnement
- Gebruikers worden automatisch doorgestuurd naar de abonnementspagina als hun proefperiode is afgelopen

### Hooks en Components

- `useSubscription()` - Hook voor abonnementsbeheer
- `SubscriptionGuard` - Component voor het beschermen van content
- `UpgradePrompt` - Component voor upgrade prompts
- `SubscriptionStatus` - Component voor het tonen van abonnement status

## 🧪 Testing

### 1. Test Webhook Locally

Voor lokale ontwikkeling, gebruik Stripe CLI:

```bash
# Installeer Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 2. Test Checkout Flow

1. Start je development server
2. Ga naar `/dashboard/abonnement`
3. Klik op een abonnement
4. Gebruik test kaart nummers van Stripe

### 3. Test Webhook Events

```bash
# Test subscription created event
stripe trigger customer.subscription.created

# Test payment succeeded event
stripe trigger invoice.payment_succeeded
```

## 🔒 Beveiliging

### Webhook Signature Verification

Alle webhook events worden geverifieerd met Stripe's signature:

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
)
```

### Row Level Security

Supabase RLS zorgt ervoor dat gebruikers alleen hun eigen abonnement kunnen zien/bewerken.

## 📊 Monitoring

### Stripe Dashboard

Monitor je betalingen en abonnementen via:
- **Customers** - Bekijk alle klanten
- **Subscriptions** - Bekijk actieve abonnementen
- **Webhooks** - Bekijk webhook delivery logs

### Supabase Dashboard

Monitor je database via:
- **Table Editor** - Bekijk subscriptions tabel
- **Logs** - Bekijk database queries

## 🚨 Troubleshooting

### Veelvoorkomende Problemen

1. **Webhook niet ontvangen**
   - Controleer webhook URL
   - Controleer webhook secret
   - Test met Stripe CLI

2. **Subscription niet bijgewerkt**
   - Controleer webhook logs in Stripe
   - Controleer Supabase logs
   - Controleer RLS policies

3. **Checkout werkt niet**
   - Controleer price IDs
   - Controleer Stripe keys
   - Controleer CORS settings

### Debug Tips

```typescript
// Voeg logging toe aan webhook handler
console.log('Webhook received:', event.type)
console.log('Subscription data:', event.data.object)
```

## 📈 Volgende Stappen

1. **Analytics** - Voeg tracking toe voor conversies
2. **Email Notifications** - Stuur emails bij abonnementswijzigingen
3. **Usage Limits** - Implementeer limieten voor verschillende tiers
4. **Billing Portal** - Voeg Stripe Customer Portal toe
5. **Refunds** - Implementeer refund logica

## 📞 Support

Voor vragen over:
- **Stripe**: [Stripe Support](https://support.stripe.com/)
- **Supabase**: [Supabase Support](https://supabase.com/support)
- **Code**: Check de code comments en deze documentatie 