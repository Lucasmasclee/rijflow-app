'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Calendar, 
  Settings,
  ArrowLeft,
  Save,
  Check
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { InstructorAvailability } from '@/types/database'
import toast from 'react-hot-toast'

interface DayAvailability {
  day: string
  name: string
  available: boolean
}

export default function ScheduleSettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [availability, setAvailability] = useState<DayAvailability[]>([
    { day: 'monday', name: 'Maandag', available: true },
    { day: 'tuesday', name: 'Dinsdag', available: true },
    { day: 'wednesday', name: 'Woensdag', available: true },
    { day: 'thursday', name: 'Donderdag', available: true },
    { day: 'friday', name: 'Vrijdag', available: true },
    { day: 'saturday', name: 'Zaterdag', available: false },
    { day: 'sunday', name: 'Zondag', available: false }
  ])
  const [saved, setSaved] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(true)

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
        .insert(defaultAvailability)

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
            acc[dayName] = item.available
          }
          return acc
        }, {} as Record<string, boolean>)

        setAvailability(prev => prev.map(day => ({
          ...day,
          available: dbAvailability[day.day] ?? day.available
        })))
      } else {
        // No data in database, initialize default availability
        await initializeDefaultAvailability()
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

  const saveAvailability = async () => {
    if (!user) return
    
    try {
      // Convert UI format to database format
      const availabilityData = availability.map(day => ({
        instructor_id: user.id,
        day_of_week: dayToNumber[day.day as keyof typeof dayToNumber],
        available: day.available
      }))

      // Delete existing availability for this instructor
      const { error: deleteError } = await supabase
        .from('instructor_availability')
        .delete()
        .eq('instructor_id', user.id)

      if (deleteError) {
        console.error('Error deleting existing availability:', deleteError)
        toast.error('Fout bij het opslaan van beschikbaarheid')
        return
      }

      // Insert new availability
      const { error: insertError } = await supabase
        .from('instructor_availability')
        .insert(availabilityData)

      if (insertError) {
        console.error('Error inserting availability:', insertError)
        toast.error('Fout bij het opslaan van beschikbaarheid')
        return
      }

      setSaved(true)
      toast.success('Beschikbaarheid succesvol opgeslagen!')
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving availability:', error)
      toast.error('Fout bij het opslaan van beschikbaarheid')
    }
  }

  const getAvailableDaysCount = () => {
    return availability.filter(day => day.available).length
  }

  if (loading || loadingAvailability) {
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
              <Link href="/dashboard/week-overview" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug naar Weekoverzicht
              </Link>
            </div>
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Rooster Instellingen</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Beschikbaarheid instellen</h1>
          <p className="text-gray-600">
            Geef aan op welke dagen je beschikbaar bent voor rijlessen. Dagen waarop je niet beschikbaar bent worden grijs weergegeven in het weekoverzicht.
          </p>
        </div>

        {/* Availability Settings */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Dagelijkse beschikbaarheid</h2>
            <p className="text-sm text-gray-600 mt-1">
              Vink de dagen aan waarop je beschikbaar bent voor rijlessen
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {availability.map((day) => (
                <div 
                  key={day.day}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-4 ${
                      day.available ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                      {day.available && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-lg font-medium text-gray-900">{day.name}</span>
                  </div>
                  
                  <button
                    onClick={() => toggleDayAvailability(day.day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      day.available
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.available ? 'Beschikbaar' : 'Niet beschikbaar'}
                  </button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Samenvatting
                  </p>
                  <p className="text-sm text-blue-700">
                    Je bent beschikbaar op {getAvailableDaysCount()} van de 7 dagen per week
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    {getAvailableDaysCount()}/7
                  </p>
                  <p className="text-xs text-blue-600">dagen beschikbaar</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveAvailability}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  saved
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Opgeslagen!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Instellingen opslaan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="mt-6 bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Hoe werkt dit?</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                • <strong>Beschikbare dagen:</strong> Op deze dagen kun je rijlessen plannen en worden ze normaal weergegeven in het weekoverzicht.
              </p>
              <p>
                • <strong>Niet beschikbare dagen:</strong> Deze dagen worden grijs weergegeven in het weekoverzicht en je kunt er geen lessen plannen.
              </p>
              <p>
                • <strong>Instellingen opslaan:</strong> Je instellingen worden automatisch opgeslagen en blijven bewaard voor toekomstige sessies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 