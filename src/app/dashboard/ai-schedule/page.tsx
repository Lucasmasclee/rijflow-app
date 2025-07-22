'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Users, Calendar, Settings, Brain, Check, X, Clock, MapPin } from 'lucide-react'
import { useEffect, useState, Suspense, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Student, AIWeekplanningData } from '@/types/database'
import TimeInput from '@/components/TimeInput'

import toast from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'

const DAY_ORDER = [
  { day: 'monday', name: 'Maandag', shortName: 'Ma', dutchName: 'maandag' },
  { day: 'tuesday', name: 'Dinsdag', shortName: 'Di', dutchName: 'dinsdag' },
  { day: 'wednesday', name: 'Woensdag', shortName: 'Wo', dutchName: 'woensdag' },
  { day: 'thursday', name: 'Donderdag', shortName: 'Do', dutchName: 'donderdag' },
  { day: 'friday', name: 'Vrijdag', shortName: 'Vr', dutchName: 'vrijdag' },
  { day: 'saturday', name: 'Zaterdag', shortName: 'Za', dutchName: 'zaterdag' },
  { day: 'sunday', name: 'Zondag', shortName: 'Zo', dutchName: 'zondag' },
]

type Step = 'week-selection' | 'instructor' | 'students' | 'settings' | 'test-planning'

interface StudentWithAvailability extends Student {
  availability_data: Record<string, string[]>
}

interface DayAvailability {
  day: string
  available: boolean
  startTime: string
  endTime: string
  startHours: string
  startMinutes: string
  endHours: string
  endMinutes: string
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

function AISchedulePageContent() {
  const { user, loading, mounted } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<Step>('week-selection')
  const [loadingData, setLoadingData] = useState(true)

  // Week selection
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null)
  const [availableWeeks, setAvailableWeeks] = useState<Date[]>([])

  // AI data
  const [aiData, setAiData] = useState<AIWeekplanningData | null>(null)
  const [isRunningTestPlanning, setIsRunningTestPlanning] = useState(false)
  const [testPlanningResult, setTestPlanningResult] = useState<any>(null)

  // Instructor availability
  const [instructorAvailability, setInstructorAvailability] = useState<DayAvailability[]>([
    { day: 'monday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'tuesday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'wednesday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'thursday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'friday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'saturday', available: false, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'sunday', available: false, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
  ])

  // Students data
  const [students, setStudents] = useState<StudentWithAvailability[]>([])

  // Settings
  const [settings, setSettings] = useState({
    maxLessenPerDag: 6,
    blokuren: true,
    pauzeTussenLessen: 10,
    langePauzeDuur: 0,
    locatiesKoppelen: true
  })

  // Helper functions
  const getMonday = (date: Date) => {
    const newDate = new Date(date)
    const day = newDate.getDay()
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1)
    newDate.setDate(diff)
    return newDate
  }

  const formatDateToISO = (date: Date) => {
    // Zorg ervoor dat we de maandag van de geselecteerde week krijgen
    const mondayOfWeek = getMonday(date)
    return mondayOfWeek.toISOString().split('T')[0]
  }

  const generateAvailableWeeks = () => {
    const weeks = []
    const today = new Date()
    const nextMonday = getMonday(today)
    
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(nextMonday)
      weekStart.setDate(nextMonday.getDate() + (i * 7))
      weeks.push(weekStart)
    }
    
    return weeks
  }

  // Time validation and formatting
  const validateAndFormatTime = (timeValue: string): string => {
    const time = timeValue.replace(/[^0-9]/g, '')
    if (time.length >= 3) {
      const hours = time.slice(0, 2)
      const minutes = time.slice(2, 4)
      const hour = parseInt(hours)
      const minute = parseInt(minutes)
      
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
      }
    }
    return timeValue
  }

  const formatTimeOnBlur = (value: string, maxValue: number): string => {
    const time = value.replace(/[^0-9]/g, '')
    if (time.length > 0) {
      const num = parseInt(time)
      if (num >= 0 && num <= maxValue) {
        return num.toString().padStart(2, '0')
      }
    }
    return '00'
  }

  // Time input handlers
  const updateTimeInputs = (dayIndex: number, field: string, value: string) => {
    const day = instructorAvailability[dayIndex]
    if (field === 'startHours') {
      day.startHours = value
      day.startTime = `${day.startHours}:${day.startMinutes}`
    } else if (field === 'startMinutes') {
      day.startMinutes = value
      day.startTime = `${day.startHours}:${day.startMinutes}`
    } else if (field === 'endHours') {
      day.endHours = value
      day.endTime = `${day.endHours}:${day.endMinutes}`
    } else if (field === 'endMinutes') {
      day.endMinutes = value
      day.endTime = `${day.endHours}:${day.endMinutes}`
    }
    
    setInstructorAvailability([...instructorAvailability])
  }

  const handleTimeBlur = (dayIndex: number, field: string, value: string) => {
    const maxValue = field.includes('Hours') ? 23 : 59
    const formattedValue = formatTimeOnBlur(value, maxValue)
    updateTimeInputs(dayIndex, field, formattedValue)
  }

  const handleAvailabilityChange = (dayIndex: number, available: boolean) => {
    const newAvailability = [...instructorAvailability]
    newAvailability[dayIndex].available = available
    setInstructorAvailability(newAvailability)
  }

  const handleTimeChange = (dayIndex: number, field: string, value: string) => {
    const validatedValue = validateAndFormatTime(value)
    updateTimeInputs(dayIndex, field, validatedValue)
  }

  // Student availability handlers
  const handleStudentAvailabilityChange = (studentIndex: number, dayIndex: number, available: boolean) => {
    const newStudents = [...students]
    const student = newStudents[studentIndex]
    
    if (!student.availability_data) {
      student.availability_data = {}
    }
    
    const dayInfo = DAY_ORDER[dayIndex]
    if (available) {
      student.availability_data[dayInfo.dutchName] = ['09:00', '17:00']
    } else {
      delete student.availability_data[dayInfo.dutchName]
    }
    
    setStudents(newStudents)
  }

  const handleStudentTimeChange = (studentIndex: number, dayIndex: number, field: 'start' | 'end', value: string) => {
    const newStudents = [...students]
    const student = newStudents[studentIndex]
    const dayInfo = DAY_ORDER[dayIndex]
    
    if (!student.availability_data) {
      student.availability_data = {}
    }
    
    if (!student.availability_data[dayInfo.dutchName]) {
      student.availability_data[dayInfo.dutchName] = ['09:00', '17:00']
    }
    
    const timeIndex = field === 'start' ? 0 : 1
    student.availability_data[dayInfo.dutchName][timeIndex] = value
    
    setStudents(newStudents)
  }

  // Data loading
  const loadWeekData = async (weekStart: Date) => {
    if (!user) return
    
    setLoadingData(true)
    try {
      const weekStartString = formatDateToISO(weekStart)
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast.error('Niet ingelogd. Log opnieuw in.')
        return
      }

      const response = await fetch('/api/ai-schedule/create-editable-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          weekStart: weekStartString
        })
      })

      if (!response.ok) {
        const error = await response.json()
        const errorMessage = error.error || 'Onbekende fout'
        
        // Specifieke afhandeling voor "No data found" fout
        if (errorMessage.includes('No data found for the specified instructor and week')) {
          toast.error('Fout bij laden van weekdata: Geen data gevonden voor deze instructeur en week')
        } else if (errorMessage.includes('No students found for this instructor')) {
          toast.error('Fout bij laden van weekdata: Geen leerlingen gevonden voor deze instructeur. Voeg eerst leerlingen toe.')
        } else {
          toast.error('Fout bij laden van weekdata: ' + errorMessage)
        }
        return
      }

      const result = await response.json()
      const data = result.data as AIWeekplanningData
      
      setAiData(data)
      
      // Update instructor availability
      if (data.instructeur) {
        const newInstructorAvailability = DAY_ORDER.map(dayInfo => {
          const dayData = data.instructeur.beschikbareUren[dayInfo.dutchName]
          return {
            day: dayInfo.day,
            available: !!dayData,
            startTime: dayData ? dayData[0] : '09:00',
            endTime: dayData ? dayData[1] : '17:00',
            startHours: dayData ? dayData[0].split(':')[0] : '09',
            startMinutes: dayData ? dayData[0].split(':')[1] : '00',
            endHours: dayData ? dayData[1].split(':')[0] : '17',
            endMinutes: dayData ? dayData[1].split(':')[1] : '00'
          }
        })
        setInstructorAvailability(newInstructorAvailability)
        
        // Update settings
        setSettings({
          maxLessenPerDag: data.instructeur.maxLessenPerDag,
          blokuren: data.instructeur.blokuren,
          pauzeTussenLessen: data.instructeur.pauzeTussenLessen,
          langePauzeDuur: data.instructeur.langePauzeDuur,
          locatiesKoppelen: data.instructeur.locatiesKoppelen
        })
      }
      
      // Update students
      if (data.leerlingen) {
        const newStudents = data.leerlingen.map(student => ({
          id: student.id,
          first_name: student.naam?.split(' ')[0] ?? '',
          last_name: student.naam?.split(' ').slice(1).join(' ') ?? '',
          email: '',
          phone: '',
          address: '',
          instructor_id: user.id,
          default_lessons_per_week: student.lessenPerWeek ?? 1,
          default_lesson_duration_minutes: student.lesDuur ?? 60,
          availability_data: student.beschikbaarheid ?? {},
          created_at: '',
          updated_at: '',
          instructeur_id: user.id,
        }))
        setStudents(newStudents)
      }
      
      // Toon succesbericht als er een nieuwe beschikbaarheid is aangemaakt
      if (result.message && result.message.includes('New availability created with default values')) {
        toast.success('Nieuwe beschikbaarheid aangemaakt met standaardwaarden')
      }

      // Zorg ervoor dat alle studenten availability records hebben
      await ensureStudentAvailability()

      // Debug: Check if student availability records exist after loading
      await debugStudentAvailability(weekStartString)
      
    } catch (error) {
      console.error('Error loading week data:', error)
      toast.error('Fout bij laden van weekdata')
    } finally {
      setLoadingData(false)
    }
  }

  const saveAvailabilityData = async () => {
    if (!user || !selectedWeek) return
    
    try {
      const weekStartString = formatDateToISO(selectedWeek)
      
      console.log('Saving availability data for week:', weekStartString)
      console.log('Number of students:', students.length)
      
      // Convert instructor availability to JSON format
      const instructorAvailabilityData: Record<string, string[]> = {}
      instructorAvailability.forEach(day => {
        if (day.available) {
          const dayInfo = DAY_ORDER.find(d => d.day === day.day)
          if (dayInfo) {
            instructorAvailabilityData[dayInfo.dutchName] = [day.startTime, day.endTime]
          }
        }
      })
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast.error('Niet ingelogd. Log opnieuw in.')
        return
      }

      const requestBody = {
        weekStart: weekStartString,
        instructorAvailability: {
          availability_data: instructorAvailabilityData,
          settings: settings
        },
        studentAvailability: students.map(student => ({
          id: student.id,
          availability_data: student.availability_data || {}
        }))
      }

      console.log('Request body details:')
      console.log('- Week start:', weekStartString)
      console.log('- Instructor availability:', instructorAvailabilityData)
      console.log('- Number of students:', students.length)
      console.log('- Student IDs:', students.map(s => s.id))

      console.log('Sending request to update-availability:', requestBody)

      const response = await fetch('/api/ai-schedule/update-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Error response from update-availability:', error)
        toast.error('Fout bij opslaan: ' + (error.error || 'Onbekende fout'))
        return
      }

      const result = await response.json()
      console.log('Success response from update-availability:', result)
      toast.success('Beschikbaarheid succesvol opgeslagen')

      // Debug: Check if student availability records were created
      await debugStudentAvailability(weekStartString)
      
    } catch (error) {
      console.error('Error saving availability:', error)
      toast.error('Fout bij opslaan van beschikbaarheid')
    }
  }

  const ensureStudentAvailability = async () => {
    if (!user || !selectedWeek) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No session token available for ensuring student availability')
        return
      }

      const weekStartString = formatDateToISO(selectedWeek)
      
      // Debug: Log de datum berekening
      console.log('Selected week date:', selectedWeek)
      console.log('Calculated Monday of week:', getMonday(selectedWeek))
      console.log('Formatted week start string:', weekStartString)
      console.log('Ensuring student availability for week:', weekStartString)

      const response = await fetch('/api/ai-schedule/create-student-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          weekStart: weekStartString,
          instructorId: user.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Error ensuring student availability:', error)
        toast.error('Fout bij aanmaken van student beschikbaarheid: ' + (error.error || 'Onbekende fout'))
        return
      }

      const result = await response.json()
      console.log('Student availability creation result:', result)
      
      if (result.createdRecords > 0) {
        toast.success(`${result.createdRecords} student beschikbaarheid records aangemaakt`)
        // Herlaad de data om de nieuwe records te tonen
        await loadWeekData(selectedWeek)
      }
      
    } catch (error) {
      console.error('Error ensuring student availability:', error)
      toast.error('Fout bij aanmaken van student beschikbaarheid')
    }
  }

  const debugStudentAvailability = async (weekStart: string) => {
    if (!user) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No session token available for debug')
        return
      }

      const response = await fetch('/api/ai-schedule/debug-student-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          weekStart,
          instructorId: user.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Debug API error:', error)
        return
      }

      const result = await response.json()
      console.log('Debug student availability result:', result.debugInfo)
      
      if (result.debugInfo.missingStudents > 0) {
        console.warn('Missing student availability records:', result.debugInfo.missingStudentsDetails)
      } else {
        console.log('All students have availability records!')
      }
      
    } catch (error) {
      console.error('Error in debug function:', error)
    }
  }

  const handleStartTestPlanning = async () => {
    if (!aiData) {
      toast.error('Geen data beschikbaar voor test planning')
      return
    }

    setIsRunningTestPlanning(true)
    try {
      // First save current data
      await saveAvailabilityData()
      
      // Then reload data to ensure we have the latest
      await loadWeekData(selectedWeek!)
      
      // Run test planning
      const response = await fetch('/api/ai-schedule/run-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: aiData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('Fout bij uitvoeren van planning: ' + (error.error || 'Onbekende fout'))
        return
      }

      const result = await response.json()
      setTestPlanningResult(result.data)
      toast.success('Weekplanning succesvol gegenereerd')
      
    } catch (error) {
      console.error('Error running test planning:', error)
      toast.error('Fout bij uitvoeren van test planning')
    } finally {
      setIsRunningTestPlanning(false)
    }
  }

  // Initialize
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && !loading) {
      setAvailableWeeks(generateAvailableWeeks())
    }
  }, [user, loading])

  useEffect(() => {
    if (selectedWeek) {
      loadWeekData(selectedWeek)
    }
  }, [selectedWeek, user])

  // Navigation
  const handleNext = async () => {
    if (currentStep === 'week-selection') {
      if (!selectedWeek) {
        toast.error('Selecteer eerst een week')
        return
      }
      
      // Zorg ervoor dat alle studenten availability records hebben voor deze week
      await ensureStudentAvailability()
      
      // Data is al geladen wanneer de week werd geselecteerd
      setCurrentStep('instructor')
    } else if (currentStep === 'instructor') {
      // Sla instructeur beschikbaarheid op voordat we naar de volgende stap gaan
      await saveAvailabilityData()
      setCurrentStep('students')
    } else if (currentStep === 'students') {
      // Sla student beschikbaarheid op voordat we naar de volgende stap gaan
      await saveAvailabilityData()
      setCurrentStep('settings')
    } else if (currentStep === 'settings') {
      // Sla instellingen op voordat we naar de volgende stap gaan
      await saveAvailabilityData()
      setCurrentStep('test-planning')
    }
  }

  const handlePrevious = () => {
    if (currentStep === 'instructor') {
      setCurrentStep('week-selection')
    } else if (currentStep === 'students') {
      setCurrentStep('instructor')
    } else if (currentStep === 'settings') {
      setCurrentStep('students')
    } else if (currentStep === 'test-planning') {
      setCurrentStep('settings')
    }
  }

  const canGoNext = () => {
    if (currentStep === 'week-selection') {
      return selectedWeek !== null
    }
    return true
  }

  const getSelectedWeekInfo = () => {
    if (!selectedWeek) return null
    
    const weekStart = new Date(selectedWeek)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return {
      start: weekStart.toLocaleDateString('nl-NL', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      end: weekEnd.toLocaleDateString('nl-NL', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    }
  }

  const steps = [
    { key: 'week-selection', name: 'Week Selectie', icon: Calendar },
    { key: 'instructor', name: 'Instructeur', icon: Users },
    { key: 'students', name: 'Leerlingen', icon: Users },
    { key: 'settings', name: 'Instellingen', icon: Settings },
    { key: 'test-planning', name: 'Test Planning', icon: Brain }
  ]

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-mobile py-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/lessons"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  AI-geassisteerde Planning
                </h1>
                <p className="text-sm text-gray-600">
                  Laat AI je optimale lesrooster maken
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className={`flex items-center gap-2 ${currentStep === step.key ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step.key 
                      ? 'bg-blue-600 text-white' 
                      : index < steps.findIndex(s => s.key === currentStep)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index < steps.findIndex(s => s.key === currentStep) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-px mx-2 ${
                    index < steps.findIndex(s => s.key === currentStep) ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container-mobile py-6">
          {/* Week Selection */}
          {currentStep === 'week-selection' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Selecteer Week</h3>
                <p className="text-gray-600 mb-6">
                  Kies een week waarvoor je een AI Weekplanning wilt genereren:
                </p>
              </div>
              
              <div className="grid gap-4">
                {availableWeeks.map((week, index) => {
                  const weekStart = new Date(week)
                  const weekEnd = new Date(weekStart)
                  weekEnd.setDate(weekStart.getDate() + 6)
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedWeek(week)
                        loadWeekData(week)
                      }}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        selectedWeek?.getTime() === week.getTime()
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {index === 0 ? 'Deze week' : index === 1 ? 'Volgende week' : 'Over ' + (index) + ' weken'}
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
          )}

          {/* Instructor Availability */}
          {currentStep === 'instructor' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Instructeur Beschikbaarheid</h3>
                <p className="text-gray-600 mb-6">
                  Stel je beschikbare tijden in voor de geselecteerde week
                </p>
                {getSelectedWeekInfo() && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Geselecteerde week:</strong> {getSelectedWeekInfo()?.start} - {getSelectedWeekInfo()?.end}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="card">
                <div className="space-y-4">
                  {instructorAvailability.map((day, index) => (
                    <div key={day.day} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={day.available}
                          onChange={(e) => handleAvailabilityChange(index, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="font-medium min-w-[80px]">{DAY_ORDER[index].name}</span>
                      </div>
                      
                      {day.available && (
                        <TimeInput
                          startTime={day.startTime}
                          endTime={day.endTime}
                          onTimeChange={(startTime, endTime) => {
                            const [startHours, startMinutes] = startTime.split(':')
                            const [endHours, endMinutes] = endTime.split(':')
                            updateTimeInputs(index, 'startHours', startHours)
                            updateTimeInputs(index, 'startMinutes', startMinutes)
                            updateTimeInputs(index, 'endHours', endHours)
                            updateTimeInputs(index, 'endMinutes', endMinutes)
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Students */}
          {currentStep === 'students' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Leerling Beschikbaarheid</h3>
                <p className="text-gray-600 mb-6">
                  Stel de beschikbaarheid in voor elke leerling
                </p>
              </div>
              
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {students.map((student, studentIndex) => (
                    <div key={student.id} className="card">
                      <h4 className="font-semibold mb-4">
                        {student.first_name} {student.last_name}
                      </h4>
                      
                      <div className="space-y-4">
                        {DAY_ORDER.map((dayInfo, dayIndex) => {
                          const dayData = student.availability_data?.[dayInfo.dutchName]
                          const isAvailable = !!dayData
                          
                          return (
                            <div key={dayInfo.day} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isAvailable}
                                  onChange={(e) => handleStudentAvailabilityChange(studentIndex, dayIndex, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="font-medium min-w-[80px]">{dayInfo.name}</span>
                              </div>
                              
                              {isAvailable && (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={dayData?.[0] || '09:00'}
                                      onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'start', e.target.value)}
                                      className="w-16 h-8 text-center border border-gray-300 rounded text-sm"
                                      placeholder="09:00"
                                    />
                                  </div>
                                  <span>-</span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={dayData?.[1] || '17:00'}
                                      onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'end', e.target.value)}
                                      className="w-16 h-8 text-center border border-gray-300 rounded text-sm"
                                      placeholder="17:00"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {currentStep === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">AI Instellingen</h3>
                <p className="text-gray-600 mb-6">
                  Configureer de AI instellingen voor de weekplanning
                </p>
              </div>
              
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-medium">Maximale lessen per dag</label>
                  <input
                    type="number"
                    value={settings.maxLessenPerDag}
                    onChange={(e) => setSettings({...settings, maxLessenPerDag: parseInt(e.target.value) || 6})}
                    className="w-20 h-8 text-center border border-gray-300 rounded"
                    min="1"
                    max="10"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="font-medium">Pauze tussen lessen (minuten)</label>
                  <input
                    type="number"
                    value={settings.pauzeTussenLessen}
                    onChange={(e) => setSettings({...settings, pauzeTussenLessen: parseInt(e.target.value) || 10})}
                    className="w-20 h-8 text-center border border-gray-300 rounded"
                    min="0"
                    max="60"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="font-medium">Lange pauze duur (minuten)</label>
                  <input
                    type="number"
                    value={settings.langePauzeDuur}
                    onChange={(e) => setSettings({...settings, langePauzeDuur: parseInt(e.target.value) || 0})}
                    className="w-20 h-8 text-center border border-gray-300 rounded"
                    min="0"
                    max="120"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="font-medium">Blokuren</label>
                  <input
                    type="checkbox"
                    checked={settings.blokuren}
                    onChange={(e) => setSettings({...settings, blokuren: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="font-medium">Locaties koppelen</label>
                  <input
                    type="checkbox"
                    checked={settings.locatiesKoppelen}
                    onChange={(e) => setSettings({...settings, locatiesKoppelen: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test Planning */}
          {currentStep === 'test-planning' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Test Planning</h3>
                <p className="text-gray-600 mb-6">
                  Start de test planning om de gegenereerde weekplanning te bekijken
                </p>
              </div>
              
              <div className="card">
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Start Test Planning
                  </h4>
                  <p className="text-gray-600 mb-6">
                    De AI zal een optimaal rooster maken op basis van je instellingen en beschikbaarheid.
                  </p>
                  <button
                    onClick={handleStartTestPlanning}
                    disabled={isRunningTestPlanning}
                    className="btn btn-primary flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    {isRunningTestPlanning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Planning genereren...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Start Planning
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Show results */}
              {testPlanningResult && (
                <div className="card">
                  <h4 className="font-semibold mb-4">Resultaat</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(testPlanningResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 'week-selection'}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Vorige
            </button>
            
            <div className="flex items-center gap-2">
              {currentStep !== 'week-selection' && (
                <button
                  onClick={saveAvailabilityData}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Opslaan
                </button>
              )}
              
              <button
                onClick={handleNext}
                disabled={!canGoNext() || currentStep === 'test-planning'}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Volgende
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AISchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="container-mobile py-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    }>
      <AISchedulePageContent />
    </Suspense>
  )
}