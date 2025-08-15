'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Users, Plus, Mail, Phone, MapPin, Calendar, MessageSquare, Edit, Trash2, Clock, X } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { calculateTotalLessonCount, calculateLessonCount, getDefaultLessonDuration } from '@/lib/lesson-utils'

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  notes: string
  created_at: string
  lessons_count: number
  last_lesson?: string
  invite_token?: string
  default_lessons_per_week?: number
  default_lesson_duration_minutes?: number
  public_token?: string
  sms_laatst_gestuurd?: string
  public_url?: string
}

interface StudentWithStats extends Student {
  lessonStats: {
    lessonsCompleted: number
    lessonsScheduled: number
  }
}

export default function StudentsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'new'>('all')
  const [deleteModalStudentId, setDeleteModalStudentId] = useState<string | null>(null)
  const [deleteModalStudentName, setDeleteModalStudentName] = useState<string>('')
  // Nieuw: state voor SMS Leerlingen modal
  const [showSmsModal, setShowSmsModal] = useState(false)
  // State voor gekozen week
  const [selectedSmsWeek, setSelectedSmsWeek] = useState<Date | null>(null)
  // State voor geselecteerde leerlingen
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  // State voor SMS verzenden
  const [sendingSms, setSendingSms] = useState(false)
  
  // Boolean to check if sms_count >= sms_limiet
  const [smsCountExceeded, setSmsCountExceeded] = useState(false)

  // Functie om sms_count te verhogen
  const incrementSmsCount = async () => {
    if (!user) return
    
    try {
      // Eerst de huidige sms_count ophalen
      const { data: currentData, error: fetchError } = await supabase
        .from('instructors')
        .select('sms_count')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        console.error('Error fetching current sms_count:', fetchError)
        return
      }

      // Huidige waarde ophalen (of 0 als null)
      const currentCount = currentData?.sms_count || 0
      const newCount = currentCount + 1

      // Update met nieuwe waarde
      const { error: updateError } = await supabase
        .from('instructors')
        .update({ 
          sms_count: newCount
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error incrementing sms_count:', updateError)
        return
      }

      console.log(`sms_count verhoogd van ${currentCount} naar ${newCount}`)
    } catch (error) {
      console.error('Error incrementing sms_count:', error)
    }
  }

  // Helper: maandag van een datum
  const getMonday = (date: Date) => {
    // Gebruik UTC methoden om tijdzone problemen te voorkomen
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()
    
    // Maak een nieuwe datum in UTC
    const newDate = new Date(Date.UTC(year, month, day))
    const dayOfWeek = newDate.getUTCDay()
    
    // Sunday is 0, Monday is 1, etc.
    // We want Monday to be the first day of the week
    // If it's Sunday (day 0), we want the next Monday (add 1)
    // If it's Monday (day 1), we want this Monday (add 0)
    // If it's Tuesday (day 2), we want last Monday (subtract 1)
    // etc.
    const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1)
    
    // Voeg dagen toe in UTC
    newDate.setUTCDate(newDate.getUTCDate() + daysToMonday)
    newDate.setUTCHours(0, 0, 0, 0)
    
    return newDate
  }

  // Helper: volgende 8 weken (vanaf volgende week)
  const getNext8Weeks = () => {
    const weeks = []
    // Gebruik lokale datum om tijdzone problemen te voorkomen
    const today = new Date()
    const currentWeekMonday = getMonday(today)
    for (let i = 0; i <= 7; i++) {
      const weekStart = new Date(currentWeekMonday)
      weekStart.setDate(currentWeekMonday.getDate() + (i * 7))
      weeks.push(weekStart)
    }
    return weeks
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

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
        toast.error('Fout bij het ophalen van leerlingen')
        return
      }

      // Fetch lesson statistics for each student
      const studentsWithStats = await Promise.all(
        (data || []).map(async (student) => {
          const lessonStats = await fetchLessonStats(student.id)
          return {
            ...student,
            lessonStats
          }
        })
      )

      setStudents(studentsWithStats)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Er is iets misgegaan bij het ophalen van leerlingen.')
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchLessonStats = async (studentId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get all lessons for this student (both completed and scheduled)
      const { data: allLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('date, lessen_geregistreerd, status')
        .eq('student_id', studentId)
        .not('status', 'eq', 'cancelled')
        .order('date', { ascending: true })

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError)
        return {
          lessonsCompleted: 0,
          lessonsScheduled: 0
        }
      }

      // Separate completed and scheduled lessons
      const completedLessons = (allLessons || []).filter(lesson => lesson.date <= today)
      const scheduledLessons = (allLessons || []).filter(lesson => lesson.date > today)

      // Sum up the stored lessen_geregistreerd values
      const completedCount = completedLessons.reduce((sum, lesson) => sum + (lesson.lessen_geregistreerd || 1), 0)
      const scheduledCount = scheduledLessons.reduce((sum, lesson) => sum + (lesson.lessen_geregistreerd || 1), 0)

      // Debug logging
      // console.log(`=== Lesson Stats for Student ${studentId} ===`)
      // console.log('Completed lessons data:', completedLessons)
      // console.log('Scheduled lessons data:', scheduledLessons)
      // console.log('Calculated completed count:', completedCount)
      // console.log('Calculated scheduled count:', scheduledCount)

      return {
        lessonsCompleted: completedCount,
        lessonsScheduled: scheduledCount
      }
    } catch (error) {
      console.error('Error fetching lesson statistics:', error)
      return {
        lessonsCompleted: 0,
        lessonsScheduled: 0
      }
    }
  }

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    setDeleteModalStudentId(studentId)
    setDeleteModalStudentName(studentName)
  }

  const confirmDeleteStudent = async () => {
    if (!deleteModalStudentId) return

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteModalStudentId)

      if (error) {
        console.error('Error deleting student:', error)
        toast.error('Fout bij het verwijderen van de leerling')
        return
      }

      toast.success('Leerling succesvol verwijderd!')
      setStudents(prev => prev.filter(student => student.id !== deleteModalStudentId))
      setDeleteModalStudentId(null)
      setDeleteModalStudentName('')
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Er is iets misgegaan bij het verwijderen van de leerling.')
    }
  }

  const cancelDeleteStudent = () => {
    setDeleteModalStudentId(null)
    setDeleteModalStudentName('')
  }

  // Helper: check if SMS was sent less than 6 days ago
  const isSmsRecentlySent = (smsDate: string | undefined) => {
    if (!smsDate) return false
    const smsTime = new Date(smsDate).getTime()
    const sixDaysAgo = new Date().getTime() - (6 * 24 * 60 * 60 * 1000)
    return smsTime > sixDaysAgo
  }

  // Helper: validate phone number
  const isValidPhoneNumber = (phone: string) => {
    const phoneRegex = /^(\+31|0)6\d{8,9}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  // Toggle student selection for SMS
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  // Send SMS to selected students
  const sendSmsToStudents = async () => {
    console.log('=== SMS SEND FRONTEND STARTED ===')
    console.log('Selected week:', selectedSmsWeek)
    console.log('Selected students:', Array.from(selectedStudents))
    
    if (!selectedSmsWeek || selectedStudents.size === 0) {
      console.log('Missing data:', { selectedSmsWeek, selectedStudentsSize: selectedStudents.size })
      return
    }

    try {
      setSendingSms(true)

      const weekStart = getMonday(selectedSmsWeek)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const weekStartStr = weekStart.toISOString().split('T')[0]
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      // Format dates exactly like in the UI
      const weekStartFormatted = weekStart.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'long'
      })
      
      const weekEndFormatted = weekEnd.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })

      const requestData = {
        studentIds: Array.from(selectedStudents),
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        weekStartFormatted: weekStartFormatted,
        weekEndFormatted: weekEndFormatted
      }

      console.log('Sending request to /api/sms/send with data:', requestData)

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const result = await response.json()
      console.log('Response result:', result)

      if (result.success) {
        console.log('SMS send successful, summary:', result.summary)
        toast.success(`SMS verzonden naar ${result.summary.successful} leerlingen`)
        
        // Verhoog sms_count voor elke succesvolle SMS
        if (result.summary && result.summary.successful > 0) {
          for (let i = 0; i < result.summary.successful; i++) {
            await incrementSmsCount()
          }
          console.log(`sms_count verhoogd met ${result.summary.successful}`)
        }
        
        // Refresh students to update sms_laatst_gestuurd
        await fetchStudents()
        
        // Close modal and reset state
        setShowSmsModal(false)
        setSelectedSmsWeek(null)
        setSelectedStudents(new Set())
      } else {
        console.error('SMS send failed:', result)
        toast.error('Fout bij het verzenden van SMS berichten')
      }
      // router.refresh()
    } catch (error) {
      console.error('Error sending SMS:', error)
      toast.error('Er is een fout opgetreden bij het verzenden van SMS')
    } finally {
      setSendingSms(false)
      console.log('=== SMS SEND FRONTEND COMPLETED ===')
      router.push('/dashboard/students')
    }
    // router.refresh()
  }

  // Check SMS count and limit when component mounts
  useEffect(() => {
    const checkSmsCount = async () => {
      if (!user) return;
      
      try {
        // Fetch instructor data to get sms_count and sms_limiet
        const { data: instructor, error } = await supabase
          .from('instructors')
          .select('sms_count, sms_limiet')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching instructor SMS data:', error);
          return;
        }

        if (instructor) {
          const currentCount = instructor.sms_count || 0;
          const limit = instructor.sms_limiet || 0;
          const exceeded = limit > 0 && currentCount >= limit;
          
          setSmsCountExceeded(exceeded);
        }
      } catch (error) {
        console.error('Error checking SMS count:', error);
      }
    };

    checkSmsCount();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStudents()
    }
  }, [user])

  // Filter students based on search term and status
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === '' || 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && student.lessonStats.lessonsCompleted > 0) ||
      (filterStatus === 'new' && student.lessonStats.lessonsCompleted === 0 && student.lessonStats.lessonsScheduled === 0)

    return matchesSearch && matchesFilter
  })

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
              <h1 className="text-xl font-semibold text-gray-900">Leerlingen</h1>
            </div>
            <Link href="/dashboard/students/new" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe leerling
            </Link>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-10">
        {/* SMS Leerlingen knop - moved to be directly above students list */}
        <div className="flex justify-end mb-4 gap-2">
          {!smsCountExceeded &&
          <button
            className={`btn ${smsCountExceeded ? 'btn-disabled opacity-50 cursor-not-allowed' : 'btn-secondary'}`}
            onClick={() => setShowSmsModal(true)}
            disabled={smsCountExceeded}
          >
            SMS Leerlingen
          </button>
          }
          
          {/* Warning message when SMS count is exceeded */}
          {smsCountExceeded && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">SMS limiet bereikt</p>
                {/* <p>Je hebt je maandelijkse SMS limiet bereikt. Upgrade je plan of neem contact op.</p> */}
              </div>
            </div>
          )}
        </div>
        
        {/* Students List */}
        <div className="space-y-3">
          {loadingStudents ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Leerlingen laden...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Geen leerlingen gevonden' : 'Nog geen leerlingen'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Probeer een andere zoekterm'
                  : 'Voeg je eerste leerling toe om te beginnen'
                }
              </p>
              {!searchTerm && (
                <Link href="/dashboard/students/new" className="btn btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste leerling toevoegen
                </Link>
              )}
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {student.first_name} {student.last_name || ''}
                      </h3>
                      {student.lessonStats.lessonsCompleted === 0 && student.lessonStats.lessonsScheduled === 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          Nieuw
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="h-4 w-4" />
                        <span className="whitespace-nowrap">{student.lessonStats.lessonsCompleted} gehad, {student.lessonStats.lessonsScheduled} ingepland</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/dashboard/students/${student.id}`}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteStudent(student.id, `${student.first_name} ${student.last_name || ''}`)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

<nav className="nav-mobile safe-area-bottom">
        <div className="container-mobile">
          <div className="flex justify-around">
            <Link href="/dashboard" className="nav-mobile-item">
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
            <Link href="/dashboard/students" className="nav-mobile-item active">
              <Users className="h-6 w-6" />
              <span>Leerlingen</span>
            </Link>
          </div>
        </div>
      </nav>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalStudentId && (
        <div className="modal-overlay" onClick={cancelDeleteStudent}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Leerling verwijderen
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Weet je zeker dat je <strong>{deleteModalStudentName}</strong> wilt verwijderen? 
                Deze actie kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteStudent}
                  className="btn btn-secondary flex-1"
                >
                  Annuleren
                </button>
                <button
                  onClick={confirmDeleteStudent}
                  className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Leerlingen Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                SMS Leerlingen
              </h3>
              <button
                onClick={() => {
                  setShowSmsModal(false)
                  setSelectedSmsWeek(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Sluiten</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Warning message when SMS count is exceeded in modal */}
            {smsCountExceeded && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">SMS limiet bereikt</p>
                    <p>Je hebt je maandelijkse SMS limiet bereikt. SMS verzending is uitgeschakeld tot de volgende factureringscyclus.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stap 1: Week-selectie */}
            {!selectedSmsWeek && (
              <div className="space-y-3 flex-1 overflow-y-auto">
                <p className="text-sm text-gray-600 mb-4">
                  Selecteer een week waarvoor je de beschikbaarheid van leerlingen wilt verzamelen:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getNext8Weeks().map((week, index) => {
                    const weekStart = getMonday(week)
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekStart.getDate() + 6)
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedSmsWeek(week)}
                        disabled={smsCountExceeded}
                        className={`w-full p-3 border border-gray-200 rounded-lg transition-colors text-left ${
                          smsCountExceeded 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {index === 0 ? 'Deze week' : index === 1 ? 'Volgende week' : 'Over ' + (index) +' Weken'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {weekStart.toLocaleDateString('nl-NL', {
                            day: '2-digit',
                            month: 'long'
                          })} - {weekEnd.toLocaleDateString('nl-NL', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stap 2: Lijst met leerlingen */}
            {selectedSmsWeek && (
              <div className="flex-1 flex flex-col">
                <p className="text-sm text-gray-600 mb-4">
                  Week: {(() => {
                    const weekStart = getMonday(selectedSmsWeek)
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekStart.getDate() + 6)
                    return `${weekStart.toLocaleDateString('nl-NL', {
                      day: '2-digit', month: 'long'
                    })} - ${weekEnd.toLocaleDateString('nl-NL', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    })}`
                  })()}
                </p>
                
                {/* Selecteer alle knop - moved to the right */}
                <div className="mb-3 flex justify-end">
                  <button
                    onClick={() => {
                      const eligibleStudents = students.filter(student => {
                        const recentlySent = isSmsRecentlySent(student.sms_laatst_gestuurd)
                        const hasValidPhone = student.phone && isValidPhoneNumber(student.phone)
                        return hasValidPhone
                      })
                      const eligibleStudentIds = eligibleStudents.map(student => student.id)
                      setSelectedStudents(new Set(eligibleStudentIds))
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Selecteer alle
                  </button>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-80">
                  {students.map(student => {
                    const recentlySent = isSmsRecentlySent(student.sms_laatst_gestuurd)
                    const hasValidPhone = student.phone && isValidPhoneNumber(student.phone)
                    const isSelected = selectedStudents.has(student.id)
                    const canSelect = hasValidPhone

                    return (
                      <div key={student.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {student.phone || <span className="italic text-red-500">Geen telefoonnummer</span>}
                          </div>
                          {!hasValidPhone && student.phone && (
                            <div className="text-xs text-red-600 mt-1">
                              Ongeldig telefoonnummer formaat
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {canSelect ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                          ) : (
                            <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                              Geen telefoon
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  {selectedStudents.size > 0 ? (
                    <p>{selectedStudents.size} leerling{selectedStudents.size !== 1 ? 'en' : ''} geselecteerd</p>
                  ) : (
                    <p>Selecteer leerlingen om SMS te sturen</p>
                  )}
                </div>

                <div className="flex justify-between mt-4">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedSmsWeek(null)
                      setSelectedStudents(new Set())
                    }}
                  >
                    Terug
                  </button>
                  <button
                    onClick={sendSmsToStudents}
                    disabled={selectedStudents.size === 0 || sendingSms}
                    className="btn btn-primary disabled:bg-gray-400"
                  >
                    {sendingSms ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Verzenden...
                      </>
                    ) : (
                      `Stuur SMS (${selectedStudents.size})`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 