'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  mounted: boolean
  signIn: (email: string, password: string) => Promise<any>
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
        .select('id')
        .eq('id', user.id)
        .single()
      if (selectError && selectError.code !== 'PGRST116') {
        // Alleen loggen als het een andere error is dan 'not found'
        console.error('Fout bij check op bestaande instructeur:', selectError)
      }
      if (!existing) {
        // Voeg toe aan instructors-tabel
        const { error: insertError } = await supabase.from('instructors').insert([
          {
            id: user.id,
            email: user.email,
            rijschoolnaam: 'Mijn Rijschool'
          }
        ])
        if (insertError) {
          console.error('Kon instructeur niet toevoegen aan instructors-tabel bij eerste login:', insertError)
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
        // Don't redirect here, let the middleware handle it
        console.log('New instructor - will be redirected to schedule-settings')
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

    // Return the user data for the signIn function
    return data
  }

  const signUp = async (email: string, password: string, role: 'instructor' | 'student', student_id?: string) => {
    // Determine the redirect URL - use current origin if available, otherwise use production URL
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/signin`
      : 'https://rijflow.nl/auth/signin'
    
    // Prepare user metadata
    const userMetadata: any = { role }
    if (role === 'student' && student_id) {
      userMetadata.student_id = student_id
    }
    
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
        emailRedirectTo: redirectUrl
      },
    })
    if (signUpError) throw signUpError
    // Voeg instructeur toe aan instructors-tabel als rol 'instructor' is
    if (role === 'instructor' && data?.user) {
      // Vul hier eventueel meer velden in als gewenst
      const { error: insertError } = await supabase.from('instructors').insert([
        {
          id: data.user.id,
          email: data.user.email,
          rijschoolnaam: 'Mijn Rijschool'
        }
      ])
      if (insertError) {
        // Je kunt hier eventueel een rollback doen of een waarschuwing loggen
        console.error('Kon instructeur niet toevoegen aan instructors-tabel:', insertError)
        // throw insertError // optioneel, afhankelijk van gewenste UX
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