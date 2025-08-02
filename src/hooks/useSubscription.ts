import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { hasActiveSubscription, isInTrialPeriod } from '@/lib/stripe'

interface Subscription {
  id: string
  user_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid'
  subscription_tier: 'free' | 'monthly' | 'yearly'
  trial_ends_at?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  created_at: string
  updated_at: string
}

interface SubscriptionData {
  subscription: Subscription
  isActive: boolean
  isInTrial: boolean
  trialDaysLeft: number | null
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/stripe/get-subscription')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const data = await response.json()
      setSubscriptionData(data)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [user])

  const refreshSubscription = () => {
    fetchSubscription()
  }

  const isSubscriptionActive = () => {
    if (!subscriptionData) return false
    return subscriptionData.isActive
  }

  const isInTrial = () => {
    if (!subscriptionData) return false
    return subscriptionData.isInTrial
  }

  const getTrialDaysLeft = () => {
    if (!subscriptionData) return null
    return subscriptionData.trialDaysLeft
  }

  const getSubscriptionTier = () => {
    if (!subscriptionData) return 'free'
    return subscriptionData.subscription.subscription_tier
  }

  const getSubscriptionStatus = () => {
    if (!subscriptionData) return null
    return subscriptionData.subscription.subscription_status
  }

  const canAccessFeature = (feature: 'basic' | 'premium' | 'ai') => {
    if (!subscriptionData) return false
    
    const { isActive, isInTrial } = subscriptionData
    
    // All features require active subscription or trial
    return isActive || isInTrial
  }

  return {
    subscriptionData,
    loading,
    error,
    refreshSubscription,
    isSubscriptionActive,
    isInTrial,
    getTrialDaysLeft,
    getSubscriptionTier,
    getSubscriptionStatus,
    canAccessFeature,
  }
} 