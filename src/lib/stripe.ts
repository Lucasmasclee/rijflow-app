import Stripe from 'stripe'

// Initialize Stripe server-side
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// Initialize Stripe client-side
export const getStripe = () => {
  if (typeof window === 'undefined') return null
  
  const { loadStripe } = require('@stripe/stripe-js')
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Stripe product and price configurations
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

// Trial period configuration
export const TRIAL_PERIOD_DAYS = 60

// Helper functions for subscription status
export const hasActiveSubscription = (subscriptionStatus?: string): boolean => {
  return subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
}

export const isTrialExpired = (trialEndsAt?: string): boolean => {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) < new Date()
}

export const getTrialDaysRemaining = (trialEndsAt?: string): number => {
  if (!trialEndsAt) return 0
  const trialEnd = new Date(trialEndsAt)
  const now = new Date()
  const diffTime = trialEnd.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
} 