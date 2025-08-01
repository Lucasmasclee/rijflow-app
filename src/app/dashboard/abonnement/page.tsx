'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Car,
  LogOut,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  CreditCard,
  Calendar,
  Clock,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { STRIPE_PRODUCTS, hasActiveSubscription, isTrialExpired, getTrialDaysRemaining } from '@/lib/stripe'
import { loadStripe } from '@stripe/stripe-js'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

interface InstructorData {
  id: string
  email: string
  subscription_status?: string
  subscription_id?: string
  stripe_customer_id?: string
  trial_ends_at?: string
  subscription_ends_at?: string
}

export default function AbonnementPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [instructorData, setInstructorData] = useState<InstructorData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [cancelingSubscription, setCancelingSubscription] = useState(false)

  // Check for success/cancel from Stripe
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.user_metadata?.role === 'instructor') {
      fetchInstructorData()
    }
  }, [user])

  useEffect(() => {
    if (success && sessionId) {
      toast.success('Abonnement succesvol geactiveerd!')
      fetchInstructorData() // Refresh data
    } else if (canceled) {
      toast.error('Betaling geannuleerd')
    }
  }, [success, canceled, sessionId])

  const fetchInstructorData = async () => {
    if (!user) return

    try {
      setLoadingData(true)
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching instructor data:', error)
        return
      }

      setInstructorData(data)
    } catch (error) {
      console.error('Error fetching instructor data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSubscribe = async (priceId: string) => {
    if (!user) return

    try {
      setProcessingPayment(true)
      
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

      const { sessionId, error } = await response.json()

      if (error) {
        toast.error('Er is iets misgegaan bij het aanmaken van de betaling')
        return
      }

      // Redirect to Stripe Checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) {
          toast.error('Er is iets misgegaan bij het doorsturen naar de betaling')
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error('Er is iets misgegaan bij het aanmaken van de betaling')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!instructorData?.subscription_id) return

    try {
      setCancelingSubscription(true)
      
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: instructorData.subscription_id,
        }),
      })

      const { success, error } = await response.json()

      if (success) {
        toast.success('Abonnement succesvol opgezegd')
        fetchInstructorData() // Refresh data
      } else {
        toast.error(error || 'Er is iets misgegaan bij het opzeggen van het abonnement')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast.error('Er is iets misgegaan bij het opzeggen van het abonnement')
    } finally {
      setCancelingSubscription(false)
    }
  }

  const getSubscriptionStatusText = () => {
    if (!instructorData) return 'Laden...'

    const status = instructorData.subscription_status
    const trialDays = getTrialDaysRemaining(instructorData.trial_ends_at)
    const isExpired = isTrialExpired(instructorData.trial_ends_at)

    if (status === 'trial' && !isExpired) {
      return `Gratis proefperiode (${trialDays} dagen over)`
    } else if (status === 'active') {
      return 'Actief abonnement'
    } else if (status === 'past_due') {
      return 'Betaling achterstallig'
    } else if (status === 'canceled') {
      return 'Abonnement opgezegd'
    } else if (isExpired) {
      return 'Proefperiode verlopen'
    } else {
      return 'Geen actief abonnement'
    }
  }

  const getSubscriptionStatusColor = () => {
    if (!instructorData) return 'text-gray-500'

    const status = instructorData.subscription_status
    const isExpired = isTrialExpired(instructorData.trial_ends_at)

    if (status === 'trial' && !isExpired) return 'text-green-600'
    if (status === 'active') return 'text-green-600'
    if (status === 'past_due') return 'text-red-600'
    if (status === 'canceled' || isExpired) return 'text-red-600'
    return 'text-gray-500'
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-top">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const hasActive = hasActiveSubscription(instructorData?.subscription_status)
  const isExpired = isTrialExpired(instructorData?.trial_ends_at)

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

        {/* Account Information */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Account Informatie</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Rol</label>
              <p className="text-gray-900 capitalize">
                {user.user_metadata?.role || 'instructor'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Abonnement Status</label>
              <p className={`font-medium ${getSubscriptionStatusColor()}`}>
                {getSubscriptionStatusText()}
              </p>
            </div>
          </div>
        </div>

        {/* Current Subscription Info */}
        {instructorData && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">Huidig Abonnement</h3>
            <div className="space-y-3">
              {instructorData.trial_ends_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Proefperiode eindigt: {new Date(instructorData.trial_ends_at).toLocaleDateString('nl-NL')}
                  </span>
                </div>
              )}
              {instructorData.subscription_ends_at && instructorData.subscription_status !== 'trial' && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Abonnement eindigt: {new Date(instructorData.subscription_ends_at).toLocaleDateString('nl-NL')}
                  </span>
                </div>
              )}
              {instructorData.subscription_id && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Abonnement ID: {instructorData.subscription_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subscription Plans */}
        {!hasActive && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">Kies een Abonnement</h3>
            <p className="text-gray-600 mb-4">
              {isExpired 
                ? 'Je proefperiode is verlopen. Kies een abonnement om door te gaan.'
                : 'Start met een 60-dagen gratis proefperiode, geen betalingsgegevens vereist.'
              }
            </p>
            
            <div className="space-y-4">
              {/* Monthly Plan */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-lg">{STRIPE_PRODUCTS.MONTHLY.name}</h4>
                    <p className="text-gray-600 text-sm">Maandelijks gefactureerd</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">€{STRIPE_PRODUCTS.MONTHLY.price}</div>
                    <div className="text-sm text-gray-500">per maand</div>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>60 dagen gratis proefperiode</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Onbeperkt aantal leerlingen</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>AI weekplanning</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>SMS notificaties</span>
                  </li>
                </ul>
                <button
                  onClick={() => handleSubscribe(STRIPE_PRODUCTS.MONTHLY.priceId)}
                  disabled={processingPayment}
                  className="btn btn-primary w-full"
                >
                  {processingPayment ? 'Verwerken...' : 'Kies Maandelijks'}
                </button>
              </div>

              {/* Yearly Plan */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{STRIPE_PRODUCTS.YEARLY.name}</h4>
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">25% KORTING</span>
                    </div>
                    <p className="text-gray-600 text-sm">Jaarlijks gefactureerd</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">€{STRIPE_PRODUCTS.YEARLY.price}</div>
                    <div className="text-sm text-gray-500">per maand</div>
                    <div className="text-xs text-gray-400">€{STRIPE_PRODUCTS.YEARLY.totalYearly}/jaar</div>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>60 dagen gratis proefperiode</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Onbeperkt aantal leerlingen</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>AI weekplanning</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>SMS notificaties</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>25% korting t.o.v. maandelijks</span>
                  </li>
                </ul>
                <button
                  onClick={() => handleSubscribe(STRIPE_PRODUCTS.YEARLY.priceId)}
                  disabled={processingPayment}
                  className="btn btn-primary w-full"
                >
                  {processingPayment ? 'Verwerken...' : 'Kies Jaarlijks'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Current Subscription */}
        {hasActive && instructorData?.subscription_id && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Beheer Abonnement</h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Abonnement beheren</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Om je abonnement te wijzigen of op te zeggen, ga naar je Stripe dashboard of neem contact op met support.
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleCancelSubscription}
                disabled={cancelingSubscription}
                className="btn btn-secondary w-full"
              >
                {cancelingSubscription ? 'Opzeggen...' : 'Abonnement opzeggen'}
              </button>
            </div>
          </div>
        )}

        {/* Trial Expired Warning */}
        {isExpired && !hasActive && (
          <div className="card">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Proefperiode verlopen</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Je 60-dagen gratis proefperiode is verlopen. Kies een abonnement om door te gaan met het gebruik van RijFlow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 