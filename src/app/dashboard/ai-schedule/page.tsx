'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Users, Calendar, Settings, Brain, Check, X, Clock, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Student } from '@/types/database'
import { AIScheduleLesson, AIScheduleResponse } from '@/lib/openai'
import toast from 'react-hot-toast'

const DAY_ORDER = [
  { day: 'monday', name: 'Maandag' },
  { day: 'tuesday', name: 'Dinsdag' },
  { day: 'wednesday', name: 'Woensdag' },
  { day: 'thursday', name: 'Donderdag' },
  { day: 'friday', name: 'Vrijdag' },
  { day: 'saturday', name: 'Zaterdag' },
  { day: 'sunday', name: 'Zondag' },
]

type Step = 'instructor' | 'student-details' | 'settings' | 'prompt' | 'result' | 'selection'

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
    { day: 'monday', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'tuesday', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'wednesday', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'thursday', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'friday', available: true, startTime: '09:00', endTime: '17:00' },
    { day: 'saturday', available: false, startTime: '09:00', endTime: '17:00' },
    { day: 'sunday', available: false, startTime: '09:00', endTime: '17:00' },
  ])

  // Leerlingen data
  const [students, setStudents] = useState<StudentWithScheduleData[]>([])

  // AI Resultaat
  const [aiResponse, setAiResponse] = useState<AIScheduleResponse | null>(null)
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAddingLessons, setIsAddingLessons] = useState(false)
  const [aiPrompt, setAiPrompt] = useState<string>('')
  const [hasGeneratedPrompt, setHasGeneratedPrompt] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    connectLocations: true,
    numberOfBreaks: 2,
    minutesPerBreak: 15,
    minutesBreakEveryLesson: 5,
    breakAfterEachStudent: false,
    sendNotifications: false,
    additionalSpecifications: ''
  })

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
  const fetchInstructorAvailability = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', user.id)

      if (error) {
        // If table doesn't exist, use default availability and try to create it
        if (error.code === '42P01') {
          console.log('Instructor availability table not found, initializing default availability')
          await initializeDefaultAvailability()
          // Try to fetch again after initialization
          const { data: newData, error: newError } = await supabase
            .from('instructor_availability')
            .select('*')
            .eq('instructor_id', user.id)
            
          if (newError) {
            console.error('Error fetching instructor availability after initialization:', newError)
            // Fallback to default availability
            setAvailability(DAY_ORDER.map(({ day }) => ({
              day,
              available: day !== 'saturday' && day !== 'sunday',
              startTime: '09:00',
              endTime: '17:00'
            })))
            return
          }
          
          if (newData && newData.length > 0) {
            // Process the newly created data
            const dbAvailability = newData.reduce((acc, item) => {
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
                acc[dayName.day] = {
                  available: item.available,
                  startTime: item.start_time || '09:00',
                  endTime: item.end_time || '17:00'
                }
              }
              return acc
            }, {} as Record<string, { available: boolean; startTime: string; endTime: string }>)

            setAvailability(DAY_ORDER.map(({ day }) => ({
              day,
              available: dbAvailability[day]?.available ?? (day !== 'saturday' && day !== 'sunday'),
              startTime: dbAvailability[day]?.startTime ?? '09:00',
              endTime: dbAvailability[day]?.endTime ?? '17:00'
            })))
            return
          }
        }
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
            acc[dayName.day] = {
              available: item.available,
              startTime: item.start_time || '09:00',
              endTime: item.end_time || '17:00'
            }
          }
          return acc
        }, {} as Record<string, { available: boolean; startTime: string; endTime: string }>)

        setAvailability(DAY_ORDER.map(({ day }) => ({
          day,
          available: dbAvailability[day]?.available ?? (day !== 'saturday' && day !== 'sunday'),
          startTime: dbAvailability[day]?.startTime ?? '09:00',
          endTime: dbAvailability[day]?.endTime ?? '17:00'
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
              acc[dayName.day] = {
                available: item.available,
                startTime: item.start_time || '09:00',
                endTime: item.end_time || '17:00'
              }
            }
            return acc
          }, {} as Record<string, { available: boolean; startTime: string; endTime: string }>)

          setAvailability(DAY_ORDER.map(({ day }) => ({
            day,
            available: dbAvailability[day]?.available ?? (day !== 'saturday' && day !== 'sunday'),
            startTime: dbAvailability[day]?.startTime ?? '09:00',
            endTime: dbAvailability[day]?.endTime ?? '17:00'
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching instructor availability:', error)
      // Fallback to default availability on any error
      setAvailability(DAY_ORDER.map(({ day }) => ({
        day,
        available: day !== 'saturday' && day !== 'sunday',
        startTime: '09:00',
        endTime: '17:00'
      })))
    }
  }

  // Fetch students from database
  const fetchStudents = async () => {
    if (!user) return
    
    try {
      setLoadingStudents(true)
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('instructor_id', user.id)
        .order('first_name', { ascending: true })

      if (error) {
        console.error('Error fetching students:', error)
        return
      }

      // Debug: Log raw student data from database
      console.log('Raw student data from database:', data?.map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        hasFirstName: !!s.first_name,
        hasLastName: !!s.last_name,
        firstNameLength: s.first_name?.length || 0,
        lastNameLength: s.last_name?.length || 0,
        displayName: s.last_name ? `${s.first_name} ${s.last_name}` : s.first_name
      })))

      // Transform students to include schedule data
      const studentsWithScheduleData: StudentWithScheduleData[] = (data || []).map(student => ({
        ...student,
        // Alleen voornaam is verplicht, achternaam is optioneel
        first_name: student.first_name || 'Onbekende',
        last_name: student.last_name || '', // Achternaam kan leeg zijn
        lessons: Math.max(1, student.default_lessons_per_week || 2),
        minutes: Math.max(30, student.default_lesson_duration_minutes || 60),
        notes: student.notes || '',
        aiNotes: '',
        availabilityNotes: []
      }))

      console.log('Transformed students with schedule data:', studentsWithScheduleData.map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        displayName: s.last_name ? `${s.first_name} ${s.last_name}` : s.first_name,
        lessons: s.lessons,
        minutes: s.minutes
      })))

      setStudents(studentsWithScheduleData)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to signin if not authenticated
      window.location.href = '/auth/signin'
    }
  }, [user, loading])

  // Expose state for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).students = students
      ;(window as any).availability = availability
      ;(window as any).settings = settings
    }
  }, [students, availability, settings])

  useEffect(() => {
    if (user && mounted) {
      fetchInstructorAvailability()
      fetchStudents()
    }
  }, [user, mounted])

  // Handle student data changes
  const handleStudentChange = (id: string, field: string, value: any) => {
    setStudents(prev => prev.map(student => 
      student.id === id ? { ...student, [field]: value } : student
    ))
    // Reset AI prompt als leerling data wordt gewijzigd
    if (hasGeneratedPrompt) {
      setHasGeneratedPrompt(false)
      setAiPrompt('')
    }
  }

  // Check if value is different from default
  const isValueDifferentFromDefault = (student: StudentWithScheduleData, field: 'lessons' | 'minutes') => {
    const defaultLessons = student.default_lessons_per_week || 2
    const defaultMinutes = student.default_lesson_duration_minutes || 60
    
    if (field === 'lessons') {
      return student.lessons !== defaultLessons
    } else {
      return student.minutes !== defaultMinutes
    }
  }

  // Reset to default values
  const resetToDefault = (studentId: string) => {
    setStudents(prev => prev.map(student => {
      if (student.id === studentId) {
        return {
          ...student,
          lessons: student.default_lessons_per_week || 2,
          minutes: student.default_lesson_duration_minutes || 60
        }
      }
      return student
    }))
  }

  // Navigation functions
  const handleNext = () => {
    const steps: Step[] = ['instructor', 'student-details', 'settings', 'prompt', 'selection', 'result']
    const currentIndex = steps.indexOf(currentStep)
    
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handlePrevious = () => {
    const steps: Step[] = ['instructor', 'student-details', 'settings', 'prompt', 'selection', 'result']
    const currentIndex = steps.indexOf(currentStep)
    
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1]
      setCurrentStep(previousStep)
      
      // Reset AI prompt als je teruggaat naar eerdere stappen
      if (previousStep !== 'prompt') {
        setHasGeneratedPrompt(false)
        setAiPrompt('')
      }
    }
  }

  // Handle availability toggle
  const handleAvailabilityToggle = (day: string) => {
    setAvailability(prev => prev.map(item => 
      item.day === day ? { ...item, available: !item.available } : item
    ))
    // Reset AI prompt als beschikbaarheid wordt gewijzigd
    if (hasGeneratedPrompt) {
      setHasGeneratedPrompt(false)
      setAiPrompt('')
    }
  }

  // Handle time change
  const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => prev.map(item => 
      item.day === day ? { ...item, [field]: value } : item
    ))
    // Reset AI prompt als tijden worden gewijzigd
    if (hasGeneratedPrompt) {
      setHasGeneratedPrompt(false)
      setAiPrompt('')
    }
  }

  // Handle settings change
  const handleSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    // Reset AI prompt als instellingen worden gewijzigd
    if (hasGeneratedPrompt) {
      setHasGeneratedPrompt(false)
      setAiPrompt('')
    }
  }

  // Generate AI prompt
  const generateAIPrompt = () => {
    const requestData = {
      instructorAvailability: availability,
      students: students.map((student: StudentWithScheduleData) => ({
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        lessons: student.lessons,
        minutes: student.minutes,
        aiNotes: student.aiNotes,
        notes: student.notes || ''
      })),
      settings
    }

    // Genereer de prompt (gebruik dezelfde logica als in openai.ts)
    const { instructorAvailability: instructorAvail, students: studentsData, settings: settingsData } = requestData
    
    // Instructeur beschikbaarheid
    const availabilityText = instructorAvail
      .filter((day: any) => day.available)
      .map((day: any) => `${day.day}: ${day.startTime} - ${day.endTime}`)
      .join(', ')

    // Leerlingen informatie
    const studentsText = studentsData.map((student: any) => {
      const availabilityNotes = student.notes ? `\nBeschikbaarheid: ${student.notes}` : ''
      const aiNotes = student.aiNotes ? `\nAI Notities: ${student.aiNotes}` : ''
      const fullName = student.lastName ? `${student.firstName} ${student.lastName}` : student.firstName
      
      return `- ${fullName}:
  ${student.lessons} lessen van ${student.minutes} minuten per week${availabilityNotes}${aiNotes}`
    }).join('\n')

    // Instellingen
    const prompt = `
Instellingen:
- Locaties verbinden: ${settingsData.connectLocations ? 'Ja' : 'Nee'}
- Aantal pauzes per dag: ${settingsData.numberOfBreaks}
- Minuten per pauze: ${settingsData.minutesPerBreak}
- Minuten pauze tussen lessen: ${settingsData.minutesBreakEveryLesson}
- Pauze na elke leerling: ${settingsData.breakAfterEachStudent ? 'Ja' : 'Nee'}
${settingsData.additionalSpecifications ? `- Extra specificaties: ${settingsData.additionalSpecifications}` : ''}

BELANGRIJK: Geef ALTIJD een geldig JSON object terug in exact dit formaat, zonder extra tekst ervoor of erna:

{
  "lessons": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM", 
      "studentId": "student-id",
      "studentName": "Voornaam Achternaam",
      "notes": "Optionele notities"
    }
  ],
  "summary": "Samenvatting van het rooster",
  "warnings": ["Eventuele waarschuwingen"]
}

Instructeur beschikbaarheid: ${availabilityText}

Leerlingen:
${studentsText}
`

    setAiPrompt(prompt)
    setHasGeneratedPrompt(true)
  }

  // Send to AI
  const handleSendToAI = async () => {
    if (!user) return
    
    // Check if there are any students at all
    if (students.length === 0) {
      toast.error('Geen leerlingen gevonden. Voeg eerst leerlingen toe aan je rijschool.')
      return
    }
    
    setIsGenerating(true)
    
    try {
      // Debug: Log alle student data voor troubleshooting
      console.log('All students before validation:', students.map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        hasFirstName: !!s.first_name,
        hasLastName: !!s.last_name,
        firstNameLength: s.first_name?.length || 0,
        lastNameLength: s.last_name?.length || 0,
        displayName: s.last_name ? `${s.first_name} ${s.last_name}` : s.first_name
      })))

      // Filter en bereid de data voor voor de AI met extra validatie
      // Alleen voornaam is verplicht, achternaam is optioneel
      const validStudents = students.filter(student => {
        const hasId = !!student.id
        const hasFirstName = !!student.first_name && student.first_name.trim().length > 0
        
        if (!hasId) {
          console.warn(`Student missing ID:`, student)
        }
        if (!hasFirstName) {
          console.warn(`Student missing first name:`, student)
        }
        
        return hasId && hasFirstName
      })

      if (validStudents.length === 0) {
        // Provide more detailed error information
        const invalidStudents = students.filter(student => {
          const hasId = !!student.id
          const hasFirstName = !!student.first_name && student.first_name.trim().length > 0
          return !hasId || !hasFirstName
        })
        
        const errorDetails = invalidStudents.map(student => {
          const issues = []
          if (!student.id) issues.push('ID ontbreekt')
          if (!student.first_name || student.first_name.trim().length === 0) issues.push('Voornaam ontbreekt')
          return `${student.first_name || 'Onbekend'} ${student.last_name || ''}: ${issues.join(', ')}`
        }).join('; ')
        
        // Show a more user-friendly error message
        const errorMessage = students.length === 0 
          ? 'Geen leerlingen gevonden. Voeg eerst leerlingen toe aan je rijschool.'
          : `Geen geldige leerlingen gevonden. Controleer of alle leerlingen een voornaam hebben. Details: ${errorDetails}`
        
        throw new Error(errorMessage)
      }

      // Waarschuwing als er leerlingen zijn gefilterd
      if (validStudents.length < students.length) {
        const filteredCount = students.length - validStudents.length
        console.warn(`${filteredCount} leerlingen zijn gefilterd vanwege ontbrekende gegevens`)
        toast.error(`${filteredCount} leerlingen zijn overgeslagen vanwege ontbrekende gegevens`)
      }

      const requestData = {
        instructorAvailability: availability,
        students: validStudents.map(student => {
          // Zorg ervoor dat alle verplichte velden aanwezig zijn
          const lessons = student.lessons || student.default_lessons_per_week || 2
          const minutes = student.minutes || student.default_lesson_duration_minutes || 60
          
          return {
            id: student.id,
            firstName: student.first_name || '',
            lastName: student.last_name || '', // Achternaam is optioneel, kan leeg zijn
            lessons: Math.max(1, lessons), // Zorg ervoor dat het minimaal 1 is
            minutes: Math.max(30, minutes), // Zorg ervoor dat het minimaal 30 is
            aiNotes: student.aiNotes || '',
            notes: student.notes || ''
          }
        }),
        settings
      }

      // Debug: Log de student data voor validatie
      console.log('Sending student data to AI:', requestData.students.map(s => ({
        id: s.id,
        name: s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName,
        lessons: s.lessons,
        minutes: s.minutes
      })))

      // Roep de AI API aan
      const response = await fetch('/api/ai-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Fout bij het genereren van het rooster'
        throw new Error(errorMessage)
      }

      const aiResult = await response.json()
      setAiResponse(aiResult)
      
      // Selecteer alle lessen standaard
      const lessonIds = aiResult.lessons.map((lesson: AIScheduleLesson, index: number) => index.toString())
      setSelectedLessons(new Set(lessonIds))
      
      setCurrentStep('selection')
      toast.success('Rooster succesvol gegenereerd!')
      
    } catch (error) {
      console.error('Error generating AI schedule:', error)
      toast.error(error instanceof Error ? error.message : 'Fout bij het genereren van het rooster')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle lesson selection
  const handleLessonSelection = (lessonIndex: string) => {
    setSelectedLessons(prev => {
      const newSet = new Set(prev)
      if (newSet.has(lessonIndex)) {
        newSet.delete(lessonIndex)
      } else {
        newSet.add(lessonIndex)
      }
      return newSet
    })
  }

  // Handle bulk lesson selection
  const handleSelectAll = () => {
    if (aiResponse) {
      const allLessonIds = aiResponse.lessons.map((_, index) => index.toString())
      setSelectedLessons(new Set(allLessonIds))
    }
  }

  const handleDeselectAll = () => {
    setSelectedLessons(new Set())
  }

  // Add selected lessons to database
  const handleAddSelectedLessons = async () => {
    if (!user || !aiResponse) return
    
    const selectedLessonData = aiResponse.lessons.filter((_, index) => 
      selectedLessons.has(index.toString())
    )
    
    if (selectedLessonData.length === 0) {
      toast.error('Geen lessen geselecteerd')
      return
    }
    
    setIsAddingLessons(true)
    
    try {
      const response = await fetch('/api/lessons/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessons: selectedLessonData,
          instructorId: user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Fout bij het toevoegen van lessen'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      toast.success(result.message)
      setCurrentStep('result')
      
    } catch (error) {
      console.error('Error adding lessons:', error)
      toast.error(error instanceof Error ? error.message : 'Fout bij het toevoegen van lessen')
    } finally {
      setIsAddingLessons(false)
    }
  }

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'instructor':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Instructeur beschikbaarheid</h3>
              <p className="text-gray-600 mb-6">
                Configureer je beschikbare tijden voor de komende weken
              </p>
            </div>
            
            <div className="space-y-4">
              {availability.map((day) => (
                <div key={day.day} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={day.available}
                        onChange={() => handleAvailabilityToggle(day.day)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-900">
                        {DAY_ORDER.find(d => d.day === day.day)?.name}
                      </span>
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
                          onChange={(e) => handleTimeChange(day.day, 'startTime', e.target.value)}
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
                          onChange={(e) => handleTimeChange(day.day, 'endTime', e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      case 'student-details':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Leerling instellingen</h3>
              <p className="text-gray-600 mb-6">
                Pas de lesinstellingen aan voor elke leerling
              </p>
            </div>
            
            {loadingStudents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Leerlingen laden...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nog geen leerlingen toegevoegd</p>
                <Link href="/dashboard/students/new" className="btn btn-primary">
                  Eerste leerling toevoegen
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student, index) => (
                  <div key={student.id} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">
                        {student.first_name} {student.last_name || ''}
                      </h4>
                      {(isValueDifferentFromDefault(student, 'lessons') || isValueDifferentFromDefault(student, 'minutes')) && (
                        <button
                          onClick={() => resetToDefault(student.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Reset naar standaard
                        </button>
                      )}
                    </div>
                    
                    <div className="mobile-grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lessen per week
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="7"
                          value={student.lessons}
                          onChange={(e) => handleStudentChange(student.id, 'lessons', parseInt(e.target.value))}
                          className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isValueDifferentFromDefault(student, 'lessons') 
                              ? 'border-orange-300 bg-orange-50' 
                              : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lesduur (minuten)
                        </label>
                        <input
                          type="number"
                          min="30"
                          max="180"
                          step="15"
                          value={student.minutes}
                          onChange={(e) => handleStudentChange(student.id, 'minutes', parseInt(e.target.value))}
                          className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isValueDifferentFromDefault(student, 'minutes') 
                              ? 'border-orange-300 bg-orange-50' 
                              : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notities voor AI
                      </label>
                      <textarea
                        value={student.aiNotes}
                        onChange={(e) => handleStudentChange(student.id, 'aiNotes', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Speciale instructies voor de AI planner..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Planning instellingen</h3>
              <p className="text-gray-600 mb-6">
                Configureer hoe de AI je rooster moet plannen
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Locaties verbinden</h4>
                    <p className="text-sm text-gray-600">Plan lessen dicht bij elkaar</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.connectLocations}
                    onChange={(e) => handleSettingsChange('connectLocations', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Pauzes</h4>
                <div className="space-y-4">
                  <div className="mobile-grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Aantal pauzes per dag
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={settings.numberOfBreaks}
                        onChange={(e) => handleSettingsChange('numberOfBreaks', parseInt(e.target.value))}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minuten per pauze
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        step="5"
                        value={settings.minutesPerBreak}
                        onChange={(e) => handleSettingsChange('minutesPerBreak', parseInt(e.target.value))}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="mobile-grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minuten pauze tussen lessen
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="5"
                        value={settings.minutesBreakEveryLesson}
                        onChange={(e) => handleSettingsChange('minutesBreakEveryLesson', parseInt(e.target.value))}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">Pauze na elke leerling</h5>
                        <p className="text-sm text-gray-600">Extra pauze tussen leerlingen</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.breakAfterEachStudent}
                        onChange={(e) => handleSettingsChange('breakAfterEachStudent', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Notificaties</h4>
                    <p className="text-sm text-gray-600">Stuur notificaties naar leerlingen</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sendNotifications}
                    onChange={(e) => handleSettingsChange('sendNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="card">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extra specificaties
                </label>
                <textarea
                  value={settings.additionalSpecifications}
                  onChange={(e) => handleSettingsChange('additionalSpecifications', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Extra instructies voor de AI planner..."
                />
              </div>
            </div>
          </div>
        )

      case 'prompt':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">AI Planning</h3>
              <p className="text-gray-600 mb-6">
                Bekijk de AI prompt en start de planning
              </p>
            </div>
            
            {!hasGeneratedPrompt ? (
              <div className="card">
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Genereer AI Prompt
                  </h4>
                  <p className="text-gray-600 mb-6">
                    Klik hieronder om de AI prompt te genereren op basis van je instellingen.
                  </p>
                  <button
                    onClick={generateAIPrompt}
                    className="btn btn-primary flex items-center gap-2 mx-auto"
                  >
                    <Brain className="h-4 w-4" />
                    Genereer Prompt
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-medium text-gray-900">AI Prompt</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Gereed
                      </span>
                    </div>
                    <button
                      onClick={() => setHasGeneratedPrompt(false)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Opnieuw genereren
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                      {aiPrompt}
                    </pre>
                  </div>
                </div>
                
                <div className="card">
                  <div className="text-center py-8">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Start AI Planning
                    </h4>
                    <p className="text-gray-600 mb-6">
                      De AI zal nu een optimaal rooster maken op basis van bovenstaande prompt.
                    </p>
                    <button
                      onClick={handleSendToAI}
                      disabled={isGenerating}
                      className="btn btn-primary flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          AI Planning...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          Start AI Planning
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )

      case 'selection':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Selecteer Lessen</h3>
              <p className="text-gray-600 mb-6">
                Selecteer welke lessen je wilt toevoegen aan je rooster
              </p>
            </div>
            
            {aiResponse && (
              <>
                {/* Samenvatting */}
                <div className="card">
                  <h4 className="font-medium text-gray-900 mb-2">Samenvatting</h4>
                  <p className="text-gray-600">{aiResponse.summary}</p>
                  
                  {aiResponse.warnings && aiResponse.warnings.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h5 className="font-medium text-yellow-800 mb-2">Waarschuwingen:</h5>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {aiResponse.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Bulk selectie */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">
                      Geselecteerd: {selectedLessons.size} van {aiResponse.lessons.length} lessen
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Alles selecteren
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        className="text-sm text-gray-600 hover:text-gray-700"
                      >
                        Alles deselecteren
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lessen lijst */}
                <div className="space-y-3">
                  {aiResponse.lessons.map((lesson, index) => (
                    <div key={index} className="card">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedLessons.has(index.toString())}
                          onChange={() => handleLessonSelection(index.toString())}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">
                              {lesson.studentName}
                            </h5>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              {lesson.startTime} - {lesson.endTime}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(lesson.date).toLocaleDateString('nl-NL', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            {lesson.notes && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {lesson.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Toevoegen knop */}
                <div className="card">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>Tip:</strong> Bewerken kan na het toevoegen van lessen
                    </p>
                    <button
                      onClick={handleAddSelectedLessons}
                      disabled={selectedLessons.size === 0 || isAddingLessons}
                      className="btn btn-primary flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {isAddingLessons ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Lessen toevoegen...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          {selectedLessons.size} lessen toevoegen
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )

      case 'result':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">AI Resultaat</h3>
              <p className="text-gray-600 mb-6">
                Het gegenereerde rooster door de AI
              </p>
            </div>
            
            <div className="card">
              <div className="text-center py-8">
                <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Lessen succesvol toegevoegd!
                </h4>
                <p className="text-gray-600 mb-6">
                  De geselecteerde lessen zijn toegevoegd aan je rooster. Je kunt ze nu bekijken in het weekoverzicht.
                </p>
                <Link href="/dashboard/lessons" className="btn btn-primary">
                  Bekijk weekoverzicht
                </Link>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Check if can go to next step
  const canGoNext = () => {
    switch (currentStep) {
      case 'instructor':
        return availability.some(day => day.available)
      case 'student-details':
        return students.length > 0
      case 'settings':
        return true
      case 'prompt':
        return hasGeneratedPrompt
      case 'selection':
        return selectedLessons.size > 0
      case 'result':
        return false
      default:
        return false
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

  const steps = [
    { key: 'instructor', name: 'Beschikbaarheid', icon: Calendar },
    { key: 'student-details', name: 'Leerlingen', icon: Users },
    { key: 'settings', name: 'Instellingen', icon: Settings },
    { key: 'prompt', name: 'AI Planning', icon: Brain },
    { key: 'selection', name: 'Selectie', icon: Check },
    { key: 'result', name: 'Resultaat', icon: Check }
  ]

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
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">AI Planning</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            AI-geassisteerde Planning
          </h1>
          <p className="text-gray-600">
            Laat AI je optimale lesrooster maken
          </p>
        </div>

        {/* Progress Steps */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.key
              const isCompleted = steps.findIndex(s => s.key === currentStep) > index
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="mx-4 w-8 h-0.5 bg-gray-200"></div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="card mb-6">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep !== 'instructor' && currentStep !== 'result' && (
            <button
              onClick={handlePrevious}
              className="btn btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Vorige
            </button>
          )}
          
          {currentStep !== 'result' && currentStep !== 'selection' && (
            <div className="ml-auto flex items-center gap-3">
              {currentStep === 'prompt' && !hasGeneratedPrompt && (
                <span className="text-sm text-gray-500">
                  Genereer eerst de AI prompt
                </span>
              )}
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Volgende
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 