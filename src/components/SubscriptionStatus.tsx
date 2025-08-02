import { useSubscription } from '@/hooks/useSubscription'
import { Crown, Calendar, Check, AlertCircle } from 'lucide-react'

interface SubscriptionStatusProps {
  className?: string
  showDetails?: boolean
}

export default function SubscriptionStatus({ 
  className = "",
  showDetails = false 
}: SubscriptionStatusProps) {
  const { 
    subscriptionData, 
    loading, 
    isInTrial, 
    getTrialDaysLeft, 
    getSubscriptionTier,
    getSubscriptionStatus 
  } = useSubscription()

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    )
  }

  if (!subscriptionData) {
    return null
  }

  const { subscription } = subscriptionData
  const trialDaysLeft = getTrialDaysLeft()
  const tier = getSubscriptionTier()
  const status = getSubscriptionStatus()

  const getStatusIcon = () => {
    if (isInTrial()) {
      return <Calendar className="h-4 w-4 text-blue-500" />
    }
    
    if (status === 'active') {
      return <Check className="h-4 w-4 text-green-500" />
    }
    
    if (status === 'canceled' || subscription.cancel_at_period_end) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    
    return <Crown className="h-4 w-4 text-yellow-500" />
  }

  const getStatusText = () => {
    if (isInTrial()) {
      return `Proefperiode (${trialDaysLeft} dagen)`
    }
    
    if (status === 'active') {
      return 'Actief'
    }
    
    if (status === 'canceled' || subscription.cancel_at_period_end) {
      return 'Geannuleerd'
    }
    
    return 'Inactief'
  }

  const getTierText = () => {
    const tierNames = {
      free: 'Gratis',
      monthly: 'Maandelijks',
      yearly: 'Jaarlijks'
    }
    return tierNames[tier] || 'Onbekend'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          {getTierText()}
        </span>
        
        {showDetails && (
          <span className="text-xs text-gray-500">
            {getStatusText()}
          </span>
        )}
      </div>
    </div>
  )
} 