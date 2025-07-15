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
import { InstructorAvailability } from '@/types/database'
import toast from 'react-hot-toast'

interface DayAvailability {
  day: string
  name: string
  available: boolean
  startTime: string
  endTime: string
}

export default function ScheduleSettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [availability, setAvailability] = useState<DayAvailability[]>([
    { day: 'monday', name: 'Maandag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'tuesday', name: 'Dinsdag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'wednesday', name: 'Woensdag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'thursday', name: 'Donderdag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'friday', name: 'Vrijdag', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'saturday', name: 'Zaterdag', available: false, startTime: '09:00', endTime: '17:00' },
    { day: 'sunday', name: 'Zondag', available: false, startTime: '09:00', endTime: '17:00' }
  ])
  const [saved, setSaved] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(true)
  const [saving, setSaving] = useState(false)

  // Map day names to day numbers (0-6, Sunday-Saturday)
  const dayToNumber = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  }

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

  // Fetch availability from database
  const fetchAvailability = async () => {
    if (!user) return
    
    try {
      setLoadingAvailability(true)
      const { data, error } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', user.id)

      if (error) {
        // If table doesn't exist, show error message
        if (error.code === '42P01') {
          console.error('Instructor availability table not found. Please run the database setup script.')
          toast.error('Database tabel ontbreekt. Neem contact op met de beheerder.')
          return
        }
        console.error('Error fetching availability:', error)
        return
      }

      // Transform database data to UI format
      if (data && data.length > 0) {
        const dbAvailability = data.reduce((acc, item) => {
          const dayName = Object.keys(dayToNumber).find(key => dayToNumber[key as keyof typeof dayToNumber] === item.day_of_week)
          if (dayName) {
            acc[dayName] = {
              available: item.available,
              startTime: item.start_time || '09:00',
              endTime: item.end_time || '17:00'
            }
          }
          return acc
        }, {} as Record<string, { available: boolean; startTime: string; endTime: string }>)

        setAvailability(prev => prev.map(day => ({
          ...day,
          available: dbAvailability[day.day]?.available ?? day.available,
          startTime: dbAvailability[day.day]?.startTime ?? day.startTime,
          endTime: dbAvailability[day.day]?.endTime ?? day.endTime
        })))
      } else {
        // No data in database, initialize default availability and fetch again
        await initializeDefaultAvailability()
        
        // Fetch the newly created data
        const { data: newData, error: newError } = await supabase
          .from('instructor_availability')
          .select('*')
          .eq('instructor_id', user.id)

        if (newData && newData.length > 0) {
          const dbAvailability = newData.reduce((acc, item) => {
            const dayName = Object.keys(dayToNumber).find(key => dayToNumber[key as keyof typeof dayToNumber] === item.day_of_week)
            if (dayName) {
              acc[dayName] = {
                available: item.available,
                startTime: item.start_time || '09:00',
                endTime: item.end_time || '17:00'
              }
            }
            return acc
          }, {} as Record<string, { available: boolean; startTime: string; endTime: string }>)

          setAvailability(prev => prev.map(day => ({
            ...day,
            available: dbAvailability[day.day]?.available ?? day.available,
            startTime: dbAvailability[day.day]?.startTime ?? day.startTime,
            endTime: dbAvailability[day.day]?.endTime ?? day.endTime
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoadingAvailability(false)
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

  const toggleDayAvailability = (day: string) => {
    setAvailability(prev => 
      prev.map(item => 
        item.day === day 
          ? { ...item, available: !item.available }
          : item
      )
    )
  }

  const updateDayTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => 
      prev.map(item => 
        item.day === day 
          ? { ...item, [field]: value }
          : item
      )
    )
  }

  const saveAvailability = async () => {
    if (!user) return
    
    try {
      setSaving(true)
      // Convert UI format to database format
      const availabilityData = availability.map(day => ({
        instructor_id: user.id,
        day_of_week: dayToNumber[day.day as keyof typeof dayToNumber],
        available: day.available,
        start_time: day.startTime,
        end_time: day.endTime
      }))

      const { error } = await supabase
        .from('instructor_availability')
        .upsert(availabilityData, { 
          onConflict: 'instructor_id,day_of_week',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Error saving availability:', error)
        toast.error('Fout bij het opslaan van de beschikbaarheid')
        return
      }

      toast.success('Beschikbaarheid succesvol opgeslagen!')
      setSaved(true)
      
      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving availability:', error)
      toast.error('Fout bij het opslaan van de beschikbaarheid')
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
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Terug naar dashboard</span>
              </Link>
            </div>
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Instellingen</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Planning Instellingen
          </h1>
          <p className="text-gray-600">
            Configureer je beschikbare tijden voor lesplanning
          </p>
        </div>

        {/* Stats */}
        <div className="mobile-grid md:grid-cols-2 gap-4 mb-6">
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
          <h3 className="text-lg font-semibold mb-4">Dagelijkse beschikbaarheid</h3>
          
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
                    <div className="mobile-grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Starttijd
                        </label>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(e) => updateDayTime(day.day, 'startTime', e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Eindtijd
                        </label>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(e) => updateDayTime(day.day, 'endTime', e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveAvailability}
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Opslaan...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Opgeslagen!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Opslaan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 