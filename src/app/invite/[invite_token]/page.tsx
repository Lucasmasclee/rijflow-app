"use client"
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { User, Mail, Lock, Check, AlertCircle } from 'lucide-react'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function InvitePage({ params }: { params: Promise<{ invite_token: string }> }) {
  const router = useRouter()
  const { signUp } = useAuth()
  const [inviteToken, setInviteToken] = useState<string>('')
  const [student, setStudent] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Get params and set invite token
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setInviteToken(resolvedParams.invite_token)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (!inviteToken) return
    
    const fetchStudent = async () => {
      console.log('Looking for student with invite_token:', inviteToken)
      
      try {
        // Direct query for the specific student with the invite token
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('invite_token', inviteToken)
          .single()
        
        console.log('Query result:', { student, error })
        
        if (error) {
          console.error('Database error:', error)
          if (error.code === 'PGRST116') {
            // No rows returned
            setError('Ongeldige of verlopen uitnodiging.')
          } else {
            setError(`Database fout: ${error.message}`)
          }
          return
        }
        
        if (student) {
          console.log('Found student:', student)
          setStudent(student)
        } else {
          setError('Ongeldige of verlopen uitnodiging.')
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        setError('Er is een onverwachte fout opgetreden.')
      }
    }
    
    fetchStudent()
  }, [inviteToken])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      console.log('Starting registration for student:', student.id)
      
      // Registreer de leerling als Supabase user via AuthContext
      await signUp(email, password, 'student', student.id)
      
      console.log('Registration completed successfully')
      
      // Log de gebruiker automatisch in na registratie
      console.log('Auto-signing in user after registration...')
      await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      setSuccess(true)
      
      // Redirect naar dashboard na korte delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Registration error:', error)
      setError(error.message || 'Er is iets misgegaan bij het aanmaken van je account.')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-top">
        <div className="container-mobile">
          <div className="card text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Uitnodiging ongeldig</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-top">
        <div className="container-mobile">
          <div className="card text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Laden...</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-top">
        <div className="container-mobile">
          <div className="card text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Account aangemaakt!</h2>
            <p className="text-gray-600">Je wordt doorgestuurd naar je dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-top">
      <div className="container-mobile">
        <div className="card">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account aanmaken
            </h1>
            <p className="text-gray-600">
              Voor {student.first_name} {student.last_name || ''}
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mailadres
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="jouw@email.nl"
                  value={email}
                  required
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Minimaal 6 karakters"
                  value={password}
                  required
                  minLength={6}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Account aanmaken...
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  Account aanmaken
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Door je account aan te maken ga je akkoord met onze voorwaarden en privacybeleid.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 