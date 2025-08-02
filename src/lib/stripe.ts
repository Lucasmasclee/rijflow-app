import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'
import { Subscription } from '@/types/database'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'prod_Sn1FPtUMBuXwYF', // Replace with your actual Stripe price ID
    name: 'Maandelijks',
    price: 39.99,
    interval: 'month',
    description: '€39,99 per maand'
  },
  yearly: {
    id: 'prod_Sn1GtLUeQ0wpHC', // Replace with your actual Stripe price ID
    name: 'Jaarlijks',
    price: 359.88,
    interval: 'year',
    description: '€359,88 per jaar (25% korting)'
  }
} as const

// Trial period in days
export const TRIAL_PERIOD_DAYS = 60

// Helper function to calculate trial end date
export const calculateTrialEndDate = (): Date => {
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + TRIAL_PERIOD_DAYS)
  return trialEnd
}

// Helper function to check if user is in trial period
export const isInTrialPeriod = (trialEndsAt: string | null): boolean => {
  if (!trialEndsAt) return false
  const trialEnd = new Date(trialEndsAt)
  const now = new Date()
  return now < trialEnd
}

// Helper function to check if user has active subscription
export const hasActiveSubscription = (subscription: Subscription | null): boolean => {
  if (!subscription) return false
  
  // Check if in trial period
  if (subscription.subscription_status === 'trial' && isInTrialPeriod(subscription.trial_ends_at || null)) {
    return true
  }
  
  // Check if subscription is active
  return subscription.subscription_status === 'active' || subscription.subscription_status === 'trialing'
} 