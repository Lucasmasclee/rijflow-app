"use client"
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Create a service role client for invite lookups (bypasses RLS)
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
      console.log('Looking for student with invite_token:', inviteToken)
      
      // First, let's see what columns exist in the students table
      const { data: tableInfo, error: tableError } = await supabase
        .from('students')
        .select('*')
        .limit(1)
      
      console.log('Table structure sample:', tableInfo)
      console.log('Table error:', tableError)
      
      // Check if invite_token column exists by trying to select it specifically
      const { data: columnCheck, error: columnError } = await supabase
        .from('students')
        .select('invite_token')
        .limit(1)
      
      console.log('Column check result:', { columnCheck, columnError })
      
      // Try a different approach - get all students and filter client-side
      console.log('Trying alternative approach...')
      const { data: allStudents, error: allStudentsError } = await supabaseService
        .from('students')
        .select('*')
      
      console.log('All students query result:', { allStudents, allStudentsError })
      
      if (allStudentsError) {
        console.error('Error fetching all students:', allStudentsError)
        
        // Fallback: try direct invite token lookup
        console.log('Trying direct invite token lookup...')
        const { data: directResult, error: directError } = await supabaseService
          .from('students')
          .select('*')
          .eq('invite_token', inviteToken)
          .single()
        
        console.log('Direct lookup result:', { directResult, directError })
        
        if (directError) {
          setError(`Database fout: ${directError.message}`)
          return
        }
        
        if (directResult) {
          console.log('Found student via direct lookup:', directResult)
          setStudent(directResult)
          return
        } else {
          setError('Ongeldige of verlopen uitnodiging.')
          return
        }
      }
      
      if (allStudents && allStudents.length > 0) {
        console.log('Found students in database:', allStudents.length)
        console.log('Students:', allStudents)
        
        // Find the student with matching invite token
        const foundStudent = allStudents.find(student => student.invite_token === inviteToken)
        
        if (foundStudent) {
          console.log('Found matching student:', foundStudent)
          setStudent(foundStudent)
        } else {
          console.log('No student found with invite token:', inviteToken)
          console.log('Available invite tokens:', allStudents.map(s => s.invite_token))
          setError('Ongeldige of verlopen uitnodiging.')
        }
      } else {
        console.log('No students found in database')
        setError('Geen studenten gevonden in de database.')
      }
    }
    fetchStudent()
  }, [inviteToken])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Determine the redirect URL - use current origin if available, otherwise use production URL
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/signin`
      : 'https://rijflow-app.vercel.app/auth/signin'
    
    // Registreer de leerling als Supabase user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'student', student_id: student.id },
        emailRedirectTo: redirectUrl
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