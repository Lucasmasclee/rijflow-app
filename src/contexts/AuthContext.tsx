'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
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

      // Check subscription status and redirect accordingly
      if (existing) {
        // If no subscription or trial expired, redirect to subscription page
        if (!existing.abonnement || existing.abonnement === 'no_subscription') {
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard/abonnement'
          }
          return
        }

        // Check if basic subscription trial has expired
        if (existing.abonnement.startsWith('basic-') && existing.start_free_trial) {
          const trialStartDate = new Date(existing.start_free_trial)
          const currentDate = new Date()
          const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysSinceTrialStart > 60) {
            if (typeof window !== 'undefined') {
              window.location.href = '/dashboard/abonnement'
            }
            return
          }
        }

        // Check if premium subscription is active
        if (existing.abonnement.startsWith('premium-') && existing.subscription_status !== 'active') {
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard/abonnement'
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

    // --- Student koppelen bij eerste login ---
    if (user && user.user_metadata?.role === 'student' && user.user_metadata?.student_id) {
      // Check of student al gekoppeld is aan een user_id
      const { data: existingStudent, error: selectError } = await supabase
        .from('students')
        .select('id, user_id')
        .eq('id', user.user_metadata.student_id)
        .single()
      
      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Fout bij check op bestaande student:', selectError)
      }
      
      // Als student nog geen user_id heeft, koppel deze dan
      if (existingStudent && (!existingStudent.user_id || existingStudent.user_id === null)) {
        const { error: updateError } = await supabase
          .from('students')
          .update({ user_id: user.id, email: user.email })
          .eq('id', user.user_metadata.student_id)
        
        if (updateError) {
          console.error('Kon student niet koppelen aan user_id bij eerste login:', updateError)
        } else {
          console.log('Student succesvol gekoppeld aan user_id:', user.id)
        }
      }
    }
  }

  const signUp = async (email: string, password: string, role: 'instructor' | 'student', student_id?: string) => {
    console.log('🔧 AuthContext signUp called with:', { email, role, student_id })
    
    // Determine the redirect URL - use current origin if available, otherwise use production URL
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/signin`
      : 'https://rijflow.nl/auth/signin'
    
    console.log('🔗 Redirect URL:', redirectUrl)
    
    // Prepare user metadata
    const userMetadata: any = { role }
    if (role === 'student' && student_id) {
      userMetadata.student_id = student_id
    }
    
    console.log('📋 User metadata:', userMetadata)
    
    console.log('📞 Calling Supabase auth.signUp...')
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
        emailRedirectTo: redirectUrl
      },
    })
    
    console.log('📊 Supabase auth response:', { 
      hasData: !!data, 
      hasUser: !!data?.user, 
      userId: data?.user?.id,
      hasError: !!signUpError 
    })
    
    if (signUpError) {
      console.error('❌ Supabase auth signUp error:', signUpError)
      throw signUpError
    }
    
    console.log('✅ Supabase auth signUp successful')
    
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
    // Return a default context instead of throwing an error
    return {
      user: null,
      loading: false,
      mounted: false,
      signIn: async () => {},
      signUp: async (email: string, password: string, role: 'instructor' | 'student', student_id?: string) => {},
      signOut: async () => {}
    }
  }
  return context
} 