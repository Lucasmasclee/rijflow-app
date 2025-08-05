'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Instructeur } from '@/types/database'

interface SubscriptionCheckProps {
  children: React.ReactNode
}

export default function SubscriptionCheck({ children }: SubscriptionCheckProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    const checkSubscription = async () => {
      if (loading || !user) {
        setCheckingSubscription(false)
        return
      }

      // Only check subscription for instructors
      if (user.user_metadata?.role !== 'instructor') {
        setCheckingSubscription(false)
        return
      }

      try {
        // Fetch instructor data including subscription info
        const { data: instructor, error } = await supabase
          .from('instructors')
          .select('abonnement, start_free_trial, subscription_status')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching instructor subscription data:', error)
          setCheckingSubscription(false)
          return
        }

        // If no subscription data exists, redirect to subscription page
        if (!instructor.abonnement || instructor.abonnement === 'no_subscription') {
          setShouldRedirect(true)
          return
        }

        // Check if user has basic subscription and trial period has expired
        if (instructor.abonnement.startsWith('basic-')) {
          if (instructor.start_free_trial) {
            const trialStartDate = new Date(instructor.start_free_trial)
            const currentDate = new Date()
            const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24))
            
            // If trial period is more than 60 days, redirect to subscription page
            if (daysSinceTrialStart > 60) {
              setShouldRedirect(true)
              return
            }
          }
        }

        // If user has premium subscription or valid basic subscription, allow access
        if (instructor.abonnement.startsWith('premium-') || 
            (instructor.abonnement.startsWith('basic-') && instructor.subscription_status === 'active')) {
          setCheckingSubscription(false)
          return
        }

        // Default case: redirect to subscription page
        setShouldRedirect(true)
      } catch (error) {
        console.error('Error checking subscription:', error)
        setCheckingSubscription(false)
      }
    }

    checkSubscription()
  }, [user, loading])

  // Handle redirect after subscription check
  useEffect(() => {
    if (shouldRedirect) {
      router.push('/dashboard/abonnement')
    }
  }, [shouldRedirect, router])

  if (loading || checkingSubscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-top">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Controleer abonnement...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 