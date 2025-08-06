'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { checkAndUpdateSubscriptionStatus, getRedirectPath } from '@/lib/subscription-utils'

interface SubscriptionCheckProps {
  children: React.ReactNode
}

export default function SubscriptionCheck({ children }: SubscriptionCheckProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

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
        // Check and update subscription status
        const subscriptionStatus = await checkAndUpdateSubscriptionStatus(user.id)
        
        if (!subscriptionStatus) {
          console.error('Failed to check subscription status')
          setCheckingSubscription(false)
          return
        }

        // Get the appropriate redirect path based on subscription status and schedule settings
        const path = await getRedirectPath(user.id, subscriptionStatus)
        
        if (path) {
          setRedirectPath(path)
          setShouldRedirect(true)
        } else {
          setCheckingSubscription(false)
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
        setCheckingSubscription(false)
      }
    }

    checkSubscription()
  }, [user, loading])

  // Handle redirect after subscription check
  useEffect(() => {
    if (shouldRedirect && redirectPath) {
      router.push(redirectPath)
    }
  }, [shouldRedirect, redirectPath, router])

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