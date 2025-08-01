# Stripe Abonnement Setup Guide

## Benodigde Environment Variables

Voeg de volgende environment variables toe aan je `.env.local` bestand:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Product and Price IDs
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_YEARLY_PRICE_ID=price_your_yearly_price_id
```

## Stripe Setup Stappen

### 1. Stripe Account Setup
1. Maak een Stripe account aan op [stripe.com](https://stripe.com)
2. Ga naar het Stripe Dashboard
3. Schakel over naar test mode (toggle rechtsboven)

### 2. Producten en Prijzen Aanmaken

#### Maandelijks Abonnement
1. Ga naar **Products** in het Stripe Dashboard
2. Klik **Add product**
3. Product naam: "Maandelijks Abonnement"
4. Prijs: €39.99 per maand
5. Billing model: Recurring
6. Billing period: Monthly
7. Kopieer de Price ID (begint met `price_`)

#### Jaarlijks Abonnement
1. Maak een tweede product aan
2. Product naam: "Jaarlijks Abonnement"
3. Prijs: €29.99 per maand (€359.88 per jaar)
4. Billing model: Recurring
5. Billing period: Monthly
6. Kopieer de Price ID

### 3. Webhook Setup
1. Ga naar **Webhooks** in het Stripe Dashboard
2. Klik **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Kopieer de webhook secret (begint met `whsec_`)

### 4. Database Schema Updates

Voeg de volgende kolommen toe aan je `instructors` tabel in Supabase:

```sql
ALTER TABLE instructors ADD COLUMN subscription_status TEXT;
ALTER TABLE instructors ADD COLUMN subscription_id TEXT;
ALTER TABLE instructors ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE instructors ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE instructors ADD COLUMN subscription_ends_at TIMESTAMP WITH TIME ZONE;
```

### 5. Test de Integratie

1. Start je development server: `npm run dev`
2. Ga naar `/dashboard/abonnement`
3. Test de checkout flow met Stripe test kaarten:
   - Succesvol: `4242 4242 4242 4242`
   - Declined: `4000 0000 0000 0002`

## Features

### ✅ Geïmplementeerd
- [x] 60 dagen gratis proefperiode
- [x] Maandelijks abonnement (€39.99/maand)
- [x] Jaarlijks abonnement (€29.99/maand, €359.88/jaar)
- [x] Stripe Checkout integratie
- [x] Webhook handlers voor subscription events
- [x] Middleware voor toegangscontrole
- [x] Abonnement beheer pagina
- [x] Trial status tracking
- [x] Automatische fallback naar Free bij opzegging

### 🔧 Configuratie Vereist
- [ ] Stripe producten en prijzen aanmaken
- [ ] Webhook endpoint configureren
- [ ] Environment variables instellen
- [ ] Database schema updaten

## Troubleshooting

### Webhook Events Niet Ontvangen
1. Controleer of de webhook URL correct is
2. Zorg dat je server bereikbaar is (gebruik ngrok voor local development)
3. Controleer de webhook secret in je environment variables

### Checkout Sessie Fout
1. Controleer of de Stripe keys correct zijn
2. Zorg dat de price IDs bestaan in je Stripe account
3. Controleer de console voor error messages

### Database Updates Fout
1. Controleer of de Supabase service role key correct is
2. Zorg dat de `instructors` tabel bestaat
3. Controleer de RLS policies

## Support

Voor vragen over de Stripe integratie, raadpleeg:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Stripe Checkout Guide](https://stripe.com/docs/payments/checkout) 