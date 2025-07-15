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
  Users
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Lesson {
  id: string
  date: string
  start_time: string
  end_time: string
  student_id: string
  instructor_id: string
  status: 'scheduled' | 'completed' | 'cancelled'
  notes?: string
  location?: string
  created_at: string
  updated_at: string
  students?: {
    id: string
    first_name: string
    last_name: string
    address: string
  }
}

export default function LessonsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [loadingLessons, setLoadingLessons] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

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
        return
      }

      console.log('Total lessons fetched:', data?.length || 0) // Debug log
      setLessons(data || [])
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoadingLessons(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchLessons()
    }
  }, [user, currentDate, viewMode])

  const getMonday = (date: Date) => {
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(date.setDate(diff))
  }

  const formatDateToISO = (date: Date) => {
    return date.toISOString().split('T')[0]
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
    const dateString = date.toISOString().split('T')[0]
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
    // Remove any AM/PM and ensure proper formatting
    if (!time) return ''
    
    // If time is already in HH:MM format, return as is
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      const [hours, minutes] = time.split(':')
      return `${hours.padStart(2, '0')}:${minutes}`
    }
    
    // If time is in HH:MM:SS format, remove seconds
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(time)) {
      return time.substring(0, 5)
    }
    
    // If time is in HH:MM:SS.mmm format, remove seconds and milliseconds
    if (/^\d{1,2}:\d{2}:\d{2}\.\d+$/.test(time)) {
      return time.substring(0, 5)
    }
    
    // Default fallback - try to parse and format
    try {
      const [hours, minutes] = time.split(':')
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    } catch {
      return time
    }
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
    const dateString = date.toISOString().split('T')[0]
    return lessons.filter(lesson => lesson.date === dateString).length
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
          <h3 className="text-lg font-semibold mb-4">Snelle acties</h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/lessons/new"
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nieuwe les plannen
            </Link>
            <Link
              href="/dashboard/ai-schedule"
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              AI-geassisteerde planning
            </Link>
          </div>
        </div>

      <div className="container-mobile py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Lessen
          </h1>
          <p className="text-gray-600">
            Beheer je lesrooster en planning
          </p>
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
                ? `Week ${currentDate.getDate()} - ${new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000).getDate()} ${currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`
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
                          <div key={lesson.id} className="bg-gray-50 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-700">
                                  {lesson.students ? `${lesson.students.first_name} ${lesson.students.last_name}` : 'Onbekende leerling'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(lesson.status)}`}>
                                  {getStatusText(lesson.status)}
                                </span>
                                <button className="p-0.5 text-gray-400 hover:text-gray-600">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
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
                      className={`h-12 p-1 rounded-lg border ${
                        isCurrentDay 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
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
    </div>
  )
} 