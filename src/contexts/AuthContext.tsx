'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: 'instructor' | 'student') => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    // Na succesvolle login: check of user in users-tabel staat, zo niet: voeg toe
    const userId = data?.user?.id
    console.log('userId:', userId)
    if (userId) {
      const { data: userRows, error: userSelectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .limit(1)
      if (userSelectError) throw userSelectError
      if (!userRows || userRows.length === 0) {
        // Voeg toe aan users-tabel
        const insertData = { id: userId, email, role: data?.user?.user_metadata?.role }
        console.log('insert data:', insertData)
        const { error: insertError } = await supabase
          .from('users')
          .insert([insertData])
        if (insertError) {
          console.error('Insert error:', insertError)
          throw insertError
        }
      }
    }
  }

  const signUp = async (email: string, password: string, role: 'instructor' | 'student') => {
    // Alleen registreren, geen insert meer in users-tabel
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    })
    if (signUpError) throw signUpError
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
      signIn: async () => {},
      signUp: async () => {},
      signOut: async () => {}
    }
  }
  return context
} 