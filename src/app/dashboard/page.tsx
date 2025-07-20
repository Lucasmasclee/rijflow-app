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
  ChevronLeft,
  Edit2,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Home,
  Menu
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Student, Instructeur } from '@/types/database'
import { toast } from 'react-hot-toast'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [userRole, setUserRole] = useState<'instructor' | 'student' | null>(null)
  const [schoolName, setSchoolName] = useState('Mijn Rijschool')
  const [isEditingSchoolName, setIsEditingSchoolName] = useState(false)
  const [editingSchoolName, setEditingSchoolName] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch instructor data including rijschoolnaam
  const fetchInstructorData = async () => {
    if (!user || user.user_metadata?.role !== 'instructor') return
    
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('rijschoolnaam')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching instructor data:', error)
        return
      }

      if (data?.rijschoolnaam) {
        setSchoolName(data.rijschoolnaam)
      }
    } catch (error) {
      console.error('Error fetching instructor data:', error)
    }
  }

  // Save rijschoolnaam to database
  const saveSchoolName = async (newName: string) => {
    if (!user || user.user_metadata?.role !== 'instructor') return
    
    try {
      const { error } = await supabase
        .from('instructors')
        .upsert({
          id: user.id,
          email: user.email,
          rijschoolnaam: newName
        })

      if (error) {
        console.error('Error saving school name:', error)
        toast.error('Fout bij het opslaan van de rijschoolnaam')
        return false
      }

      toast.success('Rijschoolnaam succesvol opgeslagen')
      return true
    } catch (error) {
      console.error('Error saving school name:', error)
      toast.error('Fout bij het opslaan van de rijschoolnaam')
      return false
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
    if (user) {
      // Get user role from user metadata
      const role = user.user_metadata?.role || 'instructor'
      setUserRole(role)
      
      // Fetch instructor data if user is instructor
      if (role === 'instructor') {
        fetchInstructorData()
      }
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

  const handleSaveSchoolName = async () => {
    if (editingSchoolName.trim()) {
      const success = await saveSchoolName(editingSchoolName.trim())
      if (success) {
        setSchoolName(editingSchoolName.trim())
      }
    }
    setIsEditingSchoolName(false)
  }

  const handleCancelEditSchoolName = () => {
    setIsEditingSchoolName(false)
    setEditingSchoolName('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-top">
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Navigation */}
      <nav className="bg-white shadow-sm border-b safe-area-top">
        <div className="container-mobile">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">RijFlow</span>
            </div>
            
            {/* Desktop Navigation */}
            {/* <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </button>
            </div> */}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="container-mobile py-4 space-y-4">
              <button
                onClick={() => {
                  handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 py-2 px-3 rounded-md text-base font-medium w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="container-mobile py-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            {isEditingSchoolName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editingSchoolName}
                  onChange={(e) => setEditingSchoolName(e.target.value)}
                  className="text-xl md:text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 flex-1"
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
                  className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={handleCancelEditSchoolName}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <h1 className="text-xl md:text-3xl font-bold text-gray-900">
                  {schoolName}
                </h1>
                {userRole === 'instructor' && (
                  <button
                    onClick={handleEditSchoolName}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
          {/* <p className="text-gray-600 mt-2">
            {userRole === 'instructor' 
              ? 'Beheer je rijschool en leerlingen op één plek'
              : 'Volg je voortgang en communiceer met je instructeur'
            }
          </p> */}
        </div>

        {userRole === 'instructor' ? (
          <InstructorDashboard />
        ) : (
          <StudentDashboard />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="nav-mobile safe-area-bottom">
        <div className="container-mobile">
          <div className="flex justify-around">
            <Link href="/dashboard" className="nav-mobile-item active">
              <Clock className="h-6 w-6" />
              <span>Dagplanning</span>
            </Link>
            <Link href="/dashboard/lessons" className="nav-mobile-item">
              <Calendar className="h-6 w-6" />
              <span>Weekplanning</span>
            </Link>
            {/* <Link href="/dashboard" className="nav-mobile-item active">
              <Home className="h-6 w-6" />
              <span>Dashboard</span>
            </Link> */}
            <Link href="/dashboard/students" className="nav-mobile-item">
              <Users className="h-6 w-6" />
              <span>Leerlingen</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}

function InstructorDashboard() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [lessons, setLessons] = useState<any[]>([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState(new Date())

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

  // Fetch lessons from database
  const fetchLessons = async () => {
    if (!user) return
    
    try {
      setLoadingLessons(true)
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            email,
            phone,
            address,
            notes
          )
        `)
        .eq('instructor_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching lessons:', error)
        return
      }

      setLessons(data || [])
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoadingLessons(false)
    }
  }

  // Fetch progress notes for a student
  const fetchProgressNotes = async (studentId: string) => {
    if (!user) return null
    
    try {
      const { data, error } = await supabase
        .from('progress_notes')
        .select('*')
        .eq('student_id', studentId)
        .eq('instructor_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching progress notes:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching progress notes:', error)
      return null
    }
  }

  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
  }

  const getWeekDays = () => {
    const days = []
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const toggleLessonExpansion = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons)
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId)
    } else {
      newExpanded.add(lessonId)
    }
    setExpandedLessons(newExpanded)
  }

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const ExpandedLessonProgressNotes = ({ lesson, student }: { 
    lesson: any, 
    student: any 
  }) => {
    const [progressNote, setProgressNote] = useState<any>(null)
    const [notesText, setNotesText] = useState('')
    const [loadingNotes, setLoadingNotes] = useState(true)
    const [saving, setSaving] = useState(false)

    const loadProgressNotes = async () => {
      setLoadingNotes(true)
      const note = await fetchProgressNotes(student.id)
      setProgressNote(note)
      
      if (note) {
        setNotesText(note.notes || '')
      } else {
        // Create a new progress note record if none exists
        if (!user) {
          setLoadingNotes(false)
          return
        }
        
        const { data: newNote, error: createError } = await supabase
          .from('progress_notes')
          .insert({
            student_id: student.id,
            instructor_id: user.id,
            notes: ''
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating progress note:', createError)
          setLoadingNotes(false)
          return
        }

        setProgressNote(newNote)
        setNotesText('')
      }
      
      setLoadingNotes(false)
    }

    const handleSaveProgressNotes = async () => {
      if (!progressNote || !user) return

      setSaving(true)
      try {
        const { error } = await supabase
          .from('progress_notes')
          .update({
            notes: notesText,
            updated_at: new Date().toISOString()
          })
          .eq('id', progressNote.id)

        if (error) {
          console.error('Error updating progress notes:', error)
          return
        }

        // Update local state
        setProgressNote((prev: any) => prev ? {
          ...prev,
          notes: notesText,
          updated_at: new Date().toISOString()
        } : null)

        toast.success('Notities opgeslagen!')
      } catch (error) {
        console.error('Error updating progress notes:', error)
        toast.error('Er is iets misgegaan bij het opslaan van de notities.')
      } finally {
        setSaving(false)
      }
    }

    useEffect(() => {
      loadProgressNotes()
    }, [])

    return (
      <div className="space-y-3">
        {loadingNotes ? (
          <p className="text-gray-500 text-sm">Laden...</p>
        ) : (
          <>
            <div>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Bijvoorbeeld:&#10;18 juli: Achteruit inparkeren&#10;25 juli: Hellingproef"
                className="w-full p-2 border border-gray-300 rounded-lg resize-none text-sm"
                rows={4}
              />
              <button
                onClick={handleSaveProgressNotes}
                disabled={saving}
                className="btn btn-primary w-full mt-2 text-sm py-1"
              >
                {saving ? 'Opslaan...' : 'Notities opslaan'}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (user) {
      fetchStudents()
      fetchLessons()
    }
  }, [user])

  const todayLessons = lessons.filter(lesson => 
    lesson.date === selectedDate.toISOString().split('T')[0]
  )

  return (
    <div className="space-y-6">
{/* Today's Lessons */}
<div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Lessen vandaag</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousDay}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Vandaag
            </button>
            <button
              onClick={goToNextDay}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          {selectedDate.toLocaleDateString('nl-NL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>

        {loadingLessons ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Lessen laden...</p>
          </div>
        ) : todayLessons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Geen lessen gepland voor vandaag</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayLessons.map((lesson) => {
              const student = lesson.students
              return (
                <div key={lesson.id} className={`border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors ${expandedLessons.has(lesson.id) ? '' : 'h-16'}`}>
                  <div 
                    className="flex justify-between items-start"
                    onClick={() => toggleLessonExpansion(lesson.id)}
                  >
                    <div className="flex-1">
                      <h4 className="text-xs flex items-center">
                        <span className="flex items-center">
                          <Link href={`/dashboard/students/${student.id}`} className="underline hover:text-blue-600 flex items-center">
                            {student.first_name}
                          </Link>
                          <span className="mx-1">|</span>
                          <span>{lesson.start_time.slice(0,5)} - {lesson.end_time.slice(0,5)}</span>
                          <span className="mx-1">|</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openGoogleMaps(student.address)
                            }}
                            className="flex items-center"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            <span className="text-xs ml-0.5">
                              {student.address.length > 12 ? student.address.slice(0, 9) + "..." : student.address}
                            </span>
                          </button>
                        </span>
                      </h4>
                    </div>
                    {/* <div className="p-2">
                      {expandedLessons.has(lesson.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div> */}
                  </div>
                  
                  {expandedLessons.has(lesson.id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-4">
                        {/* General Notes Section */}
                        {student.notes && (
                          <div>
                            <h5 className="font-semibold text-sm mb-2">Algemene notities</h5>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.notes}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Progress Notes Section */}
                        <div>
                          <h5 className="font-semibold text-sm mb-2">Voortgang</h5>
                          <ExpandedLessonProgressNotes lesson={lesson} student={student} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Stats
      <div className="mobile-grid md:grid-cols-3 gap-4">
        <div className="card text-center">
          <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{students.length}</div>
          <div className="text-sm text-gray-600">Leerlingen</div>
        </div>
        <div className="card text-center">
          <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{lessons.length}</div>
          <div className="text-sm text-gray-600">Geplande lessen</div>
        </div>
        <div className="card text-center">
          <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{todayLessons.length}</div>
          <div className="text-sm text-gray-600">Vandaag</div>
        </div>
      </div> */}

      {/* Quick Actions
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Snelle Acties</h3>
        <div className="mobile-grid md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/students/new"
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nieuwe leerling
          </Link>
          <Link
            href="/dashboard/lessons"
            className="btn btn-secondary flex items-center justify-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Les plannen
          </Link>
        </div>
      </div> */}

      

      {/* Recent Students
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Leerlingen Dashboard</h3>
          <Link href="/dashboard/students" className="text-blue-600 hover:text-blue-700 text-sm">
            Bekijk alle
          </Link>
        </div>

        {loadingStudents ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Leerlingen laden...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Nog geen leerlingen toegevoegd</p>
            <Link href="/dashboard/students/new" className="btn btn-primary mt-4">
              Eerste leerling toevoegen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {students.slice(0, 5).map((student) => (
              <Link
                key={student.id}
                href={`/dashboard/students/${student.id}`}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h4 className="font-medium">{student.first_name} {student.last_name || ''}</h4>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div> */}
    </div>
  )
}

function StudentDashboard() {
  function getMonday(d: Date) {
    const date = new Date(d)
    const day = date.getDay()
    // Calculate offset to get to Monday (Monday = 1, so if day is 0 (Sunday), we need -6, otherwise 1 - day)
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    date.setDate(diff)
    date.setHours(0,0,0,0)
    return date
  }

  // Genereer 5 weekbereiken vanaf deze week
  const weeks = Array.from({ length: 5 }, (_, i) => {
    const monday = getMonday(new Date())
    monday.setDate(monday.getDate() + i * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      start: new Date(monday),
      end: new Date(sunday),
    }
  })

  const [notes, setNotes] = useState<string[]>(Array(5).fill(''))
  const [loading, setLoading] = useState(true)
  const [savingIdx, setSavingIdx] = useState<number|null>(null)
  const [studentId, setStudentId] = useState<string|null>(null)
  const { user } = useAuth()

  // Debug log when studentId changes
  useEffect(() => {
    console.log('StudentId state changed to:', studentId)
  }, [studentId])

  // Helper om weekbereik te tonen
  function formatWeekRange(start: Date, end: Date) {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
    return `${start.toLocaleDateString('nl-NL', options)} - ${end.toLocaleDateString('nl-NL', options)}`
  }

  // Haal student ID op basis van user_id
  useEffect(() => {
    async function fetchStudentId() {
      if (!user) return
      
      try {
        console.log('Fetching student ID for user:', user.id)
        console.log('User metadata:', user.user_metadata)
        
        // Test: Check if the student exists at all
        if (user.user_metadata?.student_id) {
          console.log('Testing if student exists with ID:', user.user_metadata.student_id)
          const { data: testData, error: testError } = await supabase
            .from('students')
            .select('*')
            .eq('id', user.user_metadata.student_id)
          
          console.log('Direct student lookup result:', { testData, testError })
        }
        
        // Eerst proberen via user_id
        const { data, error } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        
        console.log('Query via user_id result:', { data, error })
        
        if (error) {
          console.error('Error fetching student ID via user_id:', error)
          
          // Als dat niet werkt, probeer via student_id in user metadata
          if (user.user_metadata?.student_id) {
            console.log('Trying via student_id from metadata:', user.user_metadata.student_id)
            
            const { data: metadataData, error: metadataError } = await supabase
              .from('students')
              .select('id')
              .eq('id', user.user_metadata.student_id)
              .maybeSingle()
            
            console.log('Query via metadata result:', { metadataData, metadataError })
            
            if (metadataError) {
              console.error('Error fetching student ID via metadata:', metadataError)
              return
            }
            
            if (metadataData) {
              console.log('Found student ID via metadata:', metadataData.id)
              setStudentId(metadataData.id)
            } else {
              console.log('No student found via metadata')
            }
          } else {
            console.log('No student_id in user metadata')
          }
          return
        }
        
        if (data) {
          console.log('Found student ID via user_id:', data.id)
          setStudentId(data.id)
        } else {
          console.log('No data found via user_id')
          // Als geen data gevonden via user_id, probeer metadata
          if (user.user_metadata?.student_id) {
            console.log('No data via user_id, trying via student_id from metadata:', user.user_metadata.student_id)
            
            const { data: metadataData, error: metadataError } = await supabase
              .from('students')
              .select('id')
              .eq('id', user.user_metadata.student_id)
              .maybeSingle()
            
            console.log('Query via metadata result:', { metadataData, metadataError })
            
            if (metadataError) {
              console.error('Error fetching student ID via metadata:', metadataError)
              return
            }
            
            if (metadataData) {
              console.log('Found student ID via metadata:', metadataData.id)
              setStudentId(metadataData.id)
              
              // Update the user_id in the database to link the student properly
              const { error: updateError } = await supabase
                .from('students')
                .update({ user_id: user.id })
                .eq('id', metadataData.id)
              
              if (updateError) {
                console.error('Error updating user_id for student:', updateError)
              } else {
                console.log('Successfully linked student to user_id')
              }
            } else {
              console.log('No student found via metadata')
            }
          } else {
            console.log('No student_id in user metadata')
          }
        }
      } catch (e) {
        console.error('Error fetching student ID:', e)
      }
    }
    
    fetchStudentId()
  }, [user])

  // Ophalen beschikbaarheid bij laden
  useEffect(() => {
    async function fetchAvailability() {
      if (!studentId) {
        console.log('No studentId available, skipping availability fetch')
        return
      }
      
      console.log('Fetching availability for studentId:', studentId)
      setLoading(true)
      try {
        const weekStarts = weeks.map(w => w.start.toISOString().slice(0,10))
        console.log('Week starts to fetch:', weekStarts)
        
        const { data, error } = await supabase
          .from('student_availability')
          .select('week_start, notes')
          .eq('student_id', studentId)
          .in('week_start', weekStarts)
        
        console.log('Availability query result:', { data, error })
        
        if (error) {
          console.error('Error fetching availability:', error)
          // Don't throw error, just set empty notes
          setNotes(Array(5).fill(''))
          return
        }
        
        const notesArr = weeks.map(w => {
          const found = data?.find((row: any) => row.week_start === w.start.toISOString().slice(0,10))
          return found ? found.notes || '' : ''
        })
        console.log('Processed notes array:', notesArr)
        setNotes(notesArr)
      } catch (e) {
        console.error('Error fetching availability:', e)
        // Set empty notes on error
        setNotes(Array(5).fill(''))
      } finally {
        setLoading(false)
        console.log('Availability fetch completed')
      }
    }
    fetchAvailability()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  // Opslaan van beschikbaarheid bij verlies van focus
  async function handleNoteSave(idx: number) {
    if (!studentId) return
    setSavingIdx(idx)
    try {
      const value = notes[idx]
      const week_start = weeks[idx].start.toISOString().slice(0,10) // YYYY-MM-DD
      const { error } = await supabase
        .from('student_availability')
        .upsert([
          {
            student_id: studentId,
            week_start,
            notes: value,
            updated_at: new Date().toISOString(),
          }
        ], { onConflict: 'student_id,week_start' })
      
      if (error) {
        console.error('Error saving availability:', error)
        // You could add a toast notification here if you want to show the error to the user
      }
    } catch (e) {
      console.error('Fout bij opslaan beschikbaarheid:', e)
    } finally {
      setSavingIdx(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Student Dashboard</h3>
        <p className="text-gray-600">
          Student functionaliteit wordt binnenkort toegevoegd.
        </p>
      </div>
    </div>
  )
} 