'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Settings,
  Copy,
  X,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Student, Lesson } from '@/types/database'
import toast from 'react-hot-toast'

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  // (day + 6) % 7: Maandag=0, Zondag=6
  const diff = d.getDate() - ((day + 6) % 7)
  d.setDate(diff)
  d.setHours(0,0,0,0)
  return d
}

// Helper function to compare dates properly, handling timezone issues
function isSameDate(date1: Date | string, date2: Date | string): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  
  // Set both dates to midnight in local timezone for comparison
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  
  return d1.getTime() === d2.getTime()
}

interface LessonFormData {
  id?: string
  date: string
  startTime: string
  endTime: string
  studentId: string
  notes: string
}

interface DayViewLesson {
  id: string
  startTime: string
  endTime: string
  studentName: string
  studentAddress: string
  notes?: string
}

interface LessonWithStudent extends Lesson {
  student?: {
    id: string
    first_name: string
    last_name: string
    address: string
  }
}

export default function WeekOverviewPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  // Zet currentWeek altijd op maandag
  const [currentWeek, setCurrentWeek] = useState(() => getMonday(new Date()))
  const [lessons, setLessons] = useState<LessonWithStudent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [showDayView, setShowDayView] = useState(false)
  const [availability, setAvailability] = useState<any[]>([])
  const [lessonForm, setLessonForm] = useState<LessonFormData>({
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    studentId: '',
    notes: ''
  })
  const [editingLesson, setEditingLesson] = useState<LessonWithStudent | null>(null)
  const [loadingLessons, setLoadingLessons] = useState(true)

  // Initialize default availability for an instructor
  const initializeDefaultAvailability = async () => {
    if (!user) return
    
    try {
      const defaultAvailability = [
        { instructor_id: user.id, day_of_week: 1, available: true },  // Monday
        { instructor_id: user.id, day_of_week: 2, available: true },  // Tuesday
        { instructor_id: user.id, day_of_week: 3, available: true },  // Wednesday
        { instructor_id: user.id, day_of_week: 4, available: true },  // Thursday
        { instructor_id: user.id, day_of_week: 5, available: true },  // Friday
        { instructor_id: user.id, day_of_week: 6, available: false }, // Saturday
        { instructor_id: user.id, day_of_week: 0, available: false }  // Sunday
      ]

      const { error } = await supabase
        .from('instructor_availability')
        .upsert(defaultAvailability, { 
          onConflict: 'instructor_id,day_of_week',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Error initializing default availability:', error)
      }
    } catch (error) {
      console.error('Error initializing default availability:', error)
    }
  }

  // Fetch lessons from database
  const fetchLessons = async () => {
    if (!user) return
    
    try {
      setLoadingLessons(true)
      const startDate = getMonday(currentWeek).toISOString().split('T')[0]
      const endDate = new Date(getMonday(currentWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      console.log('Fetching lessons for week:', { startDate, endDate, currentWeek }) // Debug log
      
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
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
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

      console.log('Total lessons fetched:', transformedData.length) // Debug log
      setLessons(transformedData)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      toast.error('Fout bij het laden van lessen')
    } finally {
      setLoadingLessons(false)
    }
  }

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

  // Fetch instructor availability from database
  const fetchAvailability = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', user.id)

      if (error) {
        // If table doesn't exist, use default availability
        if (error.code === '42P01') {
          console.log('Instructor availability table not found, using default availability')
          setAvailability([
            { day: 'monday', name: 'Maandag', available: true },
            { day: 'tuesday', name: 'Dinsdag', available: true },
            { day: 'wednesday', name: 'Woensdag', available: true },
            { day: 'thursday', name: 'Donderdag', available: true },
            { day: 'friday', name: 'Vrijdag', available: true },
            { day: 'saturday', name: 'Zaterdag', available: false },
            { day: 'sunday', name: 'Zondag', available: false }
          ])
          return
        }
        console.error('Error fetching availability:', error)
        return
      }

      // Transform database data to UI format
      if (data && data.length > 0) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const dayDisplayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
        
        const dbAvailability = data.reduce((acc, item) => {
          const dayName = dayNames[item.day_of_week]
          if (dayName) {
            acc[dayName] = item.available
          }
          return acc
        }, {} as Record<string, boolean>)

        const availabilityData = dayNames.map((day, index) => ({
          day,
          name: dayDisplayNames[index],
          available: dbAvailability[day] ?? (index >= 1 && index <= 5) // Default: weekdays available
        }))

        setAvailability(availabilityData)
      } else {
        // No data in database, initialize default availability
        await initializeDefaultAvailability()
        
        // Fetch the data again after initialization
        const { data: newData, error: newError } = await supabase
          .from('instructor_availability')
          .select('*')
          .eq('instructor_id', user.id)

        if (newData && newData.length > 0) {
          // Transform the newly created data
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const dayDisplayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
          
          const dbAvailability = newData.reduce((acc, item) => {
            const dayName = dayNames[item.day_of_week]
            if (dayName) {
              acc[dayName] = item.available
            }
            return acc
          }, {} as Record<string, boolean>)

          const availabilityData = dayNames.map((day, index) => ({
            day,
            name: dayDisplayNames[index],
            available: dbAvailability[day] ?? (index >= 1 && index <= 5) // Default: weekdays available
          }))

          setAvailability(availabilityData)
        } else {
          // Fallback to default availability if still no data
          setAvailability([
            { day: 'monday', name: 'Maandag', available: true },
            { day: 'tuesday', name: 'Dinsdag', available: true },
            { day: 'wednesday', name: 'Woensdag', available: true },
            { day: 'thursday', name: 'Donderdag', available: true },
            { day: 'friday', name: 'Vrijdag', available: true },
            { day: 'saturday', name: 'Zaterdag', available: false },
            { day: 'sunday', name: 'Zondag', available: false }
          ])
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      // Fallback to default availability on any error
      setAvailability([
        { day: 'monday', name: 'Maandag', available: true },
        { day: 'tuesday', name: 'Dinsdag', available: true },
        { day: 'wednesday', name: 'Woensdag', available: true },
        { day: 'thursday', name: 'Donderdag', available: true },
        { day: 'friday', name: 'Vrijdag', available: true },
        { day: 'saturday', name: 'Zaterdag', available: false },
        { day: 'sunday', name: 'Zondag', available: false }
      ])
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
    
    if (user && !loading) {
      fetchAvailability()
      fetchStudents()
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && !loading) {
      fetchLessons()
    }
  }, [user, loading, currentWeek])

  // Pas getWeekDays aan zodat deze altijd vanaf maandag telt
  const getWeekDays = () => {
    const monday = getMonday(currentWeek)
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      
      const isToday = date.toDateString() === new Date().toDateString()
      const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' })
      const dayDate = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
      const fullDate = date.toISOString().split('T')[0] // Use ISO date format instead of toDateString()
      
      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = date.getDay()
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayKey = dayNames[dayOfWeek]
      
      // Check if instructor is available on this day
      const dayAvailability = availability.find(day => day.day === dayKey)
      const isAvailable = dayAvailability ? dayAvailability.available : true
      
      // Filter lessons for this specific day
      const dayLessons = lessons.filter(lesson => lesson.date === fullDate)
      
      weekDays.push({
        name: dayName,
        date: dayDate,
        fullDate: fullDate,
        isToday,
        isAvailable,
        lessons: dayLessons,
        lessonCount: dayLessons.length
      })
    }
    
    return weekDays
  }

  // Pas weeknavigatie aan zodat deze altijd een week (maandag) opschuift
  const goToPreviousWeek = () => {
    const prevMonday = new Date(currentWeek)
    prevMonday.setDate(prevMonday.getDate() - 7)
    setCurrentWeek(prevMonday)
  }

  const goToNextWeek = () => {
    const nextMonday = new Date(currentWeek)
    nextMonday.setDate(nextMonday.getDate() + 7)
    setCurrentWeek(nextMonday)
  }

  const goToToday = () => {
    setCurrentWeek(getMonday(new Date()))
    setSelectedDate(new Date())
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Format as HH:MM
  }

  const getDayLessons = (dayDate: string) => {
    return lessons.filter(lesson => {
      // Compare dates directly as strings since both are now in ISO format
      return lesson.date === dayDate
    }).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  // Lesson management functions
  const openAddLesson = (date?: string) => {
    setLessonForm({
      date: date || new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      studentId: '',
      notes: ''
    })
    setEditingLesson(null)
    setShowAddLesson(true)
  }

  const openAddLessonForDate = (date: Date) => {
    setLessonForm({
      date: date.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      studentId: '',
      notes: ''
    })
    setEditingLesson(null)
    setShowAddLesson(true)
  }

  const openEditLesson = (lesson: LessonWithStudent) => {
    const student = students.find(s => s.id === lesson.student_id)
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
    const student = students.find(s => s.id === lesson.student_id)
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

      if (error) {
        console.error('Error deleting lesson:', error)
        toast.error('Fout bij het verwijderen van de les')
        return
      }

      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId))
      toast.success('Les succesvol verwijderd!')
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Er is iets misgegaan bij het verwijderen van de les.')
    }
  }

  const saveLesson = async () => {
    if (!user || !lessonForm.studentId) {
      toast.error('Vul alle verplichte velden in')
      return
    }

    try {
      const lessonData = {
        date: lessonForm.date,
        start_time: lessonForm.startTime,
        end_time: lessonForm.endTime,
        student_id: lessonForm.studentId,
        instructor_id: user.id,
        notes: lessonForm.notes || null
      }

      let result
      if (editingLesson) {
        // Update existing lesson
        result = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', editingLesson.id)
      } else {
        // Create new lesson
        result = await supabase
          .from('lessons')
          .insert(lessonData)
      }

      if (result.error) {
        console.error('Error saving lesson:', result.error)
        toast.error('Fout bij het opslaan van de les')
        return
      }

      await fetchLessons()
      setShowAddLesson(false)
      setLessonForm({
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        studentId: '',
        notes: ''
      })
      setEditingLesson(null)
      toast.success(editingLesson ? 'Les succesvol bijgewerkt!' : 'Les succesvol toegevoegd!')
    } catch (error) {
      console.error('Error saving lesson:', error)
      toast.error('Er is iets misgegaan bij het opslaan van de les.')
    }
  }

  const openDayView = (date: Date) => {
    setSelectedDate(date)
    setShowDayView(true)
  }

  const getDayViewLessons = (): DayViewLesson[] => {
    if (!selectedDate) return []
    
    const selectedDateISO = selectedDate.toISOString().split('T')[0]
    
    return lessons
      .filter(lesson => lesson.date === selectedDateISO)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map(lesson => {
        const student = lesson.student || students.find(s => s.id === lesson.student_id)
        return {
          id: lesson.id,
          startTime: lesson.start_time,
          endTime: lesson.end_time,
          studentName: student ? `${student.first_name} ${student.last_name}` : 'Onbekende leerling',
          studentAddress: student?.address || '',
          notes: lesson.notes
        }
      })
  }

  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
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
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug naar Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Weekoverzicht</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {(() => {
                    const monday = getMonday(currentWeek);
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    
                    return `${monday.toLocaleDateString('nl-NL', {
                      day: '2-digit',
                      month: 'long'
                    })} - ${sunday.toLocaleDateString('nl-NL', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}`;
                  })()}
                </h2>
                <button
                  onClick={goToNextWeek}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                >
                  Vandaag
                </button>
                
                <button
                  onClick={() => openAddLesson()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Les toevoegen
                </button>
                <Link
                  href="/dashboard/ai-schedule"
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  AI Rooster
                </Link>
                <Link
                  href="/dashboard/schedule-settings"
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Instellingen
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Week Calendar */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <div className="grid grid-cols-7 gap-4">
              {getWeekDays().map((day, index) => (
                <div key={index} className="min-h-[200px]">
                  <div 
                    className={`p-3 rounded-lg border-2 mb-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !day.isAvailable
                        ? 'border-gray-300 bg-gray-100 opacity-60'
                        : day.isToday 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50'
                    }`}
                    onClick={() => openDayView(new Date(day.fullDate))}
                  >
                    <p className={`text-sm font-medium text-center ${
                      !day.isAvailable
                        ? 'text-gray-500'
                        : day.isToday 
                          ? 'text-blue-700' 
                          : 'text-gray-600'
                    }`}>
                      {day.name}
                    </p>
                    <p className={`text-xs text-center ${
                      !day.isAvailable
                        ? 'text-gray-400'
                        : day.isToday 
                          ? 'text-blue-600' 
                          : 'text-gray-500'
                    }`}>
                      {day.date}
                    </p>
                    <div className="mt-2 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        !day.isAvailable
                          ? 'bg-gray-200 text-gray-400'
                          : day.lessonCount > 0 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {day.lessonCount}
                      </span>
                    </div>
                  </div>
                  
                  {/* Lessons for this day */}
                  <div className="space-y-2">
                    {!day.isAvailable ? (
                      <div className="p-3 text-center text-gray-400 text-sm bg-gray-50 border border-gray-200 rounded-lg">
                        Niet beschikbaar
                      </div>
                    ) : (
                      <>
                        {getDayLessons(day.fullDate).map((lesson, lessonIndex) => {
                          const student = lesson.student || students.find(s => s.id === lesson.student_id)
                          return (
                            <div 
                              key={lessonIndex}
                              className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-3 w-3 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">
                                    {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button 
                                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-200 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditLesson(lesson)
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button 
                                    className="p-1 text-green-600 hover:text-green-700 hover:bg-green-200 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      duplicateLesson(lesson)
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <button 
                                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-200 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteLesson(lesson.id)
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center space-x-2">
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-600">
                                    {student ? `${student.first_name} ${student.last_name}` : 'Onbekende leerling'}
                                  </span>
                                </div>
                                {lesson.notes && (
                                  <div className="mt-1">
                                    <span className="text-xs text-gray-500">{lesson.notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        
                        {getDayLessons(day.fullDate).length === 0 && (
                          <div className="p-3 text-center text-gray-400 text-sm">
                            Geen lessen
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {lessons.length === 0 && !loadingLessons && (
          <div className="bg-white rounded-lg shadow-sm mt-6">
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen lessen gepland</h3>
              <p className="text-gray-500 mb-6">Begin met het plannen van je eerste les</p>
              <button
                onClick={() => openAddLesson()}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                Eerste les plannen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit/Duplicate Lesson Modal */}
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
                  <input
                    type="time"
                    value={lessonForm.startTime}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eindtijd *
                  </label>
                  <input
                    type="time"
                    value={lessonForm.endTime}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                      {student.first_name} {student.last_name}
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

      {/* Day View Modal */}
      {showDayView && selectedDate && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Dagoverzicht - {selectedDate.toLocaleDateString('nl-NL', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </h3>
              <button
                onClick={() => setShowDayView(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {getDayViewLessons().length > 0 ? (
                getDayViewLessons().map((lesson, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <span className="text-lg font-semibold text-gray-900">
                          {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openGoogleMaps(lesson.studentAddress)}
                          className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Google Maps
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-900 font-medium">{lesson.studentName}</span>
                      </div>
                      
                      {lesson.notes && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700">{lesson.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Geen lessen gepland voor deze dag</p>
                                     <button
                     onClick={() => {
                       setShowDayView(false)
                       openAddLessonForDate(selectedDate)
                     }}
                     className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                   >
                     <Plus className="h-4 w-4" />
                     Les toevoegen
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 