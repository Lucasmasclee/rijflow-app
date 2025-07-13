"use client"
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function InvitePage({ params }: { params: Promise<{ invite_token: string }> }) {
  const router = useRouter()
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
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('invite_token', inviteToken)
        .single()
      if (error || !data) setError('Ongeldige of verlopen uitnodiging.')
      else setStudent(data)
    }
    fetchStudent()
  }, [inviteToken])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Registreer de leerling als Supabase user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'student', student_id: student.id }
      }
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    // Koppel de Supabase user aan de student
    const userId = signUpData.user?.id
    if (userId) {
      await supabase.from('students').update({ user_id: userId, email }).eq('id', student.id)
      setSuccess(true)
      // Optioneel: markeer invite als gebruikt
    }
    setLoading(false)
    // Log direct in (optioneel: of stuur naar login pagina)
    router.push('/dashboard')
  }

  if (error) return <div className="max-w-xl mx-auto mt-16 bg-white rounded-lg shadow p-8 text-center text-red-600">{error}</div>
  if (!student) return <div className="max-w-xl mx-auto mt-16 bg-white rounded-lg shadow p-8 text-center">Laden...</div>
  if (success) return <div className="max-w-xl mx-auto mt-16 bg-white rounded-lg shadow p-8 text-center text-green-700">Account aangemaakt! Je kunt nu inloggen.</div>

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