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
    // Extra logging
    console.log('user object:', data?.user)
    console.log('user metadata:', data?.user?.user_metadata)
    // Fallback voor rol
    const userId = data?.user?.id
    const userRole = data?.user?.user_metadata?.role || data?.user?.role || null
    console.log('userId:', userId)
    console.log('userRole:', userRole)
    if (userId) {
      const { data: userRows, error: userSelectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .limit(1)
      if (userSelectError) {
        console.error('User select error:', userSelectError)
        throw userSelectError
      }
      if (!userRows || userRows.length === 0) {
        // Voeg toe aan users-tabel
        const insertData = { id: userId, email, role: userRole }
        console.log('Inserting into users:', insertData)
        const { error: insertError } = await supabase
          .from('users')
          .insert([insertData])
        if (insertError) {
          console.error('Insert error (users):', insertError)
          throw insertError
        }
      }
      // Voeg toe aan instructeurs-tabel als rol 'instructor' en nog niet aanwezig
      if (userRole === 'instructor') {
        const { data: instrRows, error: instrSelectError } = await supabase
          .from('instructeurs')
          .select('id')
          .eq('id', userId)
          .limit(1)
        if (instrSelectError) {
          console.error('Instructeur select error:', instrSelectError)
          throw instrSelectError
        }
        if (!instrRows || instrRows.length === 0) {
          console.log('Inserting into instructeurs:', { id: userId, email })
          const { error: insertInstrError } = await supabase
            .from('instructeurs')
            .insert([{ id: userId, email }])
          if (insertInstrError) {
            console.error('Insert error (instructeurs):', insertInstrError)
            throw insertInstrError
          }
        }
      }
    }
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
    // Geen insert meer in instructeurs-tabel hier
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