import { ReactNode } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import UpgradePrompt from './UpgradePrompt'

interface SubscriptionGuardProps {
  children: ReactNode
  feature: string
  requiredLevel: 'basic' | 'premium' | 'ai'
  message?: string
  showUpgradePrompt?: boolean
}

export default function SubscriptionGuard({ 
  children, 
  feature, 
  requiredLevel, 
  message,
  showUpgradePrompt = true 
}: SubscriptionGuardProps) {
  const { canAccessFeature, loading } = useSubscription()

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (!canAccessFeature(requiredLevel)) {
    if (showUpgradePrompt) {
      return (
        <div className="space-y-4">
          <UpgradePrompt 
            feature={feature}
            message={message}
          />
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        </div>
      )
    }
    
    return null
  }

  return <>{children}</>
} 