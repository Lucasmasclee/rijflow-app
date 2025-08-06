'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types/database'
import { checkAndUpdateSubscriptionStatus, shouldRedirectToSubscription } from '@/lib/subscription-utils'

interface AuthContextType {
  user: User | null
  loading: boolean
  mounted: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: 'instructor' | 'student', student_id?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || undefined,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at,
          user_metadata: session.user.user_metadata
        }
        setUser(user)
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || undefined,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at,
            user_metadata: session.user.user_metadata
          }
          setUser(user)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    // Extra logging voor debugging
    console.log('user object:', data?.user)
    console.log('user metadata:', data?.user?.user_metadata)

    // --- Instructeur toevoegen bij eerste login ---
    const user = data?.user
    if (user && user.user_metadata?.role === 'instructor') {
      // Check of instructeur al bestaat
      const { data: existing, error: selectError } = await supabase
        .from('instructors')
        .select('id, abonnement, start_free_trial, subscription_status')
        .eq('id', user.id)
        .single()
      if (selectError && selectError.code !== 'PGRST116') {
        // Alleen loggen als het een andere error is dan 'not found'
        console.error('Fout bij check op bestaande instructeur:', selectError)
      }
      if (!existing) {
        // Voeg toe aan instructors-tabel met default values
        const { error: insertError } = await supabase.from('instructors').insert([
          {
            id: user.id,
            email: user.email,
            rijschoolnaam: 'Mijn Rijschool',
            abonnement: 'no_subscription',
            subscription_status: 'inactive'
          }
        ])
        if (insertError) {
          console.error('Kon instructeur niet toevoegen aan instructors-tabel bij eerste login:', insertError)
        }
      }

      // Check subscription status and redirect accordingly (voor zowel nieuwe als bestaande instructeurs)
      const subscriptionStatus = await checkAndUpdateSubscriptionStatus(user.id)
      
      if (subscriptionStatus) {
        // Check if user should be redirected to subscription page
        if (shouldRedirectToSubscription(subscriptionStatus)) {
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard/abonnement'
          }
          return
        } else {
          // User has active subscription, redirect to dashboard
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard'
          }
          return
        }
      }

      // Check of instructeur al standaard beschikbaarheid heeft ingesteld
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('standard_availability')
        .select('id')
        .eq('instructor_id', user.id)
        .single()

      // Als er geen standaard beschikbaarheid is ingesteld, stuur naar schedule-settings
      if (availabilityError && availabilityError.code === 'PGRST116') {
        // Redirect naar schedule-settings pagina voor nieuwe instructeurs
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard/schedule-settings'
        }
      }
    }
  }

  const signUp = async (email: string, password: string, role: 'instructor' | 'student', student_id?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
        },
      },
    })
    if (error) throw error
    
    // Voeg instructeur toe aan instructors-tabel als rol 'instructor' is
    if (role === 'instructor' && data?.user) {
      console.log('👨‍🏫 Adding instructor to database...')
      
      const { error: insertError } = await supabase.from('instructors').insert([
        {
          id: data.user.id,
          email: data.user.email,
          rijschoolnaam: 'Mijn Rijschool',
          abonnement: 'no_subscription',
          subscription_status: 'inactive'
        }
      ])
      
      if (insertError) {
        console.error('❌ Instructor insert error:', insertError)
        console.error('Error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        })
        // Je kunt hier eventueel een rollback doen of een waarschuwing loggen
        console.error('Kon instructeur niet toevoegen aan instructors-tabel:', insertError)
        // throw insertError // optioneel, afhankelijk van gewenste UX
      } else {
        console.log('✅ Instructor added to database successfully')
      }
    }

    // --- Student koppelen bij eerste signup ---
    if (role === 'student' && data?.user && student_id) {
      // Update de student met de user_id
      const { error: updateError } = await supabase
        .from('students')
        .update({ 
          user_id: data.user.id, 
          email: data.user.email 
        })
        .eq('id', student_id)
      
      if (updateError) {
        console.error('Kon student niet koppelen aan user_id bij signup:', updateError)
      } else {
        console.log('Student succesvol gekoppeld aan user_id:', data.user.id)
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, mounted, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 