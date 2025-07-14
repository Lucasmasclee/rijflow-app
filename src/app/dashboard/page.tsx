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
  User
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

  // Fetch lessons for current week
  const fetchLessons = async () => {
    if (!user) return
    
    try {
      setLoadingLessons(true)
      
      // Get current week (Monday to Sunday)
      const today = new Date()
      const currentDay = today.getDay()
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
      const monday = new Date(today)
      monday.setDate(today.getDate() + mondayOffset)
      monday.setHours(0, 0, 0, 0)
      
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      
      const startDate = monday.toISOString().split('T')[0]
      const endDate = sunday.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            address,
            notes
          )
        `)
        .eq('instructor_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
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

  // Fetch progress notes for a specific student
  const fetchProgressNotes = async (studentId: string) => {
    if (!user) return []
    
    try {
      const { data, error } = await supabase
        .from('progress_notes')
        .select('*')
        .eq('student_id', studentId)
        .eq('instructor_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5) // Only fetch the 5 most recent notes

      if (error) {
        console.error('Error fetching progress notes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching progress notes:', error)
      return []
    }
  }

  useEffect(() => {
    if (user) {
      fetchStudents()
      fetchLessons()
    }
  }, [user])

  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
  }

  const getWeekDays = () => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    // Calculate offset to get to Monday (Monday = 1, so if currentDay is 0 (Sunday), we need -6, otherwise 1 - currentDay)
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
    
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + mondayOffset + i)
      
      const isToday = date.toDateString() === today.toDateString()
      const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' })
      const dayDate = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
      
      // Get actual lesson count for this day
      const dayDateString = date.toISOString().split('T')[0]
      const dayLessons = lessons.filter(lesson => lesson.date === dayDateString)
      
      weekDays.push({
        name: dayName,
        date: dayDate,
        isToday,
        lessons: dayLessons.length
      })
    }
    
    return weekDays
  }

  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev)
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId)
      } else {
        newSet.add(lessonId)
      }
      return newSet
    })
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

  // ExpandedLessonView component
  const ExpandedLessonView = ({ lesson, student, onClose }: { 
    lesson: any, 
    student: any, 
    onClose: () => void 
  }) => {
    const [progressNotes, setProgressNotes] = useState<any[]>([])
    const [loadingProgressNotes, setLoadingProgressNotes] = useState(true)
    const [newProgressNote, setNewProgressNote] = useState('')
    const [savingProgressNote, setSavingProgressNote] = useState(false)

    // Fetch progress notes when component mounts
    useEffect(() => {
      const loadProgressNotes = async () => {
        if (student?.id) {
          setLoadingProgressNotes(true)
          const notes = await fetchProgressNotes(student.id)
          setProgressNotes(notes)
          setLoadingProgressNotes(false)
        }
      }
      loadProgressNotes()
    }, [student?.id])

    const handleAddProgressNote = async () => {
      if (!newProgressNote.trim() || !user || !student?.id) return

      setSavingProgressNote(true)
      try {
        const { data, error } = await supabase
          .from('progress_notes')
          .insert({
            student_id: student.id,
            instructor_id: user.id,
            lesson_id: lesson.id,
            date: new Date().toISOString().split('T')[0],
            notes: newProgressNote.trim()
          })
          .select()

        if (error) {
          console.error('Error adding progress note:', error)
          return
        }

        if (data) {
          setProgressNotes(prev => [data[0], ...prev])
          setNewProgressNote('')
        }
      } catch (error) {
        console.error('Error adding progress note:', error)
      } finally {
        setSavingProgressNote(false)
      }
    }

    return (
      <div className="border-t border-blue-200 bg-white p-4 space-y-4">
        {/* Algemene notities van de leerling (alleen zichtbaar) */}
        {student?.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Algemene notities {student.first_name}
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {student.notes}
              </p>
            </div>
          </div>
        )}
        
        {/* Notities van deze les (alleen zichtbaar) */}
        {lesson.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Notities van deze les
            </h4>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {lesson.notes}
              </p>
            </div>
          </div>
        )}

        {/* Voortgangsnotities (zichtbaar en bewerkbaar) */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Voortgangsnotities
          </h4>
          
          {/* Add new progress note */}
          <div className="mb-3">
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={newProgressNote}
                onChange={(e) => setNewProgressNote(e.target.value)}
                placeholder="Voeg een voortgangsnotitie toe..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleAddProgressNote}
                disabled={savingProgressNote || !newProgressNote.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium"
              >
                {savingProgressNote ? '...' : 'Toevoegen'}
              </button>
            </div>
          </div>

          {/* Progress notes list */}
          {loadingProgressNotes ? (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">Laden...</p>
            </div>
          ) : progressNotes.length === 0 ? (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">Nog geen voortgangsnotities</p>
            </div>
          ) : (
            <div className="space-y-2">
              {progressNotes.slice(0, 3).map((note) => (
                <div key={note.id} className="bg-green-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-gray-500">
                      {new Date(note.date).toLocaleDateString('nl-NL')}
                    </span>
                  </div>
                  <p className="text-gray-900 whitespace-pre-wrap text-sm">{note.notes}</p>
                </div>
              ))}
              {progressNotes.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  En nog {progressNotes.length - 3} meer voortgangsnotities
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Als er geen notities zijn */}
        {!student?.notes && !lesson.notes && progressNotes.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              Geen notities beschikbaar voor deze les
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
    <div className="bg-white rounded-lg shadow-sm">
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousDay}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Vorige dag"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedDate.toLocaleDateString('nl-NL', { weekday: 'long' }).charAt(0).toUpperCase() + selectedDate.toLocaleDateString('nl-NL', { weekday: 'long' }).slice(1)} {selectedDate.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })}
          </h2>
          <button
            onClick={goToNextDay}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volgende dag"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Vandaag
        </button>
      </div>
    </div>
    <div className="p-6">
      {(() => {
        const selectedDateString = selectedDate.toISOString().split('T')[0]
        const selectedDateLessons = lessons.filter(lesson => lesson.date === selectedDateString)
        const isToday = selectedDate.toDateString() === new Date().toDateString()
        
        if (selectedDateLessons.length === 0) {
          return (
            <div className="text-center py-10">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {isToday 
                  ? 'Nog geen lessen gepland voor vandaag'
                  : `Nog geen lessen gepland voor ${selectedDate.toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: '2-digit' })}`
                }
              </p>
              <p className="text-sm text-gray-400 mt-1">Plan je eerste les om te beginnen</p>
            </div>
          )
        } else {
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedDateLessons.length} {selectedDateLessons.length === 1 ? 'les' : 'lessen'} {isToday ? 'vandaag' : 'op deze dag'}
                </h3>
                <Link
                  href="/dashboard/week-overview"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Bekijk alle lessen →
                </Link>
              </div>
              <div className="space-y-3">
                {selectedDateLessons.slice(0, 3).map((lesson, index) => {
                  const student = lesson.students || students.find(s => s.id === lesson.student_id)
                  const isExpanded = expandedLessons.has(lesson.id)
                  
                  return (
                    <div key={index} className="bg-blue-50 rounded-lg overflow-hidden">
                      {/* Ingeklapte versie */}
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => toggleLessonExpansion(lesson.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {lesson.start_time.substring(0, 5)} - {lesson.end_time.substring(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/dashboard/students/${student?.id}`}
                            className="text-sm text-gray-600 underline hover:text-gray-900 transition-colors"
                          >
                            {student?.first_name || 'Onbekende leerling'}
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openGoogleMaps(student?.address || '')
                            }}
                            className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                            title="Open in Google Maps"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Maps
                          </button>
                          <div className="p-1 text-gray-400">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Uitgeklapte versie */}
                      {isExpanded && (
                        <ExpandedLessonView 
                          lesson={lesson} 
                          student={student} 
                          onClose={() => toggleLessonExpansion(lesson.id)}
                        />
                      )}
                    </div>
                  )
                })}
                {selectedDateLessons.length > 3 && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      En nog {selectedDateLessons.length - 3} {selectedDateLessons.length - 3 === 1 ? 'les' : 'lessen'} meer
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        }
      })()}
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
        {loadingLessons ? (
          // Loading state
          Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="text-center">
              <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-2"></div>
                  <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          getWeekDays().map((day, index) => (
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
          ))
        )}
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
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const activeStudentIds = new Set(lessons.map(lesson => lesson.student_id))
                      return activeStudentIds.size
                    })()}
                  </p>
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
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Beschikbaarheid komende weken</h2>
        <p className="text-sm text-gray-600 mt-1">Vul hieronder je beschikbaarheid per week in</p>
      </div>
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center text-gray-500">Laden...</div>
        ) : weeks.map((week, idx) => (
          <div key={idx} className="flex flex-col md:flex-row md:items-center md:gap-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="w-full md:w-1/3 mb-2 md:mb-0 font-medium text-gray-800">
              Week {idx + 1}: {formatWeekRange(week.start, week.end)}
            </div>
            <div className="flex-1">
              <textarea
                className="w-full min-h-[48px] border border-gray-300 rounded-lg p-2 text-sm bg-white"
                placeholder="Beschikbaarheid voor deze week..."
                value={notes[idx]}
                onChange={e => setNotes(prev => { const newArr = [...prev]; newArr[idx] = e.target.value; return newArr })}
                onBlur={() => handleNoteSave(idx)}
                disabled={savingIdx === idx}
              />
              {savingIdx === idx && <div className="text-xs text-blue-500 mt-1">Opslaan...</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 