'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
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

function AbonnementContent() {
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

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error('Er is een fout opgetreden bij het starten van de betaling')
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

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      toast.success('Abonnement wordt geannuleerd aan het einde van de huidige periode')
      fetchInstructorData() // Refresh data
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast.error('Er is een fout opgetreden bij het annuleren van het abonnement')
    } finally {
      setCancelingSubscription(false)
    }
  }

  const getSubscriptionStatusText = () => {
    if (!instructorData) return 'Laden...'
    
    switch (instructorData.subscription_status) {
      case 'trial':
        return 'Proefperiode'
      case 'active':
        return 'Actief'
      case 'past_due':
        return 'Betaling achterstallig'
      case 'canceled':
        return 'Geannuleerd'
      case 'incomplete':
        return 'Onvolledig'
      case 'incomplete_expired':
        return 'Onvolledig verlopen'
      case 'unpaid':
        return 'Onbetaald'
      default:
        return 'Onbekend'
    }
  }

  const getSubscriptionStatusColor = () => {
    if (!instructorData) return 'text-gray-500'
    
    switch (instructorData.subscription_status) {
      case 'trial':
        return 'text-blue-600'
      case 'active':
        return 'text-green-600'
      case 'past_due':
        return 'text-red-600'
      case 'canceled':
        return 'text-gray-600'
      case 'incomplete':
        return 'text-yellow-600'
      case 'incomplete_expired':
        return 'text-red-600'
      case 'unpaid':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
  const trialDaysRemaining = getTrialDaysRemaining(instructorData?.trial_ends_at)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug naar Dashboard
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account & Abonnement</h1>
          <p className="mt-2 text-gray-600">
            Beheer je abonnement en account instellingen
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Huidige Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
              <p className="text-gray-900">{user.email}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Rol</h3>
              <p className="text-gray-900 capitalize">{user.user_metadata?.role || 'Onbekend'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Abonnement Status</h3>
              <p className={`font-medium ${getSubscriptionStatusColor()}`}>
                {getSubscriptionStatusText()}
              </p>
            </div>
            
            {instructorData?.trial_ends_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Proefperiode</h3>
                <p className="text-gray-900">
                  {isExpired 
                    ? 'Verlopen' 
                    : `${trialDaysRemaining} dagen over`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Warning for expired trial */}
          {isExpired && !hasActive && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Proefperiode verlopen</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Je proefperiode is verlopen. Kies een abonnement om door te gaan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Subscription Plans */}
        {!hasActive && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Kies een Abonnement</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Plan */}
              <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Maandelijks</h3>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">Populair</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">€{STRIPE_PRODUCTS.MONTHLY.price}</span>
                    <span className="text-gray-600 ml-1">/maand</span>
                  </div>
                </div>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Volledige functionaliteit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Onbeperkte leerlingen</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">AI planning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">SMS notificaties</span>
                  </li>
                </ul>
                
                <button
                  onClick={() => handleSubscribe(STRIPE_PRODUCTS.MONTHLY.priceId)}
                  disabled={processingPayment}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verwerken...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Maandelijks Abonnement
                    </>
                  )}
                </button>
              </div>

              {/* Yearly Plan */}
              <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                    Bespaar €120/jaar
                  </span>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Jaarlijks</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Voordelig</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">€{STRIPE_PRODUCTS.YEARLY.price}</span>
                    <span className="text-gray-600 ml-1">/maand</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    €{STRIPE_PRODUCTS.YEARLY.totalYearly}/jaar (€120 besparing)
                  </p>
                </div>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Volledige functionaliteit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Onbeperkte leerlingen</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">AI planning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">SMS notificaties</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Prioriteit support</span>
                  </li>
                </ul>
                
                <button
                  onClick={() => handleSubscribe(STRIPE_PRODUCTS.YEARLY.priceId)}
                  disabled={processingPayment}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verwerken...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Jaarlijks Abonnement
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Current Subscription */}
        {hasActive && instructorData?.subscription_id && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Beheer Abonnement</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Abonnement wijzigen</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Om je abonnement te wijzigen, annuleer eerst je huidige abonnement en kies daarna een nieuw plan.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Huidig Abonnement</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Status: <span className={`font-medium ${getSubscriptionStatusColor()}`}>
                    {getSubscriptionStatusText()}
                  </span>
                </p>
              </div>
              
              <button
                onClick={handleCancelSubscription}
                disabled={cancelingSubscription}
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {cancelingSubscription ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Annuleren...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    Abonnement Annuleren
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AbonnementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    }>
      <AbonnementContent />
    </Suspense>
  )
} 