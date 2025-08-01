'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Calendar, 
  Settings,
  ArrowLeft,
  Save,
  Check,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { StandardAvailability } from '@/types/database'
import toast from 'react-hot-toast'
import TimeInput from '@/components/TimeInput'

interface DayAvailability {
  day: string
  name: string
  dutchName: string
  available: boolean
  startTime: string
  endTime: string
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function ScheduleSettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [availability, setAvailability] = useState<DayAvailability[]>([
    { day: 'monday', name: 'Maandag', dutchName: 'maandag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'tuesday', name: 'Dinsdag', dutchName: 'dinsdag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'wednesday', name: 'Woensdag', dutchName: 'woensdag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'thursday', name: 'Donderdag', dutchName: 'donderdag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'friday', name: 'Vrijdag', dutchName: 'vrijdag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'saturday', name: 'Zaterdag', dutchName: 'zaterdag', available: false, startTime: '09:00', endTime: '17:00' },
    { day: 'sunday', name: 'Zondag', dutchName: 'zondag', available: false, startTime: '09:00', endTime: '17:00' }
  ])
  const [defaultLessonDuration, setDefaultLessonDuration] = useState(50) // Default 50 minutes
  const [saved, setSaved] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(true)
  const [saving, setSaving] = useState(false)
  const timeInputRefs = useRef<{ [key: string]: (() => void) | null }>({})

  // Initialize default availability for an instructor
  const initializeDefaultAvailability = async () => {
    if (!user) return
    
    try {
      const defaultAvailabilityData = {
        maandag: ['09:00', '17:00'],
        dinsdag: ['09:00', '17:00'],
        woensdag: ['09:00', '17:00'],
        donderdag: ['09:00', '17:00'],
        vrijdag: ['09:00', '17:00'],
        zaterdag: ['09:00', '17:00'],
        zondag: ['09:00', '17:00']
      }

      const { error } = await supabase
        .from('standard_availability')
        .upsert({
          instructor_id: user.id,
          availability_data: defaultAvailabilityData,
          default_lesson_duration: defaultLessonDuration
        }, { 
          onConflict: 'instructor_id',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Error initializing default availability:', error)
      }
    } catch (error) {
      console.error('Error initializing default availability:', error)
    }
  }

  // Fetch availability from database
  const fetchAvailability = async () => {
    if (!user) return
    
    try {
      setLoadingAvailability(true)
      const { data, error } = await supabase
        .from('standard_availability')
        .select('*')
        .eq('instructor_id', user.id)
        .single()

      if (error) {
        // If table doesn't exist, show error message
        if (error.code === '42P01') {
          console.error('Standard availability table not found. Please run the database setup script.')
          toast.error('Database tabel ontbreekt. Neem contact op met de beheerder.')
          return
        }
        // If no data found, initialize default availability
        if (error.code === 'PGRST116') {
          await initializeDefaultAvailability()
          // Fetch the newly created data
          const { data: newData, error: newError } = await supabase
            .from('standard_availability')
            .select('*')
            .eq('instructor_id', user.id)
            .single()

          if (newData) {
            updateAvailabilityFromData(newData.availability_data)
            if (newData.default_lesson_duration) {
              setDefaultLessonDuration(newData.default_lesson_duration)
            }
          }
          return
        }
        console.error('Error fetching availability:', error)
        return
      }

      if (data) {
        updateAvailabilityFromData(data.availability_data)
        if (data.default_lesson_duration) {
          setDefaultLessonDuration(data.default_lesson_duration)
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  // Update availability state from database data
  const updateAvailabilityFromData = (availabilityData: Record<string, string[]>) => {
    setAvailability(prev => prev.map(day => {
      const dayData = availabilityData[day.dutchName]
      if (dayData && dayData.length >= 2) {
        return {
          ...day,
          available: true,
          startTime: dayData[0],
          endTime: dayData[1]
        }
      } else {
        return {
          ...day,
          available: false,
          startTime: '09:00',
          endTime: '17:00'
        }
      }
    }))
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
    
    if (user && !loading) {
      fetchAvailability()
    }
  }, [user, loading, router])

  const toggleDayAvailability = (day: string) => {
    setAvailability(prev => 
      prev.map(item => 
        item.day === day 
          ? { ...item, available: !item.available }
          : item
      )
    )
  }

  const updateDayTime = (day: string, startTime: string, endTime: string) => {
    setAvailability(prev => 
      prev.map(item => 
        item.day === day 
          ? { ...item, startTime, endTime }
          : item
      )
    )
  }

  const saveAvailability = async () => {
    if (!user) return
    
    try {
      setSaving(true)
      
      // Sync all time inputs before saving
      Object.values(timeInputRefs.current).forEach(syncFn => {
        if (syncFn) syncFn()
      })
      
      // Convert UI format to database format
      const availabilityData: Record<string, string[]> = {}
      
      availability.forEach(day => {
        if (day.available) {
          availabilityData[day.dutchName] = [day.startTime, day.endTime]
        }
      })

      const { error } = await supabase
        .from('standard_availability')
        .upsert({
          instructor_id: user.id,
          availability_data: availabilityData,
          default_lesson_duration: defaultLessonDuration
        }, { 
          onConflict: 'instructor_id',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Error saving availability:', error)
        toast.error('Fout bij het opslaan van de beschikbaarheid')
        return
      }

      toast.success('Instellingen succesvol opgeslagen!')
      setSaved(true)
      
      // Reset saved state after 1 second and redirect to dashboard
      setTimeout(() => {
        setSaved(false)
        // router.push('/dashboard')
      }, 1000)
    } catch (error) {
      console.error('Error saving availability:', error)
      toast.error('Fout bij het opslaan van de instellingen')
    } finally {
      setSaving(false)
    }
  }

  const getAvailableDaysCount = () => {
    return availability.filter(day => day.available).length
  }

  const getTotalHours = () => {
    return availability
      .filter(day => day.available)
      .reduce((total, day) => {
        const start = parseInt(day.startTime.split(':')[0])
        const end = parseInt(day.endTime.split(':')[0])
        return total + (end - start)
      }, 0)
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
                <span className="hidden sm:inline">Terug naar dashboard</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveAvailability}
                disabled={saving}
                className="btn btn-primary flex items-center gap-2 text-sm px-3 py-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Opslaan...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-3 w-3" />
                    Opgeslagen!
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    Opslaan
                  </>
                )}
              </button>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Rooster Instellingen
          </h1>
          {/* <p className="text-gray-600">
            Configureer je standaard beschikbare tijden en lesduur voor lesplanning
          </p> */}
        </div>

        {/* Default Lesson Duration */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Standaard lesduur</h3>
          <div className="space-y-4">
            <div>
              {/* <label className="block text-sm font-medium text-gray-700 mb-2">
                Standaard aantal minuten per les
              </label> */}
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="15"
                  max="180"
                  step="5"
                  value={defaultLessonDuration}
                  onChange={(e) => setDefaultLessonDuration(parseInt(e.target.value) || 50)}
                  className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                />
                <span className="text-gray-600">minuten</span>
              </div>
              {/* <p className="text-sm text-gray-500 mt-2">
                Deze duur wordt gebruikt om te berekenen hoeveel lessen er worden geregistreerd voor een les.
                Bijvoorbeeld: een les van 95-105 minuten wordt geteld als 2 lessen van {defaultLessonDuration} minuten.
              </p> */}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card text-center">
            <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{getAvailableDaysCount()}</div>
            <div className="text-sm text-gray-600">Beschikbare dagen</div>
          </div>
          <div className="card text-center">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{getTotalHours()}</div>
            <div className="text-sm text-gray-600">Uren per week</div>
          </div>
        </div>

        {/* Availability Settings */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Standaard dagelijkse beschikbaarheid</h3>
          
          {loadingAvailability ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Beschikbaarheid laden...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availability.map((day) => (
                <div key={day.day} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={day.available}
                        onChange={() => toggleDayAvailability(day.day)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-900">{day.name}</span>
                    </div>
                    <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                      day.available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {day.available ? 'Beschikbaar' : 'Niet beschikbaar'}
                    </div>
                  </div>
                  
                  {day.available && (
                    <div className="flex items-center gap-4">
                      <TimeInput
                        startTime={day.startTime}
                        endTime={day.endTime}
                        onTimeChange={(startTime, endTime) => updateDayTime(day.day, startTime, endTime)}
                        className="flex-1"
                        onSync={(syncFn) => {
                          timeInputRefs.current[day.day] = syncFn
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 