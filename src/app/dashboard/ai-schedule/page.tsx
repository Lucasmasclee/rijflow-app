'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Student } from '@/types/database'

const DAY_ORDER = [
  { day: 'monday', name: 'Maandag' },
  { day: 'tuesday', name: 'Dinsdag' },
  { day: 'wednesday', name: 'Woensdag' },
  { day: 'thursday', name: 'Donderdag' },
  { day: 'friday', name: 'Vrijdag' },
  { day: 'saturday', name: 'Zaterdag' },
  { day: 'sunday', name: 'Zondag' },
]

type Step = 'instructor' | 'student-details' | 'settings' | 'prompt' | 'result'



interface StudentWithScheduleData extends Student {
  lessons: number
  minutes: number
  notes: string
  aiNotes: string
  availabilityNotes: string[] // Per week, komende 5 weken
}

export default function AISchedulePage() {
  const { user, loading, mounted } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>('instructor')
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0)
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Instructeur beschikbaarheid
  const [availability, setAvailability] = useState([
    { day: 'monday', available: true },
    { day: 'tuesday', available: true },
    { day: 'wednesday', available: true },
    { day: 'thursday', available: true },
    { day: 'friday', available: true },
    { day: 'saturday', available: false },
    { day: 'sunday', available: false },
  ])

  // Leerlingen data
  const [students, setStudents] = useState<StudentWithScheduleData[]>([])

  // Resultaat van ChatGPT (dummy)
  const [aiResult, setAiResult] = useState('')

  // Settings state
  const [settings, setSettings] = useState({
    connectLocations: true,
    numberOfBreaks: 2,
    minutesPerBreak: 15,
    breakAfterEachStudent: false,
    sendNotifications: false,
    additionalSpecifications: ''
  })

  // Fetch instructor availability from database
  const fetchInstructorAvailability = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', user.id)

      if (error) {
        console.error('Error fetching instructor availability:', error)
        return
      }

      // Transform database data to UI format
      if (data && data.length > 0) {
        const dbAvailability = data.reduce((acc, item) => {
          const dayName = DAY_ORDER.find(day => {
            const dayNumber = day.day === 'sunday' ? 0 : 
                             day.day === 'monday' ? 1 :
                             day.day === 'tuesday' ? 2 :
                             day.day === 'wednesday' ? 3 :
                             day.day === 'thursday' ? 4 :
                             day.day === 'friday' ? 5 : 6
            return dayNumber === item.day_of_week
          })
          if (dayName) {
            acc[dayName.day] = item.available
          }
          return acc
        }, {} as Record<string, boolean>)

        setAvailability(DAY_ORDER.map(({ day }) => ({
          day,
          available: dbAvailability[day] ?? true
        })))
      }
    } catch (error) {
      console.error('Error fetching instructor availability:', error)
    }
  }

  useEffect(() => {
    if (user && !loading && mounted) {
      fetchInstructorAvailability()
    }
  }, [user, loading, mounted])

  // Fetch students when user is available
  useEffect(() => {
    if (user && !loading && mounted) {
      fetchStudents()
    }
  }, [user, loading, mounted])

  // Fetch students from database
  const fetchStudents = async () => {
    if (!user) return
    
    try {
      setLoadingStudents(true)
      console.log('Fetching students for user:', user.id)
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('instructor_id', user.id)
        .order('first_name', { ascending: true })

      console.log('Database response:', { data, error })

      if (error) {
        console.error('Error fetching students:', error)
        return
      }

      // Haal alle student_ids op
      const studentIds = (data || []).map(s => s.id)
      // Haal alle beschikbaarheid voor deze leerlingen voor de komende 5 weken op
      const weeks = Array.from({ length: 5 }, (_, i) => {
        const today = new Date()
        const day = today.getDay()
        const mondayOffset = day === 0 ? -6 : 1 - day
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset + i * 7)
        monday.setHours(0,0,0,0)
        return new Date(monday)
      })
      const weekStarts = weeks.map(w => w.toISOString().slice(0,10))
      const { data: availData, error: availError } = await supabase
        .from('student_availability')
        .select('student_id, week_start, notes')
        .in('student_id', studentIds)
        .in('week_start', weekStarts)
      if (availError) {
        console.error('Error fetching availability:', availError)
      }
      // Transform students to include schedule data + beschikbaarheid
      const studentsWithScheduleData: StudentWithScheduleData[] = (data || []).map(student => {
        // Per week de juiste notitie zoeken
        const availabilityNotes = weeks.map(week => {
          const found = availData?.find(row => row.student_id === student.id && row.week_start === week.toISOString().slice(0,10))
          return found ? found.notes || '' : ''
        })
        return {
          ...student,
          lessons: 1,
          minutes: 60,
          notes: '',
          aiNotes: '',
          availabilityNotes,
        }
      })

      console.log('Transformed students:', studentsWithScheduleData)
      setStudents(studentsWithScheduleData)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  // Handler voor leerling inputs
  const handleStudentChange = (id: string, field: string, value: any) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  // Navigation handlers
  const handleNext = () => {
    switch (currentStep) {
      case 'instructor':
        setCurrentStep('student-details')
        break
      case 'student-details':
        if (currentStudentIndex < students.length - 1) {
          setCurrentStudentIndex(currentStudentIndex + 1)
        } else {
          setCurrentStep('settings')
        }
        break
      case 'settings':
        setCurrentStep('prompt')
        break
      case 'prompt':
        setCurrentStep('result')
        handleSendToAI()
        break
      default:
        break
    }
  }

  const handlePrevious = () => {
    switch (currentStep) {
      case 'student-details':
        if (currentStudentIndex > 0) {
          setCurrentStudentIndex(currentStudentIndex - 1)
        } else {
          setCurrentStep('instructor')
        }
        break
      case 'settings':
        setCurrentStep('student-details')
        setCurrentStudentIndex(students.length - 1)
        break
      case 'prompt':
        setCurrentStep('settings')
        break
      case 'result':
        setCurrentStep('prompt')
        break
      default:
        break
    }
  }

  // Genereer instructeur-beschikbaarheid als tekst
  const [instructorText, setInstructorText] = useState('')

  useEffect(() => {
    const text = DAY_ORDER
      .map(({ day, name }) => {
        const found = availability.find(a => a.day === day)
        return `${name} ${found && found.available ? 'Hele dag' : 'Niet beschikbaar'}`
      })
      .join('\n')
    setInstructorText(text)
  }, [availability])

  // Genereer prompt voor ChatGPT
  const weeks = Array.from({ length: 5 }, (_, i) => {
    const today = new Date()
    const day = today.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset + i * 7)
    monday.setHours(0,0,0,0)
    return new Date(monday)
  })
  const prompt = `Maak een rooster voor deze week.\n\nBeschikbaarheid instructeur:\n${instructorText}\n\nLeerlingen:\n${students.map(s =>
    `- ${s.first_name} ${s.last_name}:\n  Beschikbaarheid per week:\n${weeks.map((w, idx) => `    Week ${idx+1}: ${s.availabilityNotes[idx] || 'geen beschikbaarheid ingevuld'}`).join('\n')}\n  Aantal lessen: ${s.lessons}\n  Minuten per les: ${s.minutes}\n  Notities: ${s.notes}`
  ).join('\n\n')}
\nGeef het resultaat als JSON of CSV.\nVoor later: Houd rekening met afstand tussen plaatsen en extra notities voor praktische zaken (spits, etc).`

  // Dummy AI call
  const handleSendToAI = () => {
    setAiResult('ChatGPT resultaat (dummy):\n[Hier zou het rooster als JSON of CSV verschijnen]')
  }

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'instructor':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Jouw Beschikbaarheid</h2>
            <p className="text-gray-600">Controleer je beschikbaarheid voor deze week:</p>
            <textarea
              className="w-full h-50 p-4 border border-gray-300 rounded-lg resize-none text-base bg-white shadow-sm"
              value={instructorText}
              onChange={(e) => setInstructorText(e.target.value)}
              placeholder="Bewerk hier je beschikbaarheid..."
            />
          </div>
        )
      case 'student-details':
        const student = students[currentStudentIndex]
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Leerling Details</h2>
            <div className="text-sm text-gray-600 mb-4">
              Leerling {currentStudentIndex + 1} van {students.length}
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="font-semibold text-blue-900 mb-4 text-xl">{student.first_name} {student.last_name}</div>
              {/* Beschikbaarheid deze week */}
              <div className="mb-4">
                <div className="font-medium text-gray-800 mb-2">Beschikbaarheid deze week:</div>
                <div className="space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                    <div className="w-full md:w-1/3 text-xs text-gray-600">
                      {weeks[0].toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} - {new Date(weeks[0].getTime() + 6*24*60*60*1000).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}
                    </div>
                    <div className="flex-1">
                      <textarea
                        className="w-full min-h-[32px] border border-gray-200 rounded bg-gray-50 text-xs p-1"
                        value={student.availabilityNotes[0]}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Einde beschikbaarheid */}
              <div className="flex flex-wrap gap-4 mb-4">
                <label className="flex flex-col">
                  <span className="text-sm text-gray-700">Aantal lessen</span>
                  <input
                    type="number"
                    min={1}
                    className="border rounded px-3 py-2 w-24"
                    value={student.lessons}
                    onChange={e => handleStudentChange(student.id, 'lessons', Number(e.target.value))}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-sm text-gray-700">Minuten per les</span>
                  <input
                    type="number"
                    min={10}
                    className="border rounded px-3 py-2 w-24"
                    value={student.minutes}
                    onChange={e => handleStudentChange(student.id, 'minutes', Number(e.target.value))}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-gray-700">Notities leerling (vrije tekst, evt. AI samenvatting)</span>
                <textarea
                  className="w-full h-32 border border-gray-300 rounded p-3 mt-1"
                  value={student.notes}
                  onChange={e => handleStudentChange(student.id, 'notes', e.target.value)}
                />
              </label>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Instellingen</h2>
            <p className="text-gray-600">Configureer de instellingen voor het rooster:</p>
            
            <div className="space-y-6">
              {/* Laat locaties op elkaar aansluiten */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Laat locaties op elkaar aansluiten</label>
                  <p className="text-xs text-gray-500">Houd rekening met afstand tussen leslocaties</p>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.connectLocations ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  onClick={() => setSettings(prev => ({ ...prev, connectLocations: !prev.connectLocations }))}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.connectLocations ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Aantal pauzes */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Aantal pauzes</label>
                  <p className="text-xs text-gray-500">Hoeveel pauzes per dag</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="w-20 border border-gray-300 rounded px-3 py-2 text-center"
                  value={settings.numberOfBreaks}
                  onChange={(e) => setSettings(prev => ({ ...prev, numberOfBreaks: Number(e.target.value) }))}
                />
              </div>

              {/* Minuten per pauze */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Minuten per pauze</label>
                  <p className="text-xs text-gray-500">Lengte van elke pauze</p>
                </div>
                <input
                  type="number"
                  min={5}
                  max={60}
                  className="w-20 border border-gray-300 rounded px-3 py-2 text-center"
                  value={settings.minutesPerBreak}
                  onChange={(e) => setSettings(prev => ({ ...prev, minutesPerBreak: Number(e.target.value) }))}
                />
              </div>

              {/* Pauze bij elke leerling */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Pauze van {settings.minutesPerBreak} minuten bij elke leerling</label>
                  <p className="text-xs text-gray-500">Voeg automatisch een pauze toe na elke leerling</p>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.breakAfterEachStudent ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  onClick={() => setSettings(prev => ({ ...prev, breakAfterEachStudent: !prev.breakAfterEachStudent }))}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.breakAfterEachStudent ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Stuur melding naar alle leerlingen */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Stuur melding naar alle leerlingen</label>
                  <p className="text-xs text-gray-500">Verstuur automatisch een bericht wanneer het rooster klaar is</p>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.sendNotifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  onClick={() => setSettings(prev => ({ ...prev, sendNotifications: !prev.sendNotifications }))}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.sendNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Meer specificaties */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meer specificaties</label>
                <textarea
                  className="w-full h-32 border border-gray-300 rounded p-3 resize-none"
                  placeholder="Voeg hier eventuele extra specificaties toe..."
                  value={settings.additionalSpecifications}
                  onChange={(e) => setSettings(prev => ({ ...prev, additionalSpecifications: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )

      case 'prompt':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Bevestigen</h2>
            <p className="text-gray-600">Deze prompt wordt naar ChatGPT gestuurd om het rooster te genereren:</p>
            <textarea
              className="w-full h-40 p-4 border border-blue-300 rounded-lg resize-none text-base bg-blue-50 shadow-sm"
              value={prompt}
              readOnly
            />
          </div>
        )

      case 'result':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Resultaat van ChatGPT</h2>
            <p className="text-gray-600">Het gegenereerde rooster:</p>
            <textarea
              className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none text-base bg-white shadow-sm"
              value={aiResult}
              readOnly
            />
          </div>
        )

      default:
        return null
    }
  }

  // Check if next button should be enabled
  const canGoNext = () => {
    switch (currentStep) {
      case 'student-details':
        const student = students[currentStudentIndex]
        return student.lessons > 0 && student.minutes > 0
      default:
        return true
    }
  }

  // Show loading state
  if (!mounted || loading || loadingStudents) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  // Show empty state if no students and component is mounted
  if (mounted && students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/dashboard/week-overview" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Terug naar Weekoverzicht
                </Link>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">AI Rooster</span>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Geen leerlingen gevonden</h2>
            <p className="text-gray-600 mb-6">
              Je hebt nog geen leerlingen toegevoegd. Voeg eerst leerlingen toe voordat je een AI rooster kunt genereren.
            </p>
            <Link
              href="/dashboard/students/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center"
            >
              <Users className="h-4 w-4 mr-2" />
              Nieuwe leerling toevoegen
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard/week-overview" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug naar Weekoverzicht
              </Link>
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">AI Rooster</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Current step content */}
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
          {renderCurrentStep()}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <button
            className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
              currentStep === 'instructor'
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
            onClick={handlePrevious}
            disabled={currentStep === 'instructor'}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Vorige
          </button>

          <button
            className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
              !canGoNext()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={handleNext}
            disabled={!canGoNext()}
          >
            {currentStep === 'result' ? 'Klaar' : 'Volgende'}
            {currentStep !== 'result' && <ArrowRight className="h-5 w-5 ml-2" />}
          </button>
        </div>
      </div>
    </div>
  )
} 