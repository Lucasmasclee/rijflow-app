'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Calendar, 
  Users, 
  FileText, 
  MessageSquare, 
  Clock, 
  Settings,
  LogOut,
  Car,
  Plus,
  ChevronRight,
  Edit2,
  Check,
  X
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Student } from '@/types/database'

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [userRole, setUserRole] = useState<'instructor' | 'student' | null>(null)
  const [schoolName, setSchoolName] = useState('Mijn Rijschool')
  const [isEditingSchoolName, setIsEditingSchoolName] = useState(false)
  const [editingSchoolName, setEditingSchoolName] = useState('')
  const [dbTestResult, setDbTestResult] = useState<string>('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
    if (user) {
      // Get user role from user metadata
      const role = user.user_metadata?.role || 'instructor'
      setUserRole(role)
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleEditSchoolName = () => {
    setIsEditingSchoolName(true)
    setEditingSchoolName(schoolName)
  }

  const handleSaveSchoolName = () => {
    if (editingSchoolName.trim()) {
      setSchoolName(editingSchoolName.trim())
    }
    setIsEditingSchoolName(false)
  }

  const handleCancelEditSchoolName = () => {
    setIsEditingSchoolName(false)
    setEditingSchoolName('')
  }

  const testDatabase = async () => {
    if (!user) return
    
    console.log('Testing database access...')
    setDbTestResult('Testing...')
    
    try {
      // Test 1: Check if we can read from students table
      const { data: readData, error: readError } = await supabase
        .from('students')
        .select('*')
        .limit(5)
      
      console.log('Read test:', { readData, readError })
      
      // Test 2: Try to insert a test record
      const testStudent = {
        first_name: 'Test',
        last_name: 'Student',
        email: 'test@example.com',
        phone: '0612345678',
        address: 'Test Address',
        instructor_id: user.id,
        invite_token: 'test-token-' + Date.now(),
        user_id: null
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('students')
        .insert([testStudent])
        .select()
      
      console.log('Insert test:', { insertData, insertError })
      
      // Test 3: Check table structure
      const { data: structureData, error: structureError } = await supabase
        .from('students')
        .select('*')
        .limit(1)
      
      console.log('Structure test:', { structureData, structureError })
      
      let result = 'Database Test Results:\n'
      result += `Read test: ${readError ? 'FAILED - ' + readError.message : 'SUCCESS'}\n`
      result += `Insert test: ${insertError ? 'FAILED - ' + insertError.message : 'SUCCESS'}\n`
      result += `Structure test: ${structureError ? 'FAILED - ' + structureError.message : 'SUCCESS'}\n`
      
      if (insertData) {
        result += `\nTest student created with ID: ${insertData[0]?.id}`
        
        // Clean up test data
        await supabase
          .from('students')
          .delete()
          .eq('email', 'test@example.com')
      }
      
      setDbTestResult(result)
      
    } catch (error) {
      console.error('Database test failed:', error)
      setDbTestResult(`Test failed: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">RijFlow</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={testDatabase}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Test Database
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            {isEditingSchoolName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingSchoolName}
                  onChange={(e) => setEditingSchoolName(e.target.value)}
                  className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveSchoolName()
                    } else if (e.key === 'Escape') {
                      handleCancelEditSchoolName()
                    }
                  }}
                />
                <button
                  onClick={handleSaveSchoolName}
                  className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={handleCancelEditSchoolName}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {schoolName}
                </h1>
                {userRole === 'instructor' && (
                  <button
                    onClick={handleEditSchoolName}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-2">
            {userRole === 'instructor' 
              ? 'Beheer je rijschool en leerlingen op één plek'
              : 'Volg je voortgang en communiceer met je instructeur'
            }
          </p>
          
          {/* Database Test Results */}
          {dbTestResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Database Test Resultaten:</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{dbTestResult}</pre>
            </div>
          )}
        </div>

        {userRole === 'instructor' ? (
          <InstructorDashboard />
        ) : (
          <StudentDashboard />
        )}
      </div>
    </div>
  )
}

function InstructorDashboard() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Fetch students from database
  const fetchStudents = async () => {
    if (!user) return
    
    try {
      setLoadingStudents(true)
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('instructor_id', user.id)
        .order('first_name', { ascending: true })

      if (error) {
        console.error('Error fetching students:', error)
        return
      }

      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchStudents()
    }
  }, [user])

  const getWeekDays = () => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay // Adjust for Monday start
    
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + mondayOffset + i)
      
      const isToday = date.toDateString() === today.toDateString()
      const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' })
      const dayDate = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
      
      // TODO: Replace with actual lesson count from database
      // For now, showing 0 lessons since user just registered
      const lessons = 0
      
      weekDays.push({
        name: dayName,
        date: dayDate,
        isToday,
        lessons
      })
    }
    
    return weekDays
  }

  return (
    <>
    <div className="bg-white rounded-lg shadow-sm">
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">
        {new Date().toLocaleDateString('nl-NL', { weekday: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleDateString('nl-NL', { weekday: 'long' }).slice(1)} {new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })}
      </h2>
    </div>
    <div className="p-6">
      <div className="text-center py-10">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Nog geen lessen gepland voor vandaag</p>
        <p className="text-sm text-gray-400 mt-1">Plan je eerste les om te beginnen</p>
      </div>
    </div>
  </div>

  {/* Week Overview */}
  <div className="bg-white rounded-lg shadow-sm mt-6">
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Weekoverzicht</h2>
        <Link
          href="/dashboard/week-overview"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Naar weekoverzicht
        </Link>
      </div>
    </div>
    <div className="p-6">
      <div className="grid grid-cols-7 gap-4">
        {getWeekDays().map((day, index) => (
          <div key={index} className="text-center">
            <div className={`p-4 rounded-lg border-2 ${
              day.isToday 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <p className={`text-sm font-medium ${
                day.isToday ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {day.name}
              </p>
              <p className={`text-xs ${
                day.isToday ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {day.date}
              </p>
              <div className="mt-2">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  day.lessons > 0 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {day.lessons}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>

          <div className="space-y-8 mt-8">
        {/* Leerlingen overzicht */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Leerlingen overzicht</h2>
              <Link
                href="/dashboard/students"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users className="h-4 w-4" />
                Leerlingen beheren
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center p-4 border border-gray-200 rounded-lg">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Totaal leerlingen</p>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                </div>
              </div>
              <div className="flex items-center p-4 border border-gray-200 rounded-lg">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Nieuwe chats</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
              <div className="flex items-center p-4 border border-gray-200 rounded-lg">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Actieve leerlingen</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Actieve leerlingen</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lessen vandaag</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Uren deze week</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Openstaande facturen</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Beheer rijschool */}
      {/* <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Beheer rijschool</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/students/new"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Nieuwe leerling</p>
                <p className="text-sm text-gray-600">Voeg leerling toe</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
            </Link>
            <Link
              href="/dashboard/lessons/new"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Calendar className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Les plannen</p>
                <p className="text-sm text-gray-600">Nieuwe afspraak</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
            </Link>
            <Link
              href="/dashboard/invoices"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <FileText className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Facturen</p>
                <p className="text-sm text-gray-600">Beheer facturatie</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Settings className="h-6 w-6 text-gray-600" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Instellingen</p>
                <p className="text-sm text-gray-600">Rijschool profiel</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
            </Link>
          </div>
        </div>
      </div> */}
    </div>
    </>
  )
}

function StudentDashboard() {
  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Geplande lessen</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Uren gereden</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Nieuwe berichten</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Lesson */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Volgende les</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Morgen, 14:00 - 15:00</p>
              <p className="text-sm text-gray-600">Instructeur: Jan Jansen</p>
              <p className="text-sm text-gray-600">Locatie: CBR Amsterdam</p>
            </div>
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
              Bevestigd
            </span>
          </div>
        </div>
      </div>

      {/* Recent Progress */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recente voortgang</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Parkeren</p>
                <p className="text-sm text-gray-600">Gisteren geoefend</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Goed
              </span>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Kijkgedrag</p>
                <p className="text-sm text-gray-600">Vorige week geoefend</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                Meer oefening nodig
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Snelle acties</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/dashboard/availability"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Calendar className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Beschikbaarheid</p>
                <p className="text-sm text-gray-600">Update je agenda</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
            </Link>
            <Link
              href="/dashboard/chat"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <MessageSquare className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Chat</p>
                <p className="text-sm text-gray-600">Bericht je instructeur</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 