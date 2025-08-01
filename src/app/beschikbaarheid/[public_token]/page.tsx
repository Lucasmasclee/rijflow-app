'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, Save, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Student {
  id: string
  first_name: string
  last_name: string
  public_token: string
}

interface AvailabilityData {
  [key: string]: string[]
}

const daysOfWeek = [
  { key: 'maandag', label: 'Maandag' },
  { key: 'dinsdag', label: 'Dinsdag' },
  { key: 'woensdag', label: 'Woensdag' },
  { key: 'donderdag', label: 'Donderdag' },
  { key: 'vrijdag', label: 'Vrijdag' },
  { key: 'zaterdag', label: 'Zaterdag' },
  { key: 'zondag', label: 'Zondag' }
]

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30'
]

export default function BeschikbaarheidPage() {
  const params = useParams()
  const publicToken = params.public_token as string
  
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityData>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (publicToken) {
      fetchStudent()
    }
  }, [publicToken])

  const fetchStudent = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('public_token', publicToken)
        .single()

      if (error || !data) {
        setError('Ongeldige of verlopen link')
        return
      }

      setStudent(data)

      // Load existing availability if any
      const { data: existingAvailability } = await supabase
        .from('student_availability')
        .select('availability_data')
        .eq('student_id', data.id)
        .single()

      if (existingAvailability?.availability_data) {
        setAvailability(existingAvailability.availability_data)
      } else {
        // Initialize empty availability
        const emptyAvailability: AvailabilityData = {}
        daysOfWeek.forEach(day => {
          emptyAvailability[day.key] = []
        })
        setAvailability(emptyAvailability)
      }
    } catch (error) {
      console.error('Error fetching student:', error)
      setError('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeChange = (day: string, index: number, value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day]?.map((time, i) => i === index ? value : time) || []
    }))
  }

  const addTimeSlot = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), '09:00', '17:00']
    }))
  }

  const removeTimeSlot = (day: string, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day]?.filter((_, i) => i !== index * 2 && i !== index * 2 + 1) || []
    }))
  }

  const handleSave = async () => {
    if (!student) return

    try {
      setSaving(true)

      // Validate availability data
      const hasValidData = Object.values(availability).some(times => times.length > 0)
      if (!hasValidData) {
        toast.error('Vul minimaal één dag in')
        return
      }

      // Upsert availability data
      const { error } = await supabase
        .from('student_availability')
        .upsert({
          student_id: student.id,
          week_start: new Date().toISOString().split('T')[0], // Today's date as week start
          availability_data: availability
        })

      if (error) {
        console.error('Error saving availability:', error)
        toast.error('Fout bij het opslaan van beschikbaarheid')
        return
      }

      toast.success('Beschikbaarheid succesvol opgeslagen!')
    } catch (error) {
      console.error('Error saving availability:', error)
      toast.error('Er is een fout opgetreden')
    } finally {
      setSaving(false)
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

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Leerling niet gevonden'}
          </h1>
          <p className="text-gray-600">
            De link is ongeldig of verlopen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Maandag vd week - Zondag vd week
              </h1>
              <p className="text-gray-600">
                Welkom {student.first_name}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Vul hieronderper datum je beschikbaarheid in. 
            Je kunt dit later altijd wijzigen door opnieuw op de link te klikken.
          </p>
        </div>

        {/* Availability Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            {daysOfWeek.map((day) => (
              <div key={day.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{day.label}</h3>
                  <button
                    onClick={() => addTimeSlot(day.key)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Tijdsblok toevoegen
                  </button>
                </div>

                {availability[day.key]?.length > 0 ? (
                  <div className="space-y-3">
                    {Array.from({ length: Math.floor(availability[day.key]?.length / 2) || 0 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <select
                            value={availability[day.key]?.[index * 2] || ''}
                            onChange={(e) => handleTimeChange(day.key, index * 2, e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            {timeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <span className="text-gray-500">tot</span>
                          <select
                            value={availability[day.key]?.[index * 2 + 1] || ''}
                            onChange={(e) => handleTimeChange(day.key, index * 2 + 1, e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            {timeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => removeTimeSlot(day.key, index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Verwijderen
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Nog geen tijden ingevuld</p>
                    <button
                      onClick={() => addTimeSlot(day.key)}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Tijdsblok toevoegen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Opslaan...
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
    </div>
  )
}
