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
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  // (day + 6) % 7: Maandag=0, Zondag=6
  const diff = d.getDate() - ((day + 6) % 7)
  d.setDate(diff)
  d.setHours(0,0,0,0)
  return d
}

export default function WeekOverviewPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  // Zet currentWeek altijd op maandag
  const [currentWeek, setCurrentWeek] = useState(() => getMonday(new Date()))
  const [lessons, setLessons] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [availability, setAvailability] = useState<any[]>([])

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
    }
  }, [user, loading, router])

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
      const fullDate = date.toDateString()
      
      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = date.getDay()
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayKey = dayNames[dayOfWeek]
      
      // Check if instructor is available on this day
      const dayAvailability = availability.find(day => day.day === dayKey)
      const isAvailable = dayAvailability ? dayAvailability.available : true
      
      // Filter lessons for this specific day
      const dayLessons = lessons.filter(lesson => 
        new Date(lesson.date).toDateString() === fullDate
      )
      
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
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Format as HH:MM
  }

  const getDayLessons = (dayDate: string) => {
    return lessons.filter(lesson => 
      new Date(lesson.date).toDateString() === dayDate
    ).sort((a, b) => a.startTime.localeCompare(b.startTime))
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
                {/* <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                >
                  Vandaag
                </button> */}
                
                <button
                  onClick={() => setShowAddLesson(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Les toevoegen
                </button>
                <Link
                  href="/dashboard/ai-schedule"
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  AI Rooster
                </Link>
                <Link
                  href="/dashboard/schedule-settings"
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  {/* Rooster instellingen */}
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
                  <div className={`p-3 rounded-lg border-2 mb-3 ${
                    !day.isAvailable
                      ? 'border-gray-300 bg-gray-100 opacity-60'
                      : day.isToday 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-gray-50'
                  }`}>
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
                        {getDayLessons(day.fullDate).map((lesson, lessonIndex) => (
                          <div 
                            key={lessonIndex}
                            className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => setSelectedDate(new Date(day.fullDate))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">
                                  {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-200 rounded">
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button className="p-1 text-red-600 hover:text-red-700 hover:bg-red-200 rounded">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="flex items-center space-x-2">
                                <User className="h-3 w-3 text-gray-500" />
                                <span className="text-xs text-gray-600">{lesson.studentName}</span>
                              </div>
                              {lesson.location && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <MapPin className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-600">{lesson.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
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
        {lessons.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm mt-6">
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen lessen gepland</h3>
              <p className="text-gray-500 mb-6">Begin met het plannen van je eerste les</p>
              <button
                onClick={() => setShowAddLesson(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                Eerste les plannen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 