'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  MapPin,
  MoreVertical,
  ArrowLeft,
  Users,
  X,
  Edit2,
  Trash2,
  Copy,
  Settings,
  Check,
  AlertTriangle
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

export default function LessonsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [lessons, setLessons] = useState<LessonWithStudent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [loadingLessons, setLoadingLessons] = useState(true)
  
  // Add/Edit Lesson Modal State
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonWithStudent | null>(null)
  const [lessonForm, setLessonForm] = useState<LessonFormData>({
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    studentId: '',
    notes: ''
  })

  // Time input state for better UX
  const [timeInputs, setTimeInputs] = useState({
    startHours: '09',
    startMinutes: '00',
    endHours: '10',
    endMinutes: '00'
  })

  // Copy week functionality
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [selectedTargetWeek, setSelectedTargetWeek] = useState<Date | null>(null)
  const [copyingLessons, setCopyingLessons] = useState(false)

  // Default lesson duration
  const [defaultLessonDuration, setDefaultLessonDuration] = useState(50)

  // AI Schedule week selection functionality - COMMENTED OUT: now handled in AI schedule page
  // const [showAIScheduleModal, setShowAIScheduleModal] = useState(false)
  // const [selectedAIScheduleWeek, setSelectedAIScheduleWeek] = useState<Date | null>(null)

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

  // Fetch lessons from database
  const fetchLessons = async () => {
    if (!user) return
    
    try {
      setLoadingLessons(true)
      
      let startDate: string
      let endDate: string
      
      if (viewMode === 'week') {
        const monday = getMonday(currentDate)
        startDate = formatDateToISO(monday)
        endDate = formatDateToISO(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000))
      } else {
        // Month view - get first and last day of the month
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        startDate = formatDateToISO(firstDayOfMonth)
        endDate = formatDateToISO(lastDayOfMonth)
      }
      
      console.log(`Fetching lessons for ${viewMode}:`, { startDate, endDate }) // Debug log
      
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

  useEffect(() => {
    if (user && !loading) {
      fetchStudents()
    }
  }, [user, loading])

  useEffect(() => {
    if (user && !loading) {
      fetchLessons()
      // fetchDefaultLessonDuration()
    }
  }, [user, loading, currentDate, viewMode])

  // Fetch default lesson duration for the instructor
  // const fetchDefaultLessonDuration = async () => {
  //   if (!user) return
    
  //   try {
  //     const duration = await getDefaultLessonDuration(user.id)
  //     setDefaultLessonDuration(duration)
  //   } catch (error) {
  //     console.error('Error fetching default lesson duration:', error)
  //   }
  // }



  const getMonday = (date: Date) => {
    const newDate = new Date(date) // Create a new Date object to avoid modifying the original
    const day = newDate.getDay()
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    newDate.setDate(diff)
    return newDate
  }

  // Get the next 5 weeks for copy functionality
  const getNext5Weeks = () => {
    const weeks = []
    const currentWeekMonday = getMonday(currentDate)
    for (let i = 1; i <= 5; i++) {
      const weekStart = new Date(currentWeekMonday)
      weekStart.setDate(currentWeekMonday.getDate() + (i * 7))
      weeks.push(weekStart)
    }
    return weeks
  }

  // Handle copy week button click
  const handleCopyWeekClick = () => {
    if (lessons.length === 0) {
      toast.error('Er zijn geen lessen om te kopiëren')
      return
    }
    setShowCopyModal(true)
  }

  // Handle AI schedule button click - COMMENTED OUT: now handled in AI schedule page
  // const handleAIScheduleClick = () => {
  //   setShowAIScheduleModal(true)
  // }

  // Handle AI schedule week selection - COMMENTED OUT: now handled in AI schedule page
  // const handleAIScheduleWeekSelection = async (targetWeek: Date) => {
  //   if (!user) return
  //   
  //   setSelectedAIScheduleWeek(targetWeek)
  //   setShowAIScheduleModal(false)
  //   
  //   try {
  //     // Navigate directly to AI schedule page with week parameter
  //     const weekStart = getMonday(targetWeek)
  //     const weekStartString = formatDateToISO(weekStart)
  //     
  //     console.log('Selected week:', targetWeek)
  //     console.log('Calculated Monday:', weekStart)
  //     console.log('Week start string:', weekStartString)
  //     
  //     // Navigate to AI schedule page with week parameter
  //     router.push(`/dashboard/ai-schedule?week=${weekStartString}`)
  //     
  //   } catch (error) {
  //     console.error('Error navigating to AI schedule:', error)
  //     toast.error('Fout bij navigeren naar AI weekplanning')
  //   }
  // }

  // Handle week selection for copying
  const handleWeekSelection = (targetWeek: Date) => {
    setSelectedTargetWeek(targetWeek)
    setShowCopyModal(false)
    setShowConfirmationModal(true)
  }

  // Handle confirmation and copy lessons
  const handleConfirmCopy = async () => {
    if (!selectedTargetWeek || !user) return

    setCopyingLessons(true)
    try {
      const currentWeekMonday = getMonday(currentDate)
      const targetWeekMonday = getMonday(selectedTargetWeek)

      // Calculate the day offset between current week and target week
      const dayOffset = Math.floor((targetWeekMonday.getTime() - currentWeekMonday.getTime()) / (1000 * 60 * 60 * 24))

      // Copy lessons to target week (duplicate, don't replace)
      const lessonsToCopy = lessons.map(lesson => {
        const lessonDate = new Date(lesson.date)
        const newDate = new Date(lessonDate)
        newDate.setDate(lessonDate.getDate() + dayOffset)
        
        return {
          date: formatDateToISO(newDate),
          start_time: lesson.start_time,
          end_time: lesson.end_time,
          student_id: lesson.student_id,
          instructor_id: lesson.instructor_id,
          status: 'scheduled',
          lessen_geregistreerd: lesson.lessen_geregistreerd,
          // Remove notes as requested
          notes: null
        }
      })

      const { error: insertError } = await supabase
        .from('lessons')
        .insert(lessonsToCopy)

      if (insertError) {
        console.error('Error copying lessons:', insertError)
        toast.error('Fout bij het kopiëren van lessen')
        return
      }

      toast.success('Weekplanning succesvol gekopieerd')
      
      // Close modals
      setShowConfirmationModal(false)
      setSelectedTargetWeek(null)
    } catch (error) {
      console.error('Error copying lessons:', error)
      toast.error('Fout bij het kopiëren van lessen')
    } finally {
      setCopyingLessons(false)
    }
  }

  const formatDateToISO = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getWeekDays = () => {
    const days = []
    const startOfWeek = new Date(currentDate)
    // Calculate offset to get to Monday (Monday = 1, so if currentDay is 0 (Sunday), we need -6, otherwise 1 - currentDay)
    const currentDay = currentDate.getDay()
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
    startOfWeek.setDate(currentDate.getDate() + mondayOffset)
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getLessonsForDate = (date: Date) => {
    const dateString = formatDateToISO(date)
    return lessons.filter(lesson => lesson.date === dateString)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nl-NL', { 
      weekday: 'short', 
      day: 'numeric',
      month: 'short'
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Gepland'
      case 'completed':
        return 'Voltooid'
      case 'cancelled':
        return 'Geannuleerd'
      default:
        return status
    }
  }

  const formatTime = (time: string) => {
    // Ensure time is always displayed in 24-hour format (HH:MM)
    if (!time) return ''
    
    // Remove any AM/PM indicators and normalize the time
    let normalizedTime = time.toUpperCase().replace(/[AP]M/g, '').trim()
    
    // If time is already in HH:MM format, ensure proper padding
    if (/^\d{1,2}:\d{2}$/.test(normalizedTime)) {
      const [hours, minutes] = normalizedTime.split(':')
      const hourNum = parseInt(hours, 10)
      const minuteNum = parseInt(minutes, 10)
      
      // Validate hours and minutes
      if (hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59) {
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
      }
    }
    
    // If time is in HH:MM:SS format, remove seconds
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(normalizedTime)) {
      return normalizedTime.substring(0, 5)
    }
    
    // If time is in HH:MM:SS.mmm format, remove seconds and milliseconds
    if (/^\d{1,2}:\d{2}:\d{2}\.\d+$/.test(normalizedTime)) {
      return normalizedTime.substring(0, 5)
    }
    
    // Try to parse as a Date object if it's in a different format
    try {
      // Create a date object with the time to handle various formats
      const testDate = new Date(`2000-01-01T${normalizedTime}`)
      if (!isNaN(testDate.getTime())) {
        const hours = testDate.getHours().toString().padStart(2, '0')
        const minutes = testDate.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
      }
    } catch {
      // Fallback to original parsing
    }
    
    // Default fallback - try to parse and format
    try {
      const [hours, minutes] = normalizedTime.split(':')
      const hourNum = parseInt(hours, 10)
      const minuteNum = parseInt(minutes, 10)
      
      if (hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59) {
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
      }
    } catch {
      // If all else fails, return the original time
    }
    
    return time
  }

  // Helper function to validate and format time input
  const validateAndFormatTime = (timeValue: string): string => {
    if (!timeValue) return ''
    
    // Remove any AM/PM indicators
    let cleanTime = timeValue.toUpperCase().replace(/[AP]M/g, '').trim()
    
    // Parse hours and minutes
    const [hours, minutes] = cleanTime.split(':')
    if (!hours || !minutes) return timeValue
    
    const hourNum = parseInt(hours, 10)
    const minuteNum = parseInt(minutes, 10)
    
    // Validate ranges
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      return timeValue
    }
    
    // Return formatted time
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  }

  // Helper functions for time input handling
  const updateTimeInputs = (field: string, value: string) => {
    setTimeInputs(prev => ({ ...prev, [field]: value }))
  }

  const formatTimeOnBlur = (field: string, value: string, maxValue: number) => {
    let numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0) {
      numValue = 0
    } else if (numValue > maxValue) {
      numValue = maxValue
    }
    const formattedValue = numValue.toString().padStart(2, '0')
    setTimeInputs(prev => ({ ...prev, [field]: formattedValue }))
    return formattedValue
  }

  const updateLessonFormTime = () => {
    const startTime = `${timeInputs.startHours}:${timeInputs.startMinutes}`
    const endTime = `${timeInputs.endHours}:${timeInputs.endMinutes}`
    setLessonForm(prev => ({ ...prev, startTime, endTime }))
    // Force re-render to update lesson count display
    setTimeInputs(prev => ({ ...prev }))
  }

  // Month view helper functions
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1)
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay()
    // Convert to Monday = 0, Sunday = 6 format
    const mondayFirstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < mondayFirstDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getLessonsCountForDate = (date: Date) => {
    const dateString = formatDateToISO(date)
    return lessons.filter(lesson => lesson.date === dateString).length
  }

  // Calculate lesson count for current form data
  const getCurrentLessonCount = () => {
    const startTime = `${timeInputs.startHours}:${timeInputs.startMinutes}`
    const endTime = `${timeInputs.endHours}:${timeInputs.endMinutes}`
    return calculateLessonCount(startTime, endTime, defaultLessonDuration)
  }



  // Lesson management functions
  const openAddLesson = (date?: string) => {
    setLessonForm({
      date: date || formatDateToISO(new Date()),
      startTime: '09:00',
      endTime: '10:00',
      studentId: '',
      notes: ''
    })
    setTimeInputs({
      startHours: '09',
      startMinutes: '00',
      endHours: '10',
      endMinutes: '00'
    })
    setEditingLesson(null)
    setShowAddLesson(true)
  }

  const openAddLessonForDate = (date: Date) => {
    setLessonForm({
      date: formatDateToISO(date),
      startTime: '09:00',
      endTime: '10:00',
      studentId: '',
      notes: ''
    })
    setTimeInputs({
      startHours: '09',
      startMinutes: '00',
      endHours: '10',
      endMinutes: '00'
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
    setTimeInputs({
      startHours: lesson.start_time.split(':')[0] || '09',
      startMinutes: lesson.start_time.split(':')[1] || '00',
      endHours: lesson.end_time.split(':')[0] || '10',
      endMinutes: lesson.end_time.split(':')[1] || '00'
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
    setTimeInputs({
      startHours: lesson.start_time.split(':')[0] || '09',
      startMinutes: lesson.start_time.split(':')[1] || '00',
      endHours: lesson.end_time.split(':')[0] || '10',
      endMinutes: lesson.end_time.split(':')[1] || '00'
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
      // Update lesson form with current time inputs before saving
      updateLessonFormTime()
      
      // Calculate the number of lessons based on duration
      const startTime = `${timeInputs.startHours}:${timeInputs.startMinutes}`
      const endTime = `${timeInputs.endHours}:${timeInputs.endMinutes}`
      const lessonCount = calculateLessonCount(startTime, endTime, defaultLessonDuration)
      
      const lessonData = {
        date: lessonForm.date,
        start_time: startTime,
        end_time: endTime,
        student_id: lessonForm.studentId,
        instructor_id: user.id,
        notes: lessonForm.notes || null,
        lessen_geregistreerd: lessonCount
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
      {/* <nav className="bg-white shadow-sm border-b safe-area-top">
        <div className="container-mobile">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Terug naar dashboard</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/lessons/new"
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nieuwe les</span>
              </Link>
            </div>
          </div>
        </div>
      </nav> */}

      {/* Quick Actions */}
      <div className="card">
          {/* <h3 className="text-lg font-semibold mb-4">Snelle acties</h3> */}
          <div className="space-y-1">
            <button
              onClick={() => openAddLesson()}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus className="h-3 w-4" />
              Nieuwe les
            </button>
            <Link
              href="/dashboard/ai-schedule"
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              AI Weekplanning
            </Link>
            <Link
              href="/dashboard/schedule-settings"
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Settings className="h-3 w-4" />
              Rooster instellingen
            </Link>
            <button
              onClick={handleCopyWeekClick}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Copy className="h-3 w-4" />
              Kopieer weekplanning naar...
            </button>
          </div>
        </div>

      <div className="container-mobile py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Lessen
          </h1>
          {/* <p className="text-gray-600">
            Beheer je lesrooster en planning
          </p> */}
        </div>

        {/* View Mode Toggle */}
        <div className="card mb-6">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Maand
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const newDate = new Date(currentDate)
                if (viewMode === 'week') {
                  newDate.setDate(currentDate.getDate() - 7)
                } else {
                  newDate.setMonth(currentDate.getMonth() - 1)
                }
                setCurrentDate(newDate)
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'week' 
                ? (() => {
                    const monday = getMonday(currentDate)
                    const sunday = new Date(monday)
                    sunday.setDate(monday.getDate() + 6)
                    
                    const mondayFormatted = monday.toLocaleDateString('nl-NL', { 
                      day: 'numeric', 
                      month: 'long' 
                    })
                    const sundayFormatted = sunday.toLocaleDateString('nl-NL', { 
                      day: 'numeric', 
                      month: 'long' 
                    })
                    
                    return `${mondayFormatted} - ${sundayFormatted}`
                  })()
                : currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
              }
            </h2>
            
            <button
              onClick={() => {
                const newDate = new Date(currentDate)
                if (viewMode === 'week') {
                  newDate.setDate(currentDate.getDate() + 7)
                } else {
                  newDate.setMonth(currentDate.getMonth() + 1)
                }
                setCurrentDate(newDate)
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Loading State */}
          {loadingLessons && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Lessen laden...</p>
            </div>
          )}

          {/* Week View */}
          {viewMode === 'week' && !loadingLessons && (
            <div className="space-y-2">
              {getWeekDays().map((day) => {
                const dayLessons = getLessonsForDate(day)
                return (
                  <div key={day.toISOString()} className="border-b border-gray-200 pb-2 last:border-b-0">
                    <div className={`flex items-center justify-between mb-2 ${
                      isToday(day) ? 'text-blue-600 font-semibold' : 'text-gray-900'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatDate(day)}
                        </span>
                        {isToday(day) && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Vandaag
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {dayLessons.length} {dayLessons.length === 1 ? 'les' : 'lessen'}
                      </span>
                    </div>
                    
                    {dayLessons.length === 0 ? (
                      <p className="text-gray-500 text-sm py-1">Geen lessen gepland</p>
                    ) : (
                      <div className="space-y-0.5">
                        {dayLessons.map((lesson) => (
                          <div key={lesson.id} className="bg-gray-50 rounded-lg py-0 px-2 h-12 relative">
                            <div className="flex items-center justify-between h-full">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-900">
                                  {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button 
                                  className="p-0.5 text-blue-600 hover:text-blue-700 hover:bg-blue-200 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditLesson(lesson)
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button 
                                  className="p-0.5 text-green-600 hover:text-green-700 hover:bg-green-200 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    duplicateLesson(lesson)
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <button 
                                  className="p-0.5 text-red-600 hover:text-red-700 hover:bg-red-200 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteLesson(lesson.id)
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-2 right-2">
                              <div className="flex items-center space-x-2">
                                <User className="h-2 w-2 text-gray-500" />
                                <span className="text-xs text-gray-600 truncate">
                                  {lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name || ''}` : 'Onbekende leerling'}
                                </span>
                              </div>
                              {lesson.notes && (
                                <div className="bg-gray-100 p-0.5 rounded mt-0.5">
                                  <p className="text-xs text-gray-500 leading-tight truncate">{lesson.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && !loadingLessons && (
            <div className="space-y-4">
              {/* Help text */}
              {/* <div className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                💡 <strong>Tip:</strong> Klik op een dag om het dagoverzicht te bekijken
              </div> */}
              
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500">
                <div>Ma</div>
                <div>Di</div>
                <div>Wo</div>
                <div>Do</div>
                <div>Vr</div>
                <div>Za</div>
                <div>Zo</div>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {getMonthDays().map((day, index) => {
                  if (!day) {
                    return (
                      <div key={`empty-${index}`} className="h-12 bg-gray-50 rounded-lg"></div>
                    )
                  }
                  
                  const lessonsCount = getLessonsCountForDate(day)
                  const isCurrentDay = isToday(day)
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-12 p-1 rounded-lg border transition-colors relative group ${
                        isCurrentDay 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-white border-gray-200'
                      }`}
                      // onClick={() => router.push(`/dashboard/day-overview/${day.toISOString().split('T')[0]}`)}
                      // title="Klik voor dagoverzicht"
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className={`text-xs ${
                          isCurrentDay ? 'text-blue-600 font-semibold' : 'text-gray-900'
                        }`}>
                          {day.getDate()}
                        </span>
                        {lessonsCount > 0 && (
                          <span className={`text-xs font-medium px-1 rounded-full ${
                            isCurrentDay 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {lessonsCount}
                          </span>
                        )}
                      </div>
                      {/* Hover indicator */}
                      <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-5 rounded-lg transition-opacity pointer-events-none"></div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        
      </div>



      <nav className="nav-mobile safe-area-bottom">
        <div className="container-mobile">
          <div className="flex justify-around">
            <Link href="/dashboard" className="nav-mobile-item">
              <Clock className="h-6 w-6" />
              <span>Dagplanning</span>
            </Link>
            <Link href="/dashboard/lessons" className="nav-mobile-item active">
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
                      value={timeInputs.startHours}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d{0,2}$/.test(value)) {
                          updateTimeInputs('startHours', value)
                          updateLessonFormTime()
                        }
                      }}
                      onBlur={(e) => {
                        const formattedValue = formatTimeOnBlur('startHours', e.target.value, 23)
                        updateLessonFormTime()
                      }}
                      className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      placeholder="HH"
                    />
                    <span className="text-gray-500 font-medium">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={timeInputs.startMinutes}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d{0,2}$/.test(value)) {
                          updateTimeInputs('startMinutes', value)
                          updateLessonFormTime()
                        }
                      }}
                      onBlur={(e) => {
                        const formattedValue = formatTimeOnBlur('startMinutes', e.target.value, 59)
                        updateLessonFormTime()
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
                      value={timeInputs.endHours}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d{0,2}$/.test(value)) {
                          updateTimeInputs('endHours', value)
                          updateLessonFormTime()
                        }
                      }}
                      onBlur={(e) => {
                        const formattedValue = formatTimeOnBlur('endHours', e.target.value, 23)
                        updateLessonFormTime()
                      }}
                      className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      placeholder="HH"
                    />
                    <span className="text-gray-500 font-medium">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={timeInputs.endMinutes}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d{0,2}$/.test(value)) {
                          updateTimeInputs('endMinutes', value)
                          updateLessonFormTime()
                        }
                      }}
                      onBlur={(e) => {
                        const formattedValue = formatTimeOnBlur('endMinutes', e.target.value, 59)
                        updateLessonFormTime()
                      }}
                      className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      placeholder="MM"
                    />
                  </div>
                </div>
              </div>
              
              {/* Real-time lesson count display */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <span className="text-sm text-blue-800 font-medium">
                    {getCurrentLessonCount()} {getCurrentLessonCount() === 1 ? 'lesuur' : 'lesuren'} geregistreerd
                  </span>
                  {/* <span className="text-xs text-blue-600">
                    (Standaard: {defaultLessonDuration} min)
                  </span> */}
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

      {/* Copy Week Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Kopieer weekplanning naar...
              </h3>
              <button
                onClick={() => setShowCopyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Selecteer een week waarnaar je de huidige weekplanning wilt kopiëren:
              </p>
              
              {getNext5Weeks().map((week, index) => {
                const weekStart = getMonday(week)
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekStart.getDate() + 6)
                
                return (
                  <button
                    key={index}
                    onClick={() => handleWeekSelection(week)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="font-medium text-gray-900">
                      {index === 0 ? 'Volgende week' : 'Week ' + (index + 1)}
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
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && selectedTargetWeek && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Bevestig kopiëren
              </h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Je staat op het punt om de weekplanning te kopiëren naar:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium text-gray-900">
                  {(() => {
                    const weekStart = getMonday(selectedTargetWeek)
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekStart.getDate() + 6)
                    
                    return `${weekStart.toLocaleDateString('nl-NL', {
                      day: '2-digit',
                      month: 'long'
                    })} - ${weekEnd.toLocaleDateString('nl-NL', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}`
                  })()}
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  <strong>Let op:</strong> Alle les<strong>notities</strong> worden niet meegenomen.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmationModal(false)
                  setSelectedTargetWeek(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                disabled={copyingLessons}
              >
                Annuleren
              </button>
              <button
                onClick={handleConfirmCopy}
                disabled={copyingLessons}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {copyingLessons ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Kopiëren...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Kopiëren
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Schedule Week Selection Modal - COMMENTED OUT: now handled in AI schedule page */}
      {/* {showAIScheduleModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                AI Weekplanning voor...
              </h3>
              <button
                onClick={() => setShowAIScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Selecteer een week waarvoor je een AI Weekplanning wilt genereren:
              </p>
              
              {getNext5Weeks().map((week, index) => {
                const weekStart = getMonday(week)
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekStart.getDate() + 6)
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAIScheduleWeekSelection(week)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="font-medium text-gray-900">
                      {index === 0 ? 'Volgende week' : 'Week ' + (index + 1)}
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
        </div>
      )} */}
    </div>
  )
} 