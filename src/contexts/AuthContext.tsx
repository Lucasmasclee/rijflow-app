'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  mounted: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: 'instructor' | 'student') => Promise<void>
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
    // Extra logging for debugging
    console.log('user object:', data?.user)
    console.log('user metadata:', data?.user?.user_metadata)
  }

  const signUp = async (email: string, password: string, role: 'instructor' | 'student') => {
    // Determine the redirect URL - use current origin if available, otherwise use production URL
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/signin`
      : 'https://rijflow-app.vercel.app/auth/signin'
    
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
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
          // Voeg hier eventueel default values toe voor name, location, etc.
        }
      ])
      if (insertError) {
        // Je kunt hier eventueel een rollback doen of een waarschuwing loggen
        console.error('Kon instructeur niet toevoegen aan instructors-tabel:', insertError)
        // throw insertError // optioneel, afhankelijk van gewenste UX
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
      signUp: async () => {},
      signOut: async () => {}
    }
  }
  return context
} 