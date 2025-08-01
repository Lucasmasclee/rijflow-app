'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Student, Lesson } from '@/types/database'
import { calculateLessonCount, getDefaultLessonDuration } from '@/lib/lesson-utils'
import toast from 'react-hot-toast'

interface LessonWithStudent extends Lesson {
  student?: {
    id: string
    first_name: string
    last_name: string
    address: string
  }
}

interface LessonFormData {
  id?: string
  date: string
  startTime: string
  endTime: string
  studentId: string
  notes: string
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function DayOverviewPage({ params }: { params: Promise<{ date: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [lessons, setLessons] = useState<LessonWithStudent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonWithStudent | null>(null)
  const [lessonForm, setLessonForm] = useState<LessonFormData>({
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    studentId: '',
    notes: ''
  })
  const [resolvedParams, setResolvedParams] = useState<{ date: string } | null>(null)

  // Resolve params when component mounts
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  // Parse the date from URL params
  const selectedDate = resolvedParams ? new Date(resolvedParams.date) : new Date()
  const formattedDate = selectedDate.toLocaleDateString('nl-NL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Fetch students from database
  const fetchStudents = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('instructor_id', user.id)
        .order('first_name', { ascending: true })

      if (error) {
        console.error('Error fetching students:', error)
        toast.error('Fout bij het laden van leerlingen')
        return
      }

      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Fout bij het laden van leerlingen')
    }
  }

  // Fetch lessons for the specific date
  const fetchLessons = async () => {
    if (!user) return
    
    try {
      setLoadingLessons(true)
      
      const dateString = resolvedParams?.date || ''
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            address
          )
        `)
        .eq('instructor_id', user.id)
        .eq('date', dateString)
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching lessons:', error)
        toast.error('Fout bij het laden van lessen')
        return
      }

      // Transform the data to flatten the student information
      const transformedData = (data || []).map(lesson => ({
        ...lesson,
        student: lesson.students
      }))

      setLessons(transformedData)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      toast.error('Fout bij het laden van lessen')
    } finally {
      setLoadingLessons(false)
    }
  }

  useEffect(() => {
    if (user && !loading && resolvedParams) {
      fetchStudents()
      fetchLessons()
    }
  }, [user, loading, resolvedParams])

  const formatTime = (time: string) => {
    if (!time) return ''
    
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      const [hours, minutes] = time.split(':')
      return `${hours.padStart(2, '0')}:${minutes}`
    }
    
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(time)) {
      return time.substring(0, 5)
    }
    
    if (/^\d{1,2}:\d{2}:\d{2}\.\d+$/.test(time)) {
      return time.substring(0, 5)
    }
    
    try {
      const [hours, minutes] = time.split(':')
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    } catch {
      return time
    }
  }

  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
  }

  const openAddLesson = () => {
    setLessonForm({
      date: resolvedParams?.date || '',
      startTime: '09:00',
      endTime: '10:00',
      studentId: '',
      notes: ''
    })
    setEditingLesson(null)
    setShowAddLesson(true)
  }

  const openEditLesson = (lesson: LessonWithStudent) => {
    setLessonForm({
      id: lesson.id,
      date: lesson.date,
      startTime: lesson.start_time,
      endTime: lesson.end_time,
      studentId: lesson.student_id,
      notes: lesson.notes || ''
    })
    setEditingLesson(lesson)
    setShowAddLesson(true)
  }

  const duplicateLesson = (lesson: LessonWithStudent) => {
    setLessonForm({
      date: lesson.date,
      startTime: lesson.start_time,
      endTime: lesson.end_time,
      studentId: lesson.student_id,
      notes: lesson.notes || ''
    })
    setEditingLesson(null)
    setShowAddLesson(true)
  }

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Weet je zeker dat je deze les wilt verwijderen?')) return
    
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId)
        .eq('instructor_id', user?.id)

      if (error) {
        console.error('Error deleting lesson:', error)
        toast.error('Fout bij het verwijderen van de les')
        return
      }

      toast.success('Les succesvol verwijderd')
      fetchLessons()
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Fout bij het verwijderen van de les')
    }
  }

  const saveLesson = async () => {
    if (!user) return
    
    if (!lessonForm.date || !lessonForm.startTime || !lessonForm.endTime || !lessonForm.studentId) {
      toast.error('Vul alle verplichte velden in')
      return
    }

    try {
      // Calculate the number of lessons based on duration
      const defaultLessonDuration = await getDefaultLessonDuration(user.id)
      const lessonCount = calculateLessonCount(lessonForm.startTime, lessonForm.endTime, defaultLessonDuration)

      if (editingLesson) {
        // Update existing lesson
        const { error } = await supabase
          .from('lessons')
          .update({
            date: lessonForm.date,
            start_time: lessonForm.startTime,
            end_time: lessonForm.endTime,
            student_id: lessonForm.studentId,
            notes: lessonForm.notes,
            lessen_geregistreerd: lessonCount
          })
          .eq('id', editingLesson.id)
          .eq('instructor_id', user.id)

        if (error) {
          console.error('Error updating lesson:', error)
          toast.error('Fout bij het bijwerken van de les')
          return
        }

        toast.success('Les succesvol bijgewerkt')
      } else {
        // Create new lesson
        const { error } = await supabase
          .from('lessons')
          .insert({
            instructor_id: user.id,
            date: lessonForm.date,
            start_time: lessonForm.startTime,
            end_time: lessonForm.endTime,
            student_id: lessonForm.studentId,
            notes: lessonForm.notes,
            lessen_geregistreerd: lessonCount
          })

        if (error) {
          console.error('Error creating lesson:', error)
          toast.error('Fout bij het aanmaken van de les')
          return
        }

        toast.success('Les succesvol aangemaakt')
      }

      setShowAddLesson(false)
      fetchLessons()
    } catch (error) {
      console.error('Error saving lesson:', error)
      toast.error('Fout bij het opslaan van de les')
    }
  }

  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate)
    prevDay.setDate(selectedDate.getDate() - 1)
    router.push(`/dashboard/day-overview/${prevDay.toISOString().split('T')[0]}`)
  }

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate)
    nextDay.setDate(selectedDate.getDate() + 1)
    router.push(`/dashboard/day-overview/${nextDay.toISOString().split('T')[0]}`)
  }

  const goToToday = () => {
    const today = new Date()
    router.push(`/dashboard/day-overview/${today.toISOString().split('T')[0]}`)
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
              <Link href="/dashboard/lessons" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Terug naar lessen</span>
              </Link>
            </div>
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Dagoverzicht</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Dagoverzicht
          </h1>
          <p className="text-gray-600">
            {formattedDate}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Snelle acties</h3>
          <div className="space-y-3">
            <button
              onClick={openAddLesson}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nieuwe les plannen
            </button>
          </div>
        </div>

        {/* Day Navigation */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {formattedDate}
              </h2>
              <button
                onClick={goToToday}
                className="text-sm text-blue-600 hover:text-blue-700 mt-1"
              >
                Ga naar vandaag
              </button>
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Lessons */}
        <div className="space-y-4">
          {loadingLessons ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Lessen laden...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="card">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geen lessen gepland</h3>
                <p className="text-gray-500 mb-6">Er zijn geen lessen gepland voor deze dag</p>
                <button
                  onClick={openAddLesson}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Les toevoegen
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {lessons.length} {lessons.length === 1 ? 'les' : 'lessen'} gepland
                </h3>
                <button
                  onClick={openAddLesson}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Les toevoegen
                </button>
              </div>

              <div className="space-y-4">
                {lessons.map((lesson, index) => {
                  const student = lesson.student || students.find(s => s.id === lesson.student_id)
                  return (
                    <div key={lesson.id} className="card">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <span className="text-lg font-semibold text-gray-900">
                            {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {student?.address && (
                            <button
                              onClick={() => openGoogleMaps(student.address)}
                              className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Google Maps
                            </button>
                          )}
                          <div className="relative">
                            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => openEditLesson(lesson)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  Bewerken
                                </button>
                                <button
                                  onClick={() => duplicateLesson(lesson)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Copy className="h-4 w-4" />
                                  Dupliceren
                                </button>
                                <button
                                  onClick={() => deleteLesson(lesson.id)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Verwijderen
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-900 font-medium">
                            {student ? `${student.first_name} ${student.last_name || ''}` : 'Onbekende leerling'}
                          </span>
                        </div>
                        
                        {student?.address && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600 text-sm">{student.address}</span>
                          </div>
                        )}
                        
                        {lesson.notes && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-700">{lesson.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Lesson Modal */}
      {showAddLesson && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLesson ? 'Les bewerken' : 'Nieuwe les'}
              </h3>
              <button
                onClick={() => setShowAddLesson(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum *
                </label>
                <input
                  type="date"
                  value={lessonForm.date}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starttijd *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={lessonForm.startTime.split(':')[0]}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d{0,2}$/.test(value)) {
                          const minutes = lessonForm.startTime.split(':')[1] || '00'
                          setLessonForm(prev => ({ ...prev, startTime: `${value}:${minutes}` }))
                        }
                      }}
                      onBlur={(e) => {
                        let numValue = parseInt(e.target.value, 10)
                        if (isNaN(numValue) || numValue < 0) {
                          numValue = 0
                        } else if (numValue > 23) {
                          numValue = 23
                        }
                        const formattedValue = numValue.toString().padStart(2, '0')
                        const minutes = lessonForm.startTime.split(':')[1] || '00'
                        setLessonForm(prev => ({ ...prev, startTime: `${formattedValue}:${minutes}` }))
                      }}
                      className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      placeholder="HH"
                    />
                    <span className="text-gray-500 font-medium">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={lessonForm.startTime.split(':')[1]}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d{0,2}$/.test(value)) {
                          const hours = lessonForm.startTime.split(':')[0] || '09'
                          setLessonForm(prev => ({ ...prev, startTime: `${hours}:${value}` }))
                        }
                      }}
                      onBlur={(e) => {
                        let numValue = parseInt(e.target.value, 10)
                        if (isNaN(numValue) || numValue < 0) {
                          numValue = 0
                        } else if (numValue > 59) {
                          numValue = 59
                        }
                        const formattedValue = numValue.toString().padStart(2, '0')
                        const hours = lessonForm.startTime.split(':')[0] || '09'
                        setLessonForm(prev => ({ ...prev, startTime: `${hours}:${formattedValue}` }))
                      }}
                      className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      placeholder="MM"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eindtijd *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={lessonForm.endTime.split(':')[0]}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d{0,2}$/.test(value)) {
                          const minutes = lessonForm.endTime.split(':')[1] || '00'
                          setLessonForm(prev => ({ ...prev, endTime: `${value}:${minutes}` }))
                        }
                      }}
                      onBlur={(e) => {
                        let numValue = parseInt(e.target.value, 10)
                        if (isNaN(numValue) || numValue < 0) {
                          numValue = 0
                        } else if (numValue > 23) {
                          numValue = 23
                        }
                        const formattedValue = numValue.toString().padStart(2, '0')
                        const minutes = lessonForm.endTime.split(':')[1] || '00'
                        setLessonForm(prev => ({ ...prev, endTime: `${formattedValue}:${minutes}` }))
                      }}
                      className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      placeholder="HH"
                    />
                    <span className="text-gray-500 font-medium">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={lessonForm.endTime.split(':')[1]}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d{0,2}$/.test(value)) {
                          const hours = lessonForm.endTime.split(':')[0] || '17'
                          setLessonForm(prev => ({ ...prev, endTime: `${hours}:${value}` }))
                        }
                      }}
                      onBlur={(e) => {
                        let numValue = parseInt(e.target.value, 10)
                        if (isNaN(numValue) || numValue < 0) {
                          numValue = 0
                        } else if (numValue > 59) {
                          numValue = 59
                        }
                        const formattedValue = numValue.toString().padStart(2, '0')
                        const hours = lessonForm.endTime.split(':')[0] || '17'
                        setLessonForm(prev => ({ ...prev, endTime: `${hours}:${formattedValue}` }))
                      }}
                      className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      placeholder="MM"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leerling *
                </label>
                <select
                  value={lessonForm.studentId}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecteer een leerling</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name || ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notities
                </label>
                <textarea
                  value={lessonForm.notes}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optionele notities voor deze les..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddLesson(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                Annuleren
              </button>
              <button
                onClick={saveLesson}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingLesson ? 'Bijwerken' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 