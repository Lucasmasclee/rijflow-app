'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Users, Calendar, Settings, Brain, Check, X, Clock, MapPin, MessageSquare } from 'lucide-react'
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

type Step = 'week-selection' | 'instructor' | 'students' | 'settings' | 'generate-planning'

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
  const [isGeneratingSampleInput, setIsGeneratingSampleInput] = useState(false)
  const [sampleInputResult, setSampleInputResult] = useState<any>(null)
  
  // Planning result state
  const [planningResult, setPlanningResult] = useState<any>(null)
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set())

  // SMS notification state
  const [sendImmediateSms, setSendImmediateSms] = useState(false)
  const [sendReminderSms, setSendReminderSms] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)

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

  // AI Settings state
  const [aiSettings, setAiSettings] = useState({
    pauzeTussenLessen: 5,
    langePauzeDuur: 0,
    blokuren: true
  })

  // Helper functions
  const getMonday = (date: Date) => {
    const newDate = new Date(date)
    const day = newDate.getDay() // 0 = zondag, 1 = maandag, ..., 6 = zaterdag
    // We willen maandag als dag 1 van de week
    // Als het zondag is (day = 0), dan willen we de volgende maandag (+1 dag)
    // Als het maandag is (day = 1), dan willen we deze maandag (+0 dagen)
    // Als het dinsdag is (day = 2), dan willen we de vorige maandag (-1 dag)
    // etc.
    const daysToMonday = day === 0 ? 1 : day === 1 ? 0 : -(day - 1)
    newDate.setDate(newDate.getDate() + daysToMonday)
    return newDate
  }

  // Helper function to get the date for a specific day of the week
  const getDayDate = (dayIndex: number, weekStart: Date): string => {
    const dayDate = new Date(weekStart)
    dayDate.setDate(weekStart.getDate() + dayIndex)
    
    const day = dayDate.getDate()
    const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
    const month = monthNames[dayDate.getMonth()]
    
    return `${day} ${month}`
  }

  // Helper function to get formatted day label with date
  const getDayLabelWithDate = (dayIndex: number, weekStart: Date | null): string => {
    if (!weekStart) {
      return DAY_ORDER[dayIndex].name
    }
    
    const date = getDayDate(dayIndex, weekStart)
    return `${DAY_ORDER[dayIndex].shortName} ${date}`
  }

  const formatDateToISO = (date: Date) => {
    // Zorg ervoor dat we de maandag van de geselecteerde week krijgen
    const mondayOfWeek = getMonday(date)
    // Use timezone-safe date formatting to avoid UTC conversion issues
    const year = mondayOfWeek.getFullYear()
    const month = String(mondayOfWeek.getMonth() + 1).padStart(2, '0')
    const day = String(mondayOfWeek.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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

  // Helper function to format lesson date and time
  const formatLessonDateTime = (date: string, startTime: string, endTime: string): string => {
    const lessonDate = new Date(date)
    const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
    const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
    
    const dayName = dayNames[lessonDate.getDay()]
    const day = lessonDate.getDate()
    const month = monthNames[lessonDate.getMonth()]
    
    return `${dayName} ${day} ${month} ${startTime} - ${endTime}`
  }

  // Helper function to handle lesson selection
  const handleLessonSelection = (lessonId: string, selected: boolean) => {
    const newSelectedLessons = new Set(selectedLessons)
    if (selected) {
      newSelectedLessons.add(lessonId)
    } else {
      newSelectedLessons.delete(lessonId)
    }
    setSelectedLessons(newSelectedLessons)
  }

  // Helper function to select all lessons
  const selectAllLessons = () => {
    if (!planningResult?.lessons) return
    const allLessonIds = planningResult.lessons.map((lesson: any, index: number) => `${lesson.date}-${lesson.startTime}-${lesson.studentId}-${index}`)
    setSelectedLessons(new Set(allLessonIds))
  }

  // Helper function to deselect all lessons
  const deselectAllLessons = () => {
    setSelectedLessons(new Set())
  }

  // Helper function to add selected lessons to schedule
  const addSelectedLessonsToSchedule = async () => {
    if (!user || !planningResult?.lessons || selectedLessons.size === 0) {
      toast.error('Geen lessen geselecteerd om toe te voegen')
      return
    }

    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast.error('Niet ingelogd. Log opnieuw in.')
        return
      }

      // Filter the selected lessons from the planning result
      const selectedLessonsData = planningResult.lessons.filter((lesson: any, index: number) => {
        const lessonId = `${lesson.date}-${lesson.startTime}-${lesson.studentId}-${index}`
        return selectedLessons.has(lessonId)
      })

      // Transform lessons to match AIScheduleLesson format
      const lessonsToAdd = selectedLessonsData.map((lesson: any) => ({
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        studentId: lesson.studentId,
        studentName: lesson.studentName,
        notes: lesson.notes || ''
      }))

      const response = await fetch('/api/lessons/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          lessons: lessonsToAdd,
          instructorId: user.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        const errorMessage = error.error || 'Onbekende fout'
        toast.error(`Fout bij toevoegen van lessen: ${errorMessage}`)
        return
      }

      const result = await response.json()
      toast.success(`${selectedLessons.size} lessen succesvol toegevoegd aan rooster`)
      
      // Send SMS notifications if requested
      if (sendImmediateSms || sendReminderSms) {
        try {
          setSendingSms(true)
          
          // Get the lesson IDs from the result
          const lessonIds = result.lessons?.map((lesson: any) => lesson.id) || []
          
          // Debug: Log the lesson IDs being sent to SMS API
          console.log('=== SMS DEBUG ===')
          console.log('Result from bulk lessons API:', result)
          console.log('Lesson IDs being sent to SMS API:', lessonIds)
          console.log('Number of lessons in result:', result.lessons?.length || 0)
          
          if (lessonIds.length > 0) {
            const smsResponse = await fetch('/api/sms/lesson-notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                lessonIds,
                sendImmediate: sendImmediateSms,
                sendReminder: sendReminderSms
              })
            })

            const smsResult = await smsResponse.json()
            
            if (smsResult.success) {
              const totalSms = smsResult.summary.total
              const successfulSms = smsResult.summary.successful
              const failedSms = smsResult.summary.failed
              
              if (successfulSms > 0) {
                toast.success(`${successfulSms} SMS berichten succesvol verzonden`)
              }
              
              if (failedSms > 0) {
                toast.error(`${failedSms} SMS berichten konden niet worden verzonden`)
              }
              
              // Check if any reminders were scheduled
              const scheduledReminders = smsResult.results?.filter((r: any) => r.type === 'reminder' && r.success && r.scheduledFor) || []
              if (scheduledReminders.length > 0) {
                toast.success(`${scheduledReminders.length} herinneringen gepland voor 24 uur van tevoren`)
              }
            } else {
              toast.error('Fout bij verzenden van SMS berichten')
            }
          } else {
            console.log('No lesson IDs found in result, skipping SMS notifications')
          }
        } catch (error) {
          console.error('Error sending SMS notifications:', error)
          toast.error('Fout bij verzenden van SMS berichten')
        } finally {
          setSendingSms(false)
        }
      }
      
      // Clear selections after successful addition
      setSelectedLessons(new Set())
      // Go to lessons page
      router.push('/dashboard/lessons')
      
    } catch (error) {
      console.error('Error adding lessons to schedule:', error)
      toast.error('Fout bij toevoegen van lessen aan rooster')
    }
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

  // Student availability handlers are now handled inline in the JSX

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

  const saveInstructorAvailability = async () => {
    if (!user || !selectedWeek) return
    
    try {
      const weekStartString = formatDateToISO(selectedWeek)
      
      console.log('Saving instructor availability for week:', weekStartString)
      
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
        }
      }

      console.log('Sending request to update-availability for instructor:', requestBody)

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
        toast.error('Fout bij opslaan instructeur beschikbaarheid: ' + (error.error || 'Onbekende fout'))
        return
      }

      const result = await response.json()
      console.log('Success response from update-availability:', result)
      toast.success('Instructeur beschikbaarheid succesvol opgeslagen')
      
    } catch (error) {
      console.error('Error saving instructor availability:', error)
      toast.error('Fout bij opslaan van instructeur beschikbaarheid')
    }
  }

  const saveStudentData = async () => {
    if (!user || !selectedWeek) return
    
    try {
      const weekStartString = formatDateToISO(selectedWeek)
      
      console.log('Saving student data for week:', weekStartString)
      console.log('Number of students:', students.length)
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast.error('Niet ingelogd. Log opnieuw in.')
        return
      }

      const requestBody = {
        weekStart: weekStartString,
        studentAvailability: students.map(student => ({
          id: student.id,
          availability_data: student.availability_data || {}
        }))
      }

      // Update student settings in the database
      for (const student of students) {
        const { error: updateError } = await supabase
          .from('students')
          .update({
            default_lessons_per_week: student.default_lessons_per_week || 2,
            default_lesson_duration_minutes: student.default_lesson_duration_minutes || 60
          })
          .eq('id', student.id)

        if (updateError) {
          console.error('Error updating student settings for student:', student.id, updateError)
          // Continue with other students even if one fails
        } else {
          console.log('Successfully updated settings for student:', student.id)
        }
      }

      console.log('Sending request to update-availability for students:', requestBody)

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
        toast.error('Fout bij opslaan leerling data: ' + (error.error || 'Onbekende fout'))
        return
      }

      const result = await response.json()
      console.log('Success response from update-availability:', result)
      toast.success('Leerling data succesvol opgeslagen')
      
    } catch (error) {
      console.error('Error saving student data:', error)
      toast.error('Fout bij opslaan van leerling data')
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

      // Also update student settings in the database
      for (const student of students) {
        const { error: updateError } = await supabase
          .from('students')
          .update({
            default_lessons_per_week: student.default_lessons_per_week || 2,
            default_lesson_duration_minutes: student.default_lesson_duration_minutes || 60
          })
          .eq('id', student.id)

        if (updateError) {
          console.error('Error updating student settings for student:', student.id, updateError)
          // Continue with other students even if one fails
        } else {
          console.log('Successfully updated settings for student:', student.id)
        }
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



  // Load AI settings from database
  const loadAISettings = async () => {
    if (!user) return
    
    try {
      // Get AI settings directly from instructor_ai_settings table
      const { data, error } = await supabase
        .from('instructor_ai_settings')
        .select('*')
        .eq('instructor_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading AI settings:', error)
        return
      }

      // Set default values if no record exists
      const defaultSettings = {
        pauze_tussen_lessen: 5,
        lange_pauze_duur: 0,
        blokuren: true
      }

      const settings = data || defaultSettings
      
      setAiSettings({
        pauzeTussenLessen: settings.pauze_tussen_lessen || 5,
        langePauzeDuur: settings.lange_pauze_duur || 0,
        blokuren: settings.blokuren !== undefined ? settings.blokuren : true
      })
    } catch (error) {
      console.error('Error loading AI settings:', error)
    }
  }

  // Save AI settings to database
  const saveAISettings = async () => {
    if (!user) return
    
    try {
      // Update or insert AI settings directly in instructor_ai_settings table
      const { data, error } = await supabase
        .from('instructor_ai_settings')
        .upsert({
          instructor_id: user.id,
          pauze_tussen_lessen: aiSettings.pauzeTussenLessen,
          lange_pauze_duur: aiSettings.langePauzeDuur,
          blokuren: aiSettings.blokuren
        }, {
          onConflict: 'instructor_id',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error('Error saving AI settings:', error)
        toast.error('Fout bij opslaan AI instellingen: ' + error.message)
        return
      }

      toast.success('AI instellingen succesvol opgeslagen')
      
    } catch (error) {
      console.error('Error saving AI settings:', error)
      toast.error('Fout bij opslaan van AI instellingen')
    }
  }

  const generateSampleInput = async () => {
    if (!user || !selectedWeek) return

    setIsGeneratingSampleInput(true)
    setSampleInputResult(null)

    try {
      const weekStart = formatDateToISO(selectedWeek)
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast.error('Niet ingelogd. Log opnieuw in.')
        return
      }
      
      const response = await fetch('/api/ai-schedule/generate-planning', {
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

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate planning')
      }

      setSampleInputResult(result.data)
      toast.success('Week planning gegenereerd')
      
      // Print the result to console for debugging
      console.log('Generated planning:')
      console.log(JSON.stringify(result.data, null, 2))
      
    } catch (error) {
      console.error('Error generating planning:', error)
      toast.error('Fout bij genereren van week planning')
    } finally {
      setIsGeneratingSampleInput(false)
    }
  }

  const createInputFile = async () => {
    if (!user || !selectedWeek) return

    try {
      const weekStart = formatDateToISO(selectedWeek)
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast.error('Niet ingelogd. Log opnieuw in.')
        return
      }
      
      const response = await fetch('/api/ai-schedule/generate-planning', {
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

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate planning')
      }

      // Print the input file data to console for debugging
      console.log('=== AI WEEK PLANNING INPUT FILE ===')
      console.log('Input data:')
      console.log(JSON.stringify(result.inputData, null, 2))
      console.log('=== END INPUT FILE ===')
      
      // Print the output file data to console for debugging
      console.log('=== AI WEEK PLANNING OUTPUT FILE ===')
      console.log('Output data:')
      console.log(JSON.stringify(result.data, null, 2))
      console.log('=== END OUTPUT FILE ===')
      
      // Store the planning result for display
      setPlanningResult(result.data)
      setSelectedLessons(new Set()) // Reset selections
      
      toast.success('Planning gegenereerd en getoond')
      
    } catch (error) {
      console.error('Error generating planning:', error)
      toast.error('Fout bij genereren van planning')
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
      loadAISettings()
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
      await saveAISettings()
      setCurrentStep('generate-planning')
    }
  }

  const handlePrevious = () => {
    if (currentStep === 'instructor') {
      setCurrentStep('week-selection')
    } else if (currentStep === 'students') {
      setCurrentStep('instructor')
    } else if (currentStep === 'settings') {
      setCurrentStep('students')
    } else if (currentStep === 'generate-planning') {
      setCurrentStep('settings')
    }
  }

  const canGoNext = () => {
    if (currentStep === 'week-selection') {
      return selectedWeek !== null
    }
    if (currentStep === 'generate-planning') {
      return false // Last step, no next
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
    { key: 'generate-planning', name: 'Genereer Planning', icon: Brain }
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
                <h1 className="text-l font-semibold text-gray-900">
                  Automatische weekplanning
                </h1>
                {/* <p className="text-sm text-gray-600">
                  Laat AI je optimale lesrooster maken
                </p> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="container-mobile py-6">
          {/* Week Selection */}
          {currentStep === 'week-selection' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Stap 1: Selecteer Week</h3>
                <p className="text-gray-600 mb-6">
                  Kies een week waarvoor je een automatische planning wilt genereren:
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
                <h3 className="text-lg font-semibold mb-4">Stap 2: Jouw beschikbaarheid</h3>
                <p className="text-gray-600 mb-6">
                  Vul de beschikbaarheid van de instructeur in voor de week van {getSelectedWeekInfo()?.start} tot {getSelectedWeekInfo()?.end}:
                </p>
              </div>

              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {instructorAvailability.map((day, index) => (
                    <div key={day.day} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`available-${day.day}`}
                            checked={day.available}
                            onChange={(e) => handleAvailabilityChange(index, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={`available-${day.day}`} className="font-medium text-gray-900">
                            {getDayLabelWithDate(index, selectedWeek)}
                          </label>
                        </div>
                      </div>

                      {day.available && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Starttijd
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={day.startHours}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || /^\d{0,2}$/.test(value)) {
                                    handleTimeChange(index, 'startHours', value)
                                  }
                                }}
                                onBlur={(e) => {
                                  const formattedValue = formatTimeOnBlur(e.target.value, 23)
                                  handleTimeBlur(index, 'startHours', formattedValue)
                                }}
                                className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                                placeholder="HH"
                              />
                              <span className="text-gray-500 font-medium">:</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={day.startMinutes}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || /^\d{0,2}$/.test(value)) {
                                    handleTimeChange(index, 'startMinutes', value)
                                  }
                                }}
                                onBlur={(e) => {
                                  const formattedValue = formatTimeOnBlur(e.target.value, 59)
                                  handleTimeBlur(index, 'startMinutes', formattedValue)
                                }}
                                className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                                placeholder="MM"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Eindtijd
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={day.endHours}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || /^\d{0,2}$/.test(value)) {
                                    handleTimeChange(index, 'endHours', value)
                                  }
                                }}
                                onBlur={(e) => {
                                  const formattedValue = formatTimeOnBlur(e.target.value, 23)
                                  handleTimeBlur(index, 'endHours', formattedValue)
                                }}
                                className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                                placeholder="HH"
                              />
                              <span className="text-gray-500 font-medium">:</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={day.endMinutes}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || /^\d{0,2}$/.test(value)) {
                                    handleTimeChange(index, 'endMinutes', value)
                                  }
                                }}
                                onBlur={(e) => {
                                  const formattedValue = formatTimeOnBlur(e.target.value, 59)
                                  handleTimeBlur(index, 'endMinutes', formattedValue)
                                }}
                                className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                                placeholder="MM"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Students */}
          {currentStep === 'students' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Stap 3: Leerling Beschikbaarheid</h3>
                <p className="text-gray-600 mb-6">
                  Vul de beschikbaarheid van elke leerling in voor de week van {getSelectedWeekInfo()?.start} tot {getSelectedWeekInfo()?.end}:
                </p>
              </div>

              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student, studentIndex) => (
                    <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      {/* Student Header */}
                      <div className="mb-3">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">
                          {student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name}
                        </h4>
                        
                        {/* Lessons per week and minutes per lesson */}
                        <div className="flex items-center gap-1 mb-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={student.default_lessons_per_week || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              // Allow empty input for normal typing
                              if (value === '') {
                                const newStudents = [...students]
                                newStudents[studentIndex] = {
                                  ...newStudents[studentIndex],
                                  default_lessons_per_week: 0
                                }
                                setStudents(newStudents)
                                return
                              }
                              
                              // Only allow numbers
                              if (!/^\d*$/.test(value)) return
                              
                              const numValue = parseInt(value, 10)
                              if (isNaN(numValue)) return
                              
                              const newStudents = [...students]
                              newStudents[studentIndex] = {
                                ...newStudents[studentIndex],
                                default_lessons_per_week: numValue
                              }
                              setStudents(newStudents)
                            }}
                            onBlur={(e) => {
                              const value = e.target.value
                              let numValue = parseInt(value, 10)
                              
                              if (isNaN(numValue) || numValue < 1) {
                                numValue = 1
                              } else if (numValue > 7) {
                                numValue = 7
                              }
                              
                              const newStudents = [...students]
                              newStudents[studentIndex] = {
                                ...newStudents[studentIndex],
                                default_lessons_per_week: numValue
                              }
                              setStudents(newStudents)
                            }}
                            className="w-4 h-6 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-xs"
                          />
                          <span className="text-xs text-gray-600">lessen van</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={student.default_lesson_duration_minutes || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              // Allow empty input for normal typing
                              if (value === '') {
                                const newStudents = [...students]
                                newStudents[studentIndex] = {
                                  ...newStudents[studentIndex],
                                  default_lesson_duration_minutes: 0
                                }
                                setStudents(newStudents)
                                return
                              }
                              
                              // Only allow numbers
                              if (!/^\d*$/.test(value)) return
                              
                              const numValue = parseInt(value, 10)
                              if (isNaN(numValue)) return
                              
                              const newStudents = [...students]
                              newStudents[studentIndex] = {
                                ...newStudents[studentIndex],
                                default_lesson_duration_minutes: numValue
                              }
                              setStudents(newStudents)
                            }}
                            onBlur={(e) => {
                              const value = e.target.value
                              let numValue = parseInt(value, 10)
                              
                              if (isNaN(numValue) || numValue < 30) {
                                numValue = 30
                              } else if (numValue > 120) {
                                numValue = 120
                              }
                              
                              // Round to nearest 5
                              numValue = Math.round(numValue / 5) * 5
                              
                              const newStudents = [...students]
                              newStudents[studentIndex] = {
                                ...newStudents[studentIndex],
                                default_lesson_duration_minutes: numValue
                              }
                              setStudents(newStudents)
                            }}
                            className="w-5 h-6 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-xs"
                          />
                          <span className="text-xs text-gray-600">minuten</span>
                        </div>
                      </div>

                      {/* Student Availability */}
                      <div className="space-y-2">
                        {DAY_ORDER.map((dayInfo, dayIndex) => {
                          const dayKey = dayInfo.dutchName
                          const dayAvailability = student.availability_data?.[dayKey] || []
                          const isAvailable = dayAvailability.length >= 2
                          const startTime = isAvailable ? dayAvailability[0] : '09:00'
                          const endTime = isAvailable ? dayAvailability[1] : '17:00'

                          return (
                            <div key={dayInfo.day} className="border border-gray-200 rounded-lg p-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    id={`student-${student.id}-${dayInfo.day}`}
                                    checked={isAvailable}
                                    onChange={(e) => {
                                      const newStudents = [...students]
                                      const currentAvailability = newStudents[studentIndex].availability_data || {}
                                      
                                      if (e.target.checked) {
                                        currentAvailability[dayKey] = [startTime, endTime]
                                      } else {
                                        delete currentAvailability[dayKey]
                                      }
                                      
                                      newStudents[studentIndex] = {
                                        ...newStudents[studentIndex],
                                        availability_data: currentAvailability
                                      }
                                      setStudents(newStudents)
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label htmlFor={`student-${student.id}-${dayInfo.day}`} className="font-medium text-gray-900">
                                    {getDayLabelWithDate(dayIndex, selectedWeek)}
                                  </label>
                                </div>
                              </div>

                              {isAvailable && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Starttijd
                                    </label>
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={startTime.split(':')[0]}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          if (value === '' || /^\d{0,2}$/.test(value)) {
                                            const newStudents = [...students]
                                            const currentAvailability = newStudents[studentIndex].availability_data || {}
                                            const minutes = startTime.split(':')[1] || '00'
                                            currentAvailability[dayKey] = [`${value}:${minutes}`, endTime]
                                            newStudents[studentIndex] = {
                                              ...newStudents[studentIndex],
                                              availability_data: currentAvailability
                                            }
                                            setStudents(newStudents)
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const formattedValue = formatTimeOnBlur(e.target.value, 23)
                                          const newStudents = [...students]
                                          const currentAvailability = newStudents[studentIndex].availability_data || {}
                                          const minutes = startTime.split(':')[1] || '00'
                                          currentAvailability[dayKey] = [`${formattedValue}:${minutes}`, endTime]
                                          newStudents[studentIndex] = {
                                            ...newStudents[studentIndex],
                                            availability_data: currentAvailability
                                          }
                                          setStudents(newStudents)
                                        }}
                                        className="w-12 h-6 p-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center text-xs"
                                        placeholder="HH"
                                      />
                                      <span className="text-gray-500 font-medium text-xs">:</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={startTime.split(':')[1]}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          if (value === '' || /^\d{0,2}$/.test(value)) {
                                            const newStudents = [...students]
                                            const currentAvailability = newStudents[studentIndex].availability_data || {}
                                            const hours = startTime.split(':')[0] || '09'
                                            currentAvailability[dayKey] = [`${hours}:${value}`, endTime]
                                            newStudents[studentIndex] = {
                                              ...newStudents[studentIndex],
                                              availability_data: currentAvailability
                                            }
                                            setStudents(newStudents)
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const formattedValue = formatTimeOnBlur(e.target.value, 59)
                                          const newStudents = [...students]
                                          const currentAvailability = newStudents[studentIndex].availability_data || {}
                                          const hours = startTime.split(':')[0] || '09'
                                          currentAvailability[dayKey] = [`${hours}:${formattedValue}`, endTime]
                                          newStudents[studentIndex] = {
                                            ...newStudents[studentIndex],
                                            availability_data: currentAvailability
                                          }
                                          setStudents(newStudents)
                                        }}
                                        className="w-12 h-6 p-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center text-xs"
                                        placeholder="MM"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Eindtijd
                                    </label>
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={endTime.split(':')[0]}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          if (value === '' || /^\d{0,2}$/.test(value)) {
                                            const newStudents = [...students]
                                            const currentAvailability = newStudents[studentIndex].availability_data || {}
                                            const minutes = endTime.split(':')[1] || '00'
                                            currentAvailability[dayKey] = [startTime, `${value}:${minutes}`]
                                            newStudents[studentIndex] = {
                                              ...newStudents[studentIndex],
                                              availability_data: currentAvailability
                                            }
                                            setStudents(newStudents)
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const formattedValue = formatTimeOnBlur(e.target.value, 23)
                                          const newStudents = [...students]
                                          const currentAvailability = newStudents[studentIndex].availability_data || {}
                                          const minutes = endTime.split(':')[1] || '00'
                                          currentAvailability[dayKey] = [startTime, `${formattedValue}:${minutes}`]
                                          newStudents[studentIndex] = {
                                            ...newStudents[studentIndex],
                                            availability_data: currentAvailability
                                          }
                                          setStudents(newStudents)
                                        }}
                                        className="w-12 h-6 p-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center text-xs"
                                        placeholder="HH"
                                      />
                                      <span className="text-gray-500 font-medium text-xs">:</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={endTime.split(':')[1]}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          if (value === '' || /^\d{0,2}$/.test(value)) {
                                            const newStudents = [...students]
                                            const currentAvailability = newStudents[studentIndex].availability_data || {}
                                            const hours = endTime.split(':')[0] || '17'
                                            currentAvailability[dayKey] = [startTime, `${hours}:${value}`]
                                            newStudents[studentIndex] = {
                                              ...newStudents[studentIndex],
                                              availability_data: currentAvailability
                                            }
                                            setStudents(newStudents)
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const formattedValue = formatTimeOnBlur(e.target.value, 59)
                                          const newStudents = [...students]
                                          const currentAvailability = newStudents[studentIndex].availability_data || {}
                                          const hours = endTime.split(':')[0] || '17'
                                          currentAvailability[dayKey] = [startTime, `${hours}:${formattedValue}`]
                                          newStudents[studentIndex] = {
                                            ...newStudents[studentIndex],
                                            availability_data: currentAvailability
                                          }
                                          setStudents(newStudents)
                                        }}
                                        className="w-12 h-6 p-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center text-xs"
                                        placeholder="MM"
                                      />
                                    </div>
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
                <h3 className="text-lg font-semibold mb-4">Stap 4: Instellingen</h3>
                <p className="text-gray-600 mb-6">
                  Configureer de instellingen voor de automatische weekplanning:
                </p>
              </div>

              <div className="space-y-6">
                {/* Pauze na elke les */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-medium text-gray-900">
                      Pauze na elke les
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      min="0"
                      max="60"
                      value={aiSettings.pauzeTussenLessen}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        pauzeTussenLessen: parseInt(e.target.value) || 0
                      })}
                      className="w-4 h-6 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                    <span className="text-sm text-gray-600">minuten</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Tijd tussen alle lessen
                  </p>
                </div>

                {/* Lange pauze duur */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-medium text-gray-900">
                      Lange pauze duur
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      min="0"
                      max="120"
                      value={aiSettings.langePauzeDuur}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        langePauzeDuur: parseInt(e.target.value) || 0
                      })}
                      className="w-4 h-6 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                    <span className="text-sm text-gray-600">minuten</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Duur van extra pauzes
                  </p>
                </div>

                {/* Blokuren */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div>
                    <label className="text-lg font-medium text-gray-900">
                      Blokuren
                    </label>
                    <p className="text-sm text-gray-500 mt-1 mb-3">
                      Geef voorkeur aan blokuren
                    </p>
                    <div className="flex items-center justify-start">
                      <input
                        type="checkbox"
                        id="blokuren"
                        checked={aiSettings.blokuren}
                        onChange={(e) => setAiSettings({
                          ...aiSettings,
                          blokuren: e.target.checked
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                      />
                      <label htmlFor="blokuren" className="ml-2 text-sm text-gray-700">
                        {aiSettings.blokuren ? 'Aan' : 'Uit'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Generate Planning */}
          {currentStep === 'generate-planning' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Stap 5: Maak weekplanning</h3>
                {/* <p className="text-gray-600 mb-6 text-sm">
                  Klik op "Maak weekplanning", en controleer de ingeplande lessen.
                  <br />
                  Te veel of te weinig pauzes? Verander de instellingen in Stap 4, en maak een nieuwe weekplanning.
                  <br />
                  Let op: Het bewerken van lessen kan zodra je ze hebt toegevoegd.
                </p> */}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Automatische weekplanning</h4>
                  {/* <p className="text-sm text-gray-500 mt-1">
                    Genereer een geoptimaliseerde weekplanning met AI en toon het resultaat in de console
                  </p> */}
                </div>
                <button
                  onClick={createInputFile}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
                >
                  <Brain className="h-4 w-4" />
                  Maak weekplanning
                </button>
              </div>

                {/* <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Instructies:</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Klik op "Start AI-Weekplanning" om de planning te genereren</li>
                    <li>• De AI analyseert alle beschikbaarheid en genereert een optimale planning</li>
                    <li>• Het input bestand en output resultaat worden getoond in de browser console</li>
                    <li>• Open de browser console (F12) om de resultaten te bekijken</li>
                  </ul>
                </div> */}

              {/* <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Test Planning</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Test de planning functionaliteit (oude methode)
                    </p>
                  </div>
                  <button
                    onClick={generateSampleInput}
                    disabled={isGeneratingSampleInput}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isGeneratingSampleInput
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isGeneratingSampleInput ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Bezig...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Test Planning
                      </>
                    )}
                  </button>
                </div>

                {sampleInputResult && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Test Resultaat:</h5>
                    <pre className="text-sm text-gray-600 overflow-auto max-h-96">
                      {JSON.stringify(sampleInputResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div> */}

              {/* Planning Results Display */}
              {planningResult && (
                <div className="space-y-6">
                  {/* Statistics */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Resultaat</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {planningResult.schedule_details?.lessen || 0}
                        </div>
                        <div className="text-xs text-blue-700">Totaal aantal lessen ingepland</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {planningResult.schedule_details?.totale_minuten_tussen_lesson || 0}
                        </div>
                        <div className="text-xs text-green-700">Totale minuten tussen lessen</div>
                      </div>
                    </div>
                  </div>

                  {/* Lessons List */}
                  {planningResult.lessons && planningResult.lessons.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-medium text-gray-900">Geplande Lessen</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={selectAllLessons}
                            className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Alles selecteren
                          </button>
                          {/* <button
                            onClick={deselectAllLessons}
                            className="px-1.5 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Alles deselecteren
                          </button> */}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {planningResult.lessons.map((lesson: any, index: number) => {
                          const lessonId = `${lesson.date}-${lesson.startTime}-${lesson.studentId}-${index}`
                          const isSelected = selectedLessons.has(lessonId)
                          
                          return (
                            <div key={lessonId} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg justify-start">
                              <input
                                type="checkbox"
                                id={lessonId}
                                checked={isSelected}
                                onChange={(e) => handleLessonSelection(lessonId, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-xs">
                                  {formatLessonDateTime(lesson.date, lesson.startTime, lesson.endTime)} - {lesson.studentName}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Students without lessons */}
                  {planningResult.leerlingen_zonder_les && Object.keys(planningResult.leerlingen_zonder_les).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-base font-medium text-gray-900 mb-4">
                        Leerlingen met te weinig lessen:
                        {/* <br /> */}
                        {/* Niet tevreden? Controleer de instellingen in stap 3. */}
                        </h3>
                      <div className="space-y-2">
                        {Object.entries(planningResult.leerlingen_zonder_les).map(([studentName, missingLessons]) => (
                          <div key={studentName} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <span className="font-medium text-gray-900">{studentName}</span>
                            <span className="text-sm text-red-600">
                              {missingLessons as number} les{(missingLessons as number) !== 1 ? 'sen' : ''} te weinig
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SMS Notification Settings */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                      <h4 className="text-lg font-medium text-gray-900">SMS Leerlingen</h4>
                    </div>
                    <div className="space-y-4">
                      {/* Immediate SMS Toggle */}
                      <div className="flex items-center justify-start">
                        <input
                          type="checkbox"
                          id="sendImmediateSms"
                          checked={sendImmediateSms}
                          onChange={(e) => setSendImmediateSms(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                        />
                        <label htmlFor="sendImmediateSms" className="text-sm font-medium text-gray-700 ml-2">
                          SMS Leerlingen over ingeplande lessen
                        </label>
                      </div>

                      {/* Reminder SMS Toggle */}
                      <div className="flex items-center justify-start">
                        <input
                          type="checkbox"
                          id="sendReminderSms"
                          checked={sendReminderSms}
                          onChange={(e) => setSendReminderSms(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                        />
                        <label htmlFor="sendReminderSms" className="text-sm font-medium text-gray-700 ml-2">
                          Stuur 24 uur van tevoren een herinnering
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Add to schedule button */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Voeg lessen toe</h4>
                      <p className="text-sm text-gray-600 mt-1 mb-4">
                        {selectedLessons.size} van de {planningResult.lessons?.length || 0} lessen geselecteerd
                      </p>
                      <button
                        onClick={addSelectedLessonsToSchedule}
                        disabled={selectedLessons.size === 0 || sendingSms}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                          selectedLessons.size > 0 && !sendingSms
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {sendingSms ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            SMS verzenden...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Voeg lessen toe
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show results */}

          {/* Navigation Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
            <div className="container-mobile py-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 'week-selection'}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition-colors ${
                    currentStep === 'week-selection'
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ArrowLeft className="h-3 w-3" />
                  Vorige
                </button>

                <div className="flex items-center gap-2">
                  {/* Save button for instructor step */}
                  {currentStep === 'instructor' && (
                    <button
                      onClick={saveInstructorAvailability}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-green-600 text-green-600 hover:bg-green-50 transition-colors text-xs"
                    >
                      <Check className="h-3 w-3" />
                      Opslaan
                    </button>
                  )}

                  {/* Save button for students step */}
                  {currentStep === 'students' && (
                    <button
                      onClick={saveStudentData}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-green-600 text-green-600 hover:bg-green-50 transition-colors text-xs"
                    >
                      <Check className="h-3 w-3" />
                      Opslaan
                    </button>
                  )}

                  {/* Save button for settings step */}
                  {currentStep === 'settings' && (
                    <button
                      onClick={saveAISettings}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-green-600 text-green-600 hover:bg-green-50 transition-colors text-xs"
                    >
                      <Check className="h-3 w-3" />
                      Opslaan
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                      canGoNext()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {currentStep === 'generate-planning' ? 'Voltooid' : 'Volgende'}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
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