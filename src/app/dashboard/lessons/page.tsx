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
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface Lesson {
  id: string
  date: string
  start_time: string
  end_time: string
  student_name: string
  status: 'scheduled' | 'completed' | 'cancelled'
  location?: string
}

export default function LessonsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Mock data for demonstration
  useEffect(() => {
    const mockLessons: Lesson[] = [
      {
        id: '1',
        date: '2024-01-22',
        start_time: '09:00',
        end_time: '10:00',
        student_name: 'Jan Jansen',
        status: 'scheduled',
        location: 'CBR Amsterdam'
      },
      {
        id: '2',
        date: '2024-01-22',
        start_time: '10:30',
        end_time: '11:30',
        student_name: 'Piet Pietersen',
        status: 'scheduled',
        location: 'CBR Rotterdam'
      },
      {
        id: '3',
        date: '2024-01-22',
        start_time: '14:00',
        end_time: '15:00',
        student_name: 'Marie de Vries',
        status: 'scheduled',
        location: 'CBR Utrecht'
      },
      {
        id: '4',
        date: '2024-01-23',
        start_time: '09:00',
        end_time: '10:00',
        student_name: 'Jan Jansen',
        status: 'scheduled',
        location: 'CBR Amsterdam'
      }
    ]
    setLessons(mockLessons)
  }, [])

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
      </nav>

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

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="space-y-4">
              {getWeekDays().map((day) => {
                const dayLessons = getLessonsForDate(day)
                return (
                  <div key={day.toISOString()} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className={`flex items-center justify-between mb-3 ${
                      isToday(day) ? 'text-blue-600 font-semibold' : 'text-gray-900'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatDate(day)}
                        </span>
                        {isToday(day) && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Vandaag
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {dayLessons.length} {dayLessons.length === 1 ? 'les' : 'lessen'}
                      </span>
                    </div>
                    
                    {dayLessons.length === 0 ? (
                      <p className="text-gray-500 text-sm py-2">Geen lessen gepland</p>
                    ) : (
                      <div className="space-y-2">
                        {dayLessons.map((lesson) => (
                          <div key={lesson.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm text-gray-700">
                                    {lesson.student_name}
                                  </span>
                                </div>
                                {lesson.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                      {lesson.location}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lesson.status)}`}>
                                  {getStatusText(lesson.status)}
                                </span>
                                <button className="p-1 text-gray-400 hover:text-gray-600">
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
          {viewMode === 'month' && (
            <div className="text-center py-8">
              <p className="text-gray-500">Maandoverzicht wordt binnenkort toegevoegd</p>
            </div>
          )}
        </div>

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
      </div>
    </div>
  )
} 