"use client"
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

  if (error) return <div className="max-w-xl mx-auto mt-16 bg-white rounded-lg shadow p-8 text-center text-red-600">{error}</div>
  if (!student) return <div className="max-w-xl mx-auto mt-16 bg-white rounded-lg shadow p-8 text-center">Laden...</div>
  if (success) return <div className="max-w-xl mx-auto mt-16 bg-white rounded-lg shadow p-8 text-center text-green-700">Account aangemaakt! Je wordt doorgestuurd naar je dashboard...</div>

  return (
    <form onSubmit={handleRegister} className="max-w-xl mx-auto mt-16 bg-white rounded-lg shadow p-8 text-center space-y-4">
      <h2 className="text-2xl font-bold mb-4">Account aanmaken voor {student.first_name} {student.last_name}</h2>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        required
        onChange={e => setEmail(e.target.value)}
        className="w-full px-3 py-2 border rounded"
      />
      <input
        type="password"
        placeholder="Wachtwoord"
        value={password}
        required
        onChange={e => setPassword(e.target.value)}
        className="w-full px-3 py-2 border rounded"
      />
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded w-full">
        {loading ? 'Bezig...' : 'Account aanmaken'}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </form>
  )
} 