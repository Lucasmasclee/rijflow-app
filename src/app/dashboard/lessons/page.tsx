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
  MoreVertical
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
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
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
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Terug naar dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lesplanning</h1>
            <p className="text-gray-600 mt-2">
              Beheer je lessen en planning
            </p>
          </div>
          <Link
            href="/dashboard/lessons/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nieuwe les
          </Link>
        </div>

        {/* Calendar Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate)
                  newDate.setDate(currentDate.getDate() - 7)
                  setCurrentDate(newDate)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <h2 className="text-xl font-semibold text-gray-900">
                {currentDate.toLocaleDateString('nl-NL', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h2>
              
              <button
                onClick={() => {
                  const newDate = new Date(currentDate)
                  newDate.setDate(currentDate.getDate() + 7)
                  setCurrentDate(newDate)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Maand
              </button>
            </div>
          </div>
        </div>

        {/* Week Calendar */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {getWeekDays().map((day, index) => (
              <div
                key={index}
                className={`p-4 text-center ${
                  isToday(day) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-900">
                  {day.toLocaleDateString('nl-NL', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-semibold ${
                  isToday(day) ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 min-h-[600px]">
            {getWeekDays().map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`border-r border-gray-200 ${
                  dayIndex === 6 ? 'border-r-0' : ''
                }`}
              >
                <div className="p-2 space-y-2">
                  {getLessonsForDate(day).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center text-sm text-blue-900">
                          <Clock className="h-3 w-3 mr-1" />
                          {lesson.start_time} - {lesson.end_time}
                        </div>
                        <button className="text-blue-600 hover:text-blue-800">
                          <MoreVertical className="h-3 w-3" />
                        </button>
                      </div>
                      
                      <div className="text-sm font-medium text-blue-900 mb-1">
                        {lesson.student_name}
                      </div>
                      
                      {lesson.location && (
                        <div className="flex items-center text-xs text-blue-700 mb-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          {lesson.location}
                        </div>
                      )}
                      
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lesson.status)}`}>
                        {getStatusText(lesson.status)}
                      </span>
                    </div>
                  ))}
                  
                  {getLessonsForDate(day).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Calendar className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-xs">Geen lessen</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lessen deze week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lessons.filter(l => {
                    const lessonDate = new Date(l.date)
                    const weekStart = new Date(currentDate)
                    weekStart.setDate(currentDate.getDate() - currentDate.getDay())
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekStart.getDate() + 6)
                    return lessonDate >= weekStart && lessonDate <= weekEnd
                  }).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Uren deze week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lessons.filter(l => {
                    const lessonDate = new Date(l.date)
                    const weekStart = new Date(currentDate)
                    weekStart.setDate(currentDate.getDate() - currentDate.getDay())
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekStart.getDate() + 6)
                    return lessonDate >= weekStart && lessonDate <= weekEnd
                  }).length * 1}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <User className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unieke leerlingen</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(lessons.filter(l => {
                    const lessonDate = new Date(l.date)
                    const weekStart = new Date(currentDate)
                    weekStart.setDate(currentDate.getDate() - currentDate.getDay())
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekStart.getDate() + 6)
                    return lessonDate >= weekStart && lessonDate <= weekEnd
                  }).map(l => l.student_name)).size}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vandaag</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lessons.filter(l => l.date === new Date().toISOString().split('T')[0]).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 