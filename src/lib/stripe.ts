import Stripe from 'stripe'

// Initialize Stripe server-side
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Initialize Stripe client-side
export const getStripe = () => {
  if (typeof window !== 'undefined') {
    return require('@stripe/stripe-js').loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return null
}

// Product and price IDs from Stripe
export const STRIPE_PRODUCTS = {
  MONTHLY: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
    name: 'Maandelijks Abonnement',
    price: 39.99,
    interval: 'month'
  },
  YEARLY: {
    priceId: process.env.STRIPE_YEARLY_PRICE_ID!,
    name: 'Jaarlijks Abonnement',
    price: 29.99,
    interval: 'month',
    totalYearly: 359.88
  }
}

// Trial period in days
export const TRIAL_PERIOD_DAYS = 60

// Helper function to check if user has active subscription
export const hasActiveSubscription = (subscriptionStatus?: string) => {
  return subscriptionStatus === 'active' || subscriptionStatus === 'trial'
}

// Helper function to check if trial is expired
export const isTrialExpired = (trialEndsAt?: string) => {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) < new Date()
}

// Helper function to get days remaining in trial
export const getTrialDaysRemaining = (trialEndsAt?: string) => {
  if (!trialEndsAt) return TRIAL_PERIOD_DAYS
  
  const trialEnd = new Date(trialEndsAt)
  const now = new Date()
  const diffTime = trialEnd.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
} 