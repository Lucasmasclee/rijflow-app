'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Car, LogOut, Check, X, CreditCard, Calendar, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe'
import { getStripe } from '@/lib/stripe'
import toast from 'react-hot-toast'

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

export default function AbonnementPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchSubscription()
    
    // Show success/error messages from URL params
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      toast.success('Abonnement succesvol aangemaakt!')
    } else if (canceled === 'true') {
      toast.error('Abonnement aanmaken geannuleerd')
    }
  }, [searchParams])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/get-subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionData(data)
      } else {
        console.error('Failed to fetch subscription')
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/signin')
  }

  const handleSubscribe = async (priceId: string) => {
    if (!user) return

    setProcessing(true)
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      const stripe = await getStripe()
      
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) {
          toast.error('Er is een fout opgetreden bij het redirecten naar de betalingspagina')
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error('Er is een fout opgetreden bij het aanmaken van het abonnement')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscriptionData?.subscription.stripe_subscription_id) return

    setProcessing(true)
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscriptionData.subscription.stripe_subscription_id,
        }),
      })

      if (response.ok) {
        toast.success('Abonnement succesvol geannuleerd')
        fetchSubscription() // Refresh subscription data
      } else {
        toast.error('Er is een fout opgetreden bij het annuleren van het abonnement')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast.error('Er is een fout opgetreden bij het annuleren van het abonnement')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = () => {
    if (!subscriptionData) return null

    const { subscription, isInTrial, trialDaysLeft } = subscriptionData

    if (isInTrial) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          <Calendar className="w-4 h-4 mr-1" />
          Proefperiode ({trialDaysLeft} dagen over)
        </div>
      )
    }

    if (subscription.subscription_status === 'active') {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <Check className="w-4 h-4 mr-1" />
          Actief
        </div>
      )
    }

    if (subscription.subscription_status === 'canceled' || subscription.cancel_at_period_end) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <X className="w-4 h-4 mr-1" />
          Geannuleerd
        </div>
      )
    }

    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        <AlertCircle className="w-4 h-4 mr-1" />
        {subscription.subscription_status}
      </div>
    )
  }

  const getCurrentPlanName = () => {
    if (!subscriptionData) return 'Geen abonnement'
    
    const { subscription } = subscriptionData
    const planNames = {
      free: 'Gratis',
      monthly: 'Maandelijks',
      yearly: 'Jaarlijks'
    }
    
    return planNames[subscription.subscription_tier] || 'Onbekend'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container-mobile py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Navigation */}
      <nav className="bg-white shadow-sm border-b safe-area-top">
        <div className="container-mobile">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
                <span>Terug</span>
              </Link>
            </div>
            
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">RijFlow</span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Uitloggen</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Account & Abonnement
          </h1>
          <p className="text-gray-600">
            Beheer je account en abonnement
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Account Information */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Account Informatie</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Rol</label>
                <p className="text-gray-900 capitalize">
                  {user?.user_metadata?.role || 'instructor'}
                </p>
              </div>
            </div>
          </div>

          {/* Current Subscription */}
          {subscriptionData && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Huidig Abonnement</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{getCurrentPlanName()}</p>
                    <p className="text-sm text-gray-600">
                      {subscriptionData.subscription.subscription_tier === 'free' 
                        ? 'Gratis proefperiode van 60 dagen'
                        : subscriptionData.subscription.subscription_tier === 'monthly'
                        ? '€39,99 per maand'
                        : '€359,88 per jaar'
                      }
                    </p>
                  </div>
                  {getStatusBadge()}
                </div>

                {subscriptionData.subscription.current_period_end && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Volgende factuur:</span>{' '}
                    {new Date(subscriptionData.subscription.current_period_end).toLocaleDateString('nl-NL')}
                  </div>
                )}

                {subscriptionData.subscription.cancel_at_period_end && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      Je abonnement wordt geannuleerd aan het einde van de huidige periode.
                    </p>
                  </div>
                )}

                {subscriptionData.subscription.stripe_subscription_id && !subscriptionData.subscription.cancel_at_period_end && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={processing}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Bezig...' : 'Abonnement annuleren'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Subscription Plans */}
          {(!subscriptionData?.isActive || subscriptionData?.isInTrial) && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Kies een Abonnement</h3>
              <div className="space-y-4">
                {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                      <span className="text-lg font-bold text-blue-600">{plan.description}</span>
                    </div>
                    <ul className="text-sm text-gray-600 mb-4 space-y-1">
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        Volledige toegang tot de RijFlow app
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        Onbeperkt aantal leerlingen
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        AI-geassisteerde planning
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        SMS notificaties
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        Les planning en beheer
                      </li>
                    </ul>
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={processing}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {processing ? (
                        'Bezig...'
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          {subscriptionData?.isInTrial ? 'Upgrade naar ' : 'Kies '}{plan.name}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trial Information */}
          {subscriptionData?.isInTrial && (
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-900">Proefperiode</h3>
              <p className="text-blue-800 mb-3">
                Je gebruikt momenteel de gratis proefperiode van 60 dagen. 
                Er zijn nog {subscriptionData.trialDaysLeft} dagen over.
              </p>
              <p className="text-sm text-blue-700">
                Kies een abonnement om door te gaan na de proefperiode.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 