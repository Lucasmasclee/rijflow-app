import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, X, Check } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'

interface UpgradePromptProps {
  feature: string
  message?: string
  showTrialInfo?: boolean
  className?: string
}

export default function UpgradePrompt({ 
  feature, 
  message = "Je proefperiode is afgelopen. Kies een abonnement om door te gaan.",
  showTrialInfo = true,
  className = ""
}: UpgradePromptProps) {
  const router = useRouter()
  const { subscriptionData, isInTrial, getTrialDaysLeft } = useSubscription()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleUpgrade = () => {
    router.push('/dashboard/abonnement')
  }

  const trialDaysLeft = getTrialDaysLeft()

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Crown className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              {feature}
            </h3>
            <p className="text-blue-800 mb-3">
              {message}
            </p>
            
            {showTrialInfo && isInTrial() && trialDaysLeft && (
              <div className="bg-blue-100 border border-blue-300 rounded-md p-3 mb-3">
                <p className="text-sm text-blue-800">
                  <strong>Proefperiode:</strong> Je hebt nog {trialDaysLeft} dagen over in je gratis proefperiode.
                </p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-blue-700">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Volledige toegang tot de RijFlow app
              </div>
              <div className="flex items-center text-sm text-blue-700">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Onbeperkt aantal leerlingen
              </div>
              <div className="flex items-center text-sm text-blue-700">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                AI-geassisteerde planning
              </div>
              <div className="flex items-center text-sm text-blue-700">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                SMS notificaties
              </div>
              <div className="flex items-center text-sm text-blue-700">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Les planning en beheer
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleUpgrade}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {isInTrial() ? 'Upgrade nu' : 'Kies abonnement'}
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-blue-600 hover:text-blue-800 px-4 py-2 rounded-md transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
} 