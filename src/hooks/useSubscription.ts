import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { hasActiveSubscription, isTrialExpired, getTrialDaysRemaining } from '@/lib/stripe'

interface InstructorData {
  id: string
  subscription_status?: string
  trial_ends_at?: string
  subscription_ends_at?: string
  subscription_id?: string
}

export function useSubscription() {
  const { user } = useAuth()
  const [instructorData, setInstructorData] = useState<InstructorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && user.user_metadata?.role === 'instructor') {
      fetchInstructorData()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchInstructorData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('instructors')
        .select('id, subscription_status, trial_ends_at, subscription_ends_at, subscription_id')
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
      setLoading(false)
    }
  }

  const hasActive = hasActiveSubscription(instructorData?.subscription_status)
  const isExpired = isTrialExpired(instructorData?.trial_ends_at)
  const trialDaysRemaining = getTrialDaysRemaining(instructorData?.trial_ends_at)

  return {
    instructorData,
    loading,
    hasActiveSubscription: hasActive,
    isTrialExpired: isExpired,
    trialDaysRemaining,
    refetch: fetchInstructorData
  }
} 