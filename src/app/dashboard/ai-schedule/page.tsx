'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Users, Calendar, Settings, Brain, Check, X, Clock, MapPin } from 'lucide-react'
import { useEffect, useState, Suspense, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Student } from '@/types/database'

import toast from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'

const DAY_ORDER = [
  { day: 'monday', name: 'Maandag', shortName: 'Ma' },
  { day: 'tuesday', name: 'Dinsdag', shortName: 'Di' },
  { day: 'wednesday', name: 'Woensdag', shortName: 'Wo' },
  { day: 'thursday', name: 'Donderdag', shortName: 'Do' },
  { day: 'friday', name: 'Vrijdag', shortName: 'Vr' },
  { day: 'saturday', name: 'Zaterdag', shortName: 'Za' },
  { day: 'sunday', name: 'Zondag', shortName: 'Zo' },
]

type Step = 'instructor' | 'student-details' | 'settings' | 'prompt' | 'result' | 'selection' | 'test-planning' | `student-${string}`

interface StudentWithScheduleData extends Student {
  lessons: number
  minutes: number
  notes: string
  aiNotes: string
  availabilityNotes: string[] // Per week, komende 5 weken
  availabilityText: string // Beschikbaarheid als tekst
  availability: DayAvailability[] // Nieuwe structuur voor beschikbaarheid per dag
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
  const [currentStep, setCurrentStep] = useState<Step>('instructor')
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0)
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Selected week for AI scheduling
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null)
  const [editableInputPath, setEditableInputPath] = useState<string | null>(null)
  const [isRunningTestPlanning, setIsRunningTestPlanning] = useState(false)
  const [testPlanningResult, setTestPlanningResult] = useState<any>(null)

  // Instructeur beschikbaarheid - nieuwe UI structuur
  const [availability, setAvailability] = useState<DayAvailability[]>([
    { day: 'monday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'tuesday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'wednesday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'thursday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'friday', available: true, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'saturday', available: false, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
    { day: 'sunday', available: false, startTime: '09:00', endTime: '17:00', startHours: '09', startMinutes: '00', endHours: '17', endMinutes: '00' },
  ])
  
  // Geconsolideerde student beschikbaarheid tekst
  const [consolidatedStudentAvailabilityText, setConsolidatedStudentAvailabilityText] = useState('')

  // Leerlingen data
  const [students, setStudents] = useState<StudentWithScheduleData[]>([])

  // AI Resultaat
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set())
  const [isAddingLessons, setIsAddingLessons] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    connectLocations: true,
    numberOfBreaks: 2,
    minutesPerBreak: 15,
    minutesBreakEveryLesson: 5,
    breakAfterEachStudent: true, // altijd true
    sendNotifications: false,
    blokuren: true,
    additionalSpecifications: ''
  })

  // Helper function to get date labels for the current week
  const getDateLabels = () => {
    // Bereken de datums voor de geselecteerde week of de komende week als fallback
    let targetWeekStart: Date
    if (selectedWeek) {
      // Use the selected week
      targetWeekStart = new Date(selectedWeek)
    } else {
      // Fallback to next week if no week is selected
      const today = new Date()
      targetWeekStart = new Date(today)
      targetWeekStart.setDate(today.getDate() + (8 - today.getDay()) % 7) // Volgende maandag
    }
    
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(targetWeekStart)
      date.setDate(targetWeekStart.getDate() + i)
      weekDates.push(date)
    }
    
    // Maak een mapping van dagen naar datums
    const dayToDateMap = {
      'monday': weekDates[0],
      'tuesday': weekDates[1], 
      'wednesday': weekDates[2],
      'thursday': weekDates[3],
      'friday': weekDates[4],
      'saturday': weekDates[5],
      'sunday': weekDates[6]
    }
    
    return dayToDateMap
  }

  // Helper functions for time input handling (from lessons page)
  const validateAndFormatTime = (timeValue: string): string => {
    if (!timeValue) return ''
    
    // Remove any AM/PM indicators
    let cleanTime = timeValue.toUpperCase().replace(/[AP]M/g, '').trim()
    
    // Parse hours and minutes
    const [hours, minutes] = cleanTime.split(':')
    if (!hours || !minutes) return timeValue
    
    const hourNum = parseInt(hours, 10)
    const minuteNum = parseInt(minutes, 10)
    
    // Validate ranges
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      return timeValue
    }
    
    // Return formatted time
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  }

  const formatTimeOnBlur = (value: string, maxValue: number): string => {
    let numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0) {
      numValue = 0
    } else if (numValue > maxValue) {
      numValue = maxValue
    }
    return numValue.toString().padStart(2, '0')
  }

  const updateTimeInputs = (dayIndex: number, field: string, value: string) => {
    setAvailability(prev => {
      const newAvailability = [...prev]
      const day = newAvailability[dayIndex]
      
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
      
      return newAvailability
    })
  }

  const handleTimeBlur = (dayIndex: number, field: string, value: string) => {
    let formattedValue = value
    if (field.includes('Hours')) {
      formattedValue = formatTimeOnBlur(value, 23)
    } else if (field.includes('Minutes')) {
      formattedValue = formatTimeOnBlur(value, 59)
    }
    
    updateTimeInputs(dayIndex, field, formattedValue)
  }

  const handleAvailabilityChange = (dayIndex: number, available: boolean) => {
    setAvailability(prev => {
      const newAvailability = [...prev]
      newAvailability[dayIndex].available = available
      return newAvailability
    })
    
    // Save to database
    saveInstructorAvailability()
  }

  const handleTimeChange = (dayIndex: number, field: string, value: string) => {
    updateTimeInputs(dayIndex, field, value)
    
    // Save to database
    saveInstructorAvailability()
  }

  // Student availability handlers
  const handleStudentAvailabilityChange = (studentIndex: number, dayIndex: number, available: boolean) => {
    setStudents(prev => {
      const newStudents = [...prev]
      const student = newStudents[studentIndex]
      
      // Initialize availability array if it doesn't exist
      if (!student.availability) {
        student.availability = DAY_ORDER.map((dayInfo, index) => ({
          day: dayInfo.day,
          available: false,
          startTime: '09:00',
          endTime: '17:00',
          startHours: '09',
          startMinutes: '00',
          endHours: '17',
          endMinutes: '00'
        }))
      }
      
      // Update the specific day
      student.availability[dayIndex].available = available
      
      // Update availabilityText for backward compatibility
      const availableDays = student.availability
        .filter(day => day.available)
        .map(day => {
          const dayName = DAY_ORDER.find(d => d.day === day.day)?.name
          return dayName
        })
        .filter(Boolean)
      
      student.availabilityText = availableDays.length > 0 
        ? availableDays.join(', ')
        : 'Niet beschikbaar'
      
      return newStudents
    })
    
    // Save to database
    saveStudentAvailabilityToDatabase(studentIndex)
  }

  // Debounce timer for saving student availability
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleStudentTimeChange = (studentIndex: number, dayIndex: number, field: string, value: string) => {
    setStudents(prev => {
      const newStudents = [...prev]
      const student = newStudents[studentIndex]
      
      // Initialize availability array if it doesn't exist
      if (!student.availability) {
        student.availability = DAY_ORDER.map((dayInfo, index) => ({
          day: dayInfo.day,
          available: false,
          startTime: '09:00',
          endTime: '17:00',
          startHours: '09',
          startMinutes: '00',
          endHours: '17',
          endMinutes: '00'
        }))
      }
      
      const day = student.availability[dayIndex]
      
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
      
      return newStudents
    })
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Set new timeout to save after 500ms of no typing
    saveTimeoutRef.current = setTimeout(() => {
      saveStudentAvailabilityToDatabase(studentIndex)
    }, 500)
    
    // Availability updated
  }

  const handleStudentTimeBlur = (studentIndex: number, dayIndex: number, field: string, value: string) => {
    let formattedValue = value
    if (field.includes('Hours')) {
      formattedValue = formatTimeOnBlur(value, 23)
    } else if (field.includes('Minutes')) {
      formattedValue = formatTimeOnBlur(value, 59)
    }
    
    // Clear any pending timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Update the state immediately
    setStudents(prev => {
      const newStudents = [...prev]
      const student = newStudents[studentIndex]
      
      // Initialize availability array if it doesn't exist
      if (!student.availability) {
        student.availability = DAY_ORDER.map((dayInfo, index) => ({
          day: dayInfo.day,
          available: false,
          startTime: '09:00',
          endTime: '17:00',
          startHours: '09',
          startMinutes: '00',
          endHours: '17',
          endMinutes: '00'
        }))
      }
      
      const day = student.availability[dayIndex]
      
      if (field === 'startHours') {
        day.startHours = formattedValue
        day.startTime = `${day.startHours}:${day.startMinutes}`
      } else if (field === 'startMinutes') {
        day.startMinutes = formattedValue
        day.startTime = `${day.startHours}:${day.startMinutes}`
      } else if (field === 'endHours') {
        day.endHours = formattedValue
        day.endTime = `${day.endHours}:${day.endMinutes}`
      } else if (field === 'endMinutes') {
        day.endMinutes = formattedValue
        day.endTime = `${day.endHours}:${day.endMinutes}`
      }
      
      return newStudents
    })
    
    // Save immediately on blur
    saveStudentAvailabilityToDatabase(studentIndex)
  }

  const saveStudentAvailabilityToDatabase = async (studentIndex: number) => {
    if (!user) return
    
    const student = students[studentIndex]
    if (!student) return
    
    try {
      // Calculate the next 5 weeks starting from next Monday
      const today = new Date()
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Volgende maandag
      
      const weekStarts: string[] = []
      for (let i = 0; i < 5; i++) {
        const weekStart = new Date(nextMonday)
        weekStart.setDate(nextMonday.getDate() + (i * 7))
        weekStarts.push(weekStart.toISOString().slice(0, 10))
      }

      // Save availability for the current week (first week)
      const currentWeekStart = weekStarts[0]
      
      // Convert availability to text format for database
      const availabilityText = student.availability
        ?.filter(day => day.available)
        .map(day => {
          const dayName = DAY_ORDER.find(d => d.day === day.day)?.name
          return `${dayName}: ${day.startTime} - ${day.endTime}`
        })
        .join(', ') || 'Niet beschikbaar'
      
      console.log(`Saving availability for student ${student.id} for week ${currentWeekStart}: ${availabilityText}`)
      
      const { error } = await supabase
        .from('student_availability')
        .upsert({
          student_id: student.id,
          week_start: currentWeekStart,
          notes: availabilityText
        }, {
          onConflict: 'student_id,week_start',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Error saving student availability:', error)
        toast.error(`Fout bij opslaan beschikbaarheid: ${error.message}`)
      } else {
        console.log(`Successfully saved availability for student ${student.id}`)
        // Update localStorage with new availability
        updateLocalStorageData()
      }
    } catch (error) {
      console.error('Error saving student availability:', error)
      toast.error('Fout bij opslaan beschikbaarheid')
    }
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

  // Save instructor availability to database
  const saveInstructorAvailability = async () => {
    if (!user) return
    
    try {
      // Convert UI format to database format
      const availabilityToSave = availability.map(day => ({
        instructor_id: user.id,
        day_of_week: day.day === 'sunday' ? 0 : 
                     day.day === 'monday' ? 1 :
                     day.day === 'tuesday' ? 2 :
                     day.day === 'wednesday' ? 3 :
                     day.day === 'thursday' ? 4 :
                     day.day === 'friday' ? 5 : 6,
        available: day.available,
        start_time: day.startTime,
        end_time: day.endTime
      }))

      const { error } = await supabase
        .from('instructor_availability')
        .upsert(availabilityToSave, { 
          onConflict: 'instructor_id,day_of_week',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Error saving instructor availability:', error)
      } else {
        // Update localStorage with new availability
        updateLocalStorageData()
      }
    } catch (error) {
      console.error('Error saving instructor availability:', error)
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
        // If table doesn't exist, initialize default availability and try to create it
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
            const fallbackAvailability = DAY_ORDER.map(({ day }) => ({
              day,
              available: day !== 'saturday' && day !== 'sunday',
              startTime: '09:00',
              endTime: '17:00',
              startHours: '09',
              startMinutes: '00',
              endHours: '17',
              endMinutes: '00'
            }))
            setAvailability(fallbackAvailability)
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

            const newAvailability = DAY_ORDER.map(({ day }) => {
              const dbData = dbAvailability[day]
              const available = dbData?.available ?? (day !== 'saturday' && day !== 'sunday')
              const startTime = dbData?.startTime ?? '09:00'
              const endTime = dbData?.endTime ?? '17:00'
              const [startHours, startMinutes] = startTime.split(':')
              const [endHours, endMinutes] = endTime.split(':')
              
              return {
                day,
                available,
                startTime,
                endTime,
                startHours,
                startMinutes,
                endHours,
                endMinutes
              }
            })
            
            setAvailability(newAvailability)
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

        const newAvailability = DAY_ORDER.map(({ day }) => {
          const dbData = dbAvailability[day]
          const available = dbData?.available ?? (day !== 'saturday' && day !== 'sunday')
          const startTime = dbData?.startTime ?? '09:00'
          const endTime = dbData?.endTime ?? '17:00'
          const [startHours, startMinutes] = startTime.split(':')
          const [endHours, endMinutes] = endTime.split(':')
          
          return {
            day,
            available,
            startTime,
            endTime,
            startHours,
            startMinutes,
            endHours,
            endMinutes
          }
        })
        setAvailability(newAvailability)
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

          setAvailability(DAY_ORDER.map(({ day }) => {
            const dbData = dbAvailability[day]
            const available = dbData?.available ?? (day !== 'saturday' && day !== 'sunday')
            const startTime = dbData?.startTime ?? '09:00'
            const endTime = dbData?.endTime ?? '17:00'
            const [startHours, startMinutes] = startTime.split(':')
            const [endHours, endMinutes] = endTime.split(':')
            
            return {
              day,
              available,
              startTime,
              endTime,
              startHours,
              startMinutes,
              endHours,
              endMinutes
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching instructor availability:', error)
      // Fallback to default availability on any error
      const fallbackAvailability = DAY_ORDER.map(({ day }) => ({
        day,
        available: day !== 'saturday' && day !== 'sunday',
        startTime: '09:00',
        endTime: '17:00',
        startHours: '09',
        startMinutes: '00',
        endHours: '17',
        endMinutes: '00'
      }))
      setAvailability(fallbackAvailability)
    }
  }

  // Fetch students from database with their availability
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
        notes: '', // This will be set to student_availability.notes, not students.notes
        aiNotes: '',
        availabilityNotes: [],
        availabilityText: 'Flexibel beschikbaar', // Will be updated by fetchStudentAvailability
        availability: DAY_ORDER.map((dayInfo) => ({
          day: dayInfo.day,
          available: false,
          startTime: '09:00',
          endTime: '17:00',
          startHours: '09',
          startMinutes: '00',
          endHours: '17',
          endMinutes: '00'
        }))
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
      
      // Fetch student availability from database for the next 5 weeks
      await fetchStudentAvailability(studentsWithScheduleData)
      
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  // Fetch latest student availability from database for current week
  const fetchLatestStudentAvailability = async () => {
    if (!user) return []
    
    try {
      // Calculate the current week starting from next Monday
      const today = new Date()
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Volgende maandag
      
      const currentWeekStart = nextMonday.toISOString().slice(0, 10)
      
      // Get all student IDs
      const studentIds = students.map(s => s.id)
      
      const { data: availabilityData, error } = await supabase
        .from('student_availability')
        .select('student_id, week_start, notes')
        .in('student_id', studentIds)
        .eq('week_start', currentWeekStart)

      if (error) {
        console.error('Error fetching latest student availability:', error)
        return []
      }

      return availabilityData || []
    } catch (error) {
      console.error('Error fetching latest student availability:', error)
      return []
    }
  }

  // Fetch student availability from database
  const fetchStudentAvailability = async (studentsList: StudentWithScheduleData[]) => {
    if (!user || studentsList.length === 0) return
    
    try {
      // Calculate the next 5 weeks starting from next Monday
      const today = new Date()
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Volgende maandag
      
      const weekStarts: string[] = []
      for (let i = 0; i < 5; i++) {
        const weekStart = new Date(nextMonday)
        weekStart.setDate(nextMonday.getDate() + (i * 7))
        weekStarts.push(weekStart.toISOString().slice(0, 10))
      }

      // Fetch availability for all students for the next 5 weeks
      const studentIds = studentsList.map(s => s.id)
      
      const { data: availabilityData, error } = await supabase
        .from('student_availability')
        .select('student_id, week_start, notes')
        .in('student_id', studentIds)
        .in('week_start', weekStarts)

      if (error) {
        console.error('Error fetching student availability:', error)
        return
      }

      // Update students with their availability data
      const updatedStudents = studentsList.map(student => {
        const studentAvailability = availabilityData?.filter(a => a.student_id === student.id) || []
        
        // Create availability notes array for the next 5 weeks
        const availabilityNotes = weekStarts.map(weekStart => {
          const weekData = studentAvailability.find(a => a.week_start === weekStart)
          return weekData?.notes || ''
        })

        // Get the most recent availability text from the database
        // Prioritize the current week (first week), then fall back to most recent non-empty note
        let availabilityText = 'Flexibel beschikbaar' // Default fallback
        if (availabilityNotes.length > 0) {
          // First try the current week (first week)
          if (availabilityNotes[0] && availabilityNotes[0].trim() !== '') {
            availabilityText = availabilityNotes[0]
          } else {
            // Find the most recent non-empty note
            const recentNotes = availabilityNotes.filter(note => note.trim() !== '')
            if (recentNotes.length > 0) {
              availabilityText = recentNotes[recentNotes.length - 1]
            }
          }
        }

        // Parse availability text to create availability array
        const availability = DAY_ORDER.map((dayInfo) => {
          const dayName = dayInfo.name
          const dayPattern = new RegExp(`${dayName}:\\s*([^,]+)`, 'i')
          const match = availabilityText.match(dayPattern)
          
          if (match) {
            const timeText = match[1].trim()
            const timeRangeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/)
            
            if (timeRangeMatch) {
              const startHour = timeRangeMatch[1].padStart(2, '0')
              const startMinute = timeRangeMatch[2] || '00'
              const endHour = timeRangeMatch[3].padStart(2, '0')
              const endMinute = timeRangeMatch[4] || '00'
              
              return {
                day: dayInfo.day,
                available: true,
                startTime: `${startHour}:${startMinute}`,
                endTime: `${endHour}:${endMinute}`,
                startHours: startHour,
                startMinutes: startMinute,
                endHours: endHour,
                endMinutes: endMinute
              }
            }
          }
          
          // Default: not available
          return {
            day: dayInfo.day,
            available: false,
            startTime: '09:00',
            endTime: '17:00',
            startHours: '09',
            startMinutes: '00',
            endHours: '17',
            endMinutes: '00'
          }
        })

        return {
          ...student,
          availabilityNotes,
          availabilityText,
          availability,
          notes: availabilityText // This now contains the student_availability.notes for AI prompt generation
        }
      })

      setStudents(updatedStudents)
      
      // Initialize consolidated student availability text
      if (updatedStudents.length > 0) {
        const consolidatedText = updatedStudents.map(student => {
          const studentName = student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name
          return `${studentName}: ${student.availabilityText}`
        }).join('\n')
        setConsolidatedStudentAvailabilityText(consolidatedText)
      }
      
    } catch (error) {
      console.error('Error fetching student availability:', error)
    }
  }

  // Add session check
  useEffect(() => {
    const checkSession = async () => {
      if (!loading && !user) {
        console.log('No user found, redirecting to login')
        router.push('/auth/signin')
        return
      }

      if (user) {
        console.log('User found:', { id: user.id, email: user.email })
        
        // Check session
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Session check:', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          expiresAt: session?.expires_at,
          isExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : 'Unknown'
        })
        
        if (!session?.access_token) {
          console.log('No valid session found, redirecting to login')
          router.push('/auth/signin')
          return
        }
      }
    }

    checkSession()
  }, [user, loading, router])

  // Load data on component mount
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to signin if not authenticated
      window.location.href = '/auth/signin'
    }
  }, [user, loading])

  // Fetch AI settings from database
  const fetchAISettings = async () => {
    if (!user) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No access token found for fetching AI settings')
        return
      }

      const response = await fetch('/api/ai-schedule/update-settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Map database fields back to UI fields
          setSettings(prev => ({
            ...prev,
            connectLocations: result.data.locaties_koppelen,
            minutesBreakEveryLesson: result.data.pauze_tussen_lessen,
            minutesPerBreak: result.data.lange_pauze_duur,
            blokuren: result.data.blokuren
          }))
        }
      } else {
        console.error('Error fetching AI settings:', await response.json())
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error)
    }
  }

  useEffect(() => {
    if (user && mounted) {
      fetchInstructorAvailability()
      fetchStudents()
      fetchAISettings()
    }
  }, [user, mounted])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Initialize selected week and data from URL parameters
  useEffect(() => {
    const weekParam = searchParams.get('week')
    
    if (weekParam) {
      try {
        const weekDate = new Date(weekParam)
        if (!isNaN(weekDate.getTime())) {
          setSelectedWeek(weekDate)
        }
      } catch (error) {
        console.error('Error parsing week parameter:', error)
      }
    }
    
    // Load data from localStorage if available
    const storedData = localStorage.getItem('aiScheduleData')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        setEditableInputPath('data') // Use 'data' as a special identifier
        // Keep the default step as 'instructor' instead of jumping to 'test-planning'
        // setCurrentStep('test-planning') // Removed this line
        
        // Initialize the UI with the stored data
        initializeUIWithData(data)
      } catch (error) {
        console.error('Error parsing stored data:', error)
      }
    }
  }, [searchParams])

  // Initialize UI with data from localStorage
  const initializeUIWithData = (data: any) => {
    if (!data) return
    
    // Initialize instructor availability
    if (data.instructeur) {
      const instructor = data.instructeur
      
      // Convert beschikbareUren to availability format
      const newAvailability = DAY_ORDER.map((dayInfo) => {
        const dayName = dayInfo.name.toLowerCase()
        const available = instructor.beschikbareUren && instructor.beschikbareUren[dayName]
        const times = available ? instructor.beschikbareUren[dayName] : ['09:00', '17:00']
        
        const [startHours, startMinutes] = times[0].split(':')
        const [endHours, endMinutes] = times[1].split(':')
        
        return {
          day: dayInfo.day,
          available: !!available,
          startTime: times[0],
          endTime: times[1],
          startHours,
          startMinutes,
          endHours,
          endMinutes
        }
      })
      
      setAvailability(newAvailability)
      
      // Update settings
      setSettings(prev => ({
        ...prev,
        connectLocations: instructor.locatiesKoppelen ?? true,
        blokuren: instructor.blokuren ?? true,
        minutesBreakEveryLesson: instructor.pauzeTussenLessen ?? 10,
        minutesPerBreak: instructor.langePauzeDuur ?? 0
      }))
    }
    
    // Initialize students
    if (data.leerlingen) {
      const newStudents = data.leerlingen.map((student: any) => {
        // Convert beschikbaarheid to availability format
        const availability = DAY_ORDER.map((dayInfo) => {
          const dayName = dayInfo.name.toLowerCase()
          const available = student.beschikbaarheid && student.beschikbaarheid[dayName]
          const times = available ? student.beschikbaarheid[dayName] : ['09:00', '17:00']
          
          const [startHours, startMinutes] = times[0].split(':')
          const [endHours, endMinutes] = times[1].split(':')
          
          return {
            day: dayInfo.day,
            available: !!available,
            startTime: times[0],
            endTime: times[1],
            startHours,
            startMinutes,
            endHours,
            endMinutes
          }
        })
        
        return {
          id: student.id,
          first_name: student.naam.split(' ')[0],
          last_name: student.naam.split(' ').slice(1).join(' '),
          lessons: student.lessenPerWeek,
          minutes: student.lesDuur,
          notes: '',
          aiNotes: '',
          availabilityNotes: [],
          availabilityText: '',
          availability
        }
      })
      
      setStudents(newStudents)
    }
  }

  // Update localStorage with current UI data
  const updateLocalStorageData = () => {
    try {
      const currentData = localStorage.getItem('aiScheduleData')
      if (!currentData) return
      
      const data = JSON.parse(currentData)
      
      // Update instructor availability
      if (data.instructeur) {
        const beschikbareUren: Record<string, string[]> = {}
        availability.forEach(day => {
          if (day.available) {
            const dayName = DAY_ORDER.find(d => d.day === day.day)?.name.toLowerCase()
            if (dayName) {
              beschikbareUren[dayName] = [day.startTime, day.endTime]
            }
          }
        })
        
        data.instructeur.beschikbareUren = beschikbareUren
        data.instructeur.blokuren = settings.blokuren
        data.instructeur.pauzeTussenLessen = settings.minutesBreakEveryLesson
        data.instructeur.langePauzeDuur = settings.minutesPerBreak
        data.instructeur.locatiesKoppelen = settings.connectLocations
      }
      
      // Update students
      if (data.leerlingen) {
        data.leerlingen = data.leerlingen.map((student: any) => {
          const uiStudent = students.find(s => s.id === student.id)
          if (uiStudent) {
            const beschikbaarheid: Record<string, string[]> = {}
            uiStudent.availability?.forEach(day => {
              if (day.available) {
                const dayName = DAY_ORDER.find(d => d.day === day.day)?.name.toLowerCase()
                if (dayName) {
                  beschikbaarheid[dayName] = [day.startTime, day.endTime]
                }
              }
            })
            
            return {
              ...student,
              naam: uiStudent.last_name ? `${uiStudent.first_name} ${uiStudent.last_name}` : uiStudent.first_name,
              lessenPerWeek: uiStudent.lessons,
              lesDuur: uiStudent.minutes,
              beschikbaarheid
            }
          }
          return student
        })
      }
      
      localStorage.setItem('aiScheduleData', JSON.stringify(data))
    } catch (error) {
      console.error('Error updating localStorage data:', error)
    }
  }

  // Reinitialize data from database
  const reinitializeDataFromDatabase = async () => {
    if (!user || !selectedWeek) return
    
    try {
      const weekStart = selectedWeek.toISOString().split('T')[0]
      
      const response = await fetch('/api/ai-schedule/create-editable-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructorId: user.id,
          weekStart: weekStart
        })
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('Fout bij het herinitialiseren van data: ' + (error.error || 'Onbekende fout'))
        return
      }

      const result = await response.json()
      
      // Update localStorage with fresh data
      localStorage.setItem('aiScheduleData', JSON.stringify(result.data))
      
      // Reinitialize UI
      initializeUIWithData(result.data)
      
      toast.success('Data hergeïnitialiseerd van database')
      
    } catch (error) {
      console.error('Error reinitializing data:', error)
      toast.error('Fout bij het herinitialiseren van data')
    }
  }

  const reinitializeDataFromDatabaseSilently = async () => {
    if (!user || !selectedWeek) return
    
    try {
      const weekStart = selectedWeek.toISOString().split('T')[0]
      
      const response = await fetch('/api/ai-schedule/create-editable-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructorId: user.id,
          weekStart: weekStart
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Onbekende fout')
      }

      const result = await response.json()
      
      // Update localStorage with fresh data
      localStorage.setItem('aiScheduleData', JSON.stringify(result.data))
      
      // Reinitialize UI
      initializeUIWithData(result.data)
      
    } catch (error) {
      console.error('Error reinitializing data:', error)
      throw error
    }
  }

  // Handle test planning
  const handleStartTestPlanning = async () => {
    if (!editableInputPath) {
      toast.error('Geen bewerkbare input gevonden')
      return
    }

    setIsRunningTestPlanning(true)
    try {
      // First, reinitialize data from database to ensure we have the latest data
      await reinitializeDataFromDatabaseSilently()
      
      // Then use the current data from localStorage
      const storedData = localStorage.getItem('aiScheduleData')
      if (!storedData) {
        throw new Error('Geen data gevonden')
      }

      console.log('=== DEBUG: Data being sent to API ===')
      const parsedData = JSON.parse(storedData)
      console.log('Parsed data:', JSON.stringify(parsedData, null, 2))

      const response = await fetch('/api/ai-schedule/run-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: parsedData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('Fout bij het uitvoeren van planning: ' + (error.error || 'Onbekende fout'))
        return
      }

      const result = await response.json()
      console.log('=== DEBUG: API Response ===')
      console.log('Result:', JSON.stringify(result, null, 2))
      
      setTestPlanningResult(result.data)
      toast.success('Weekplanning succesvol gegenereerd')
      
    } catch (error) {
      console.error('Error running planning:', error)
      toast.error('Fout bij het uitvoeren van planning')
    } finally {
      setIsRunningTestPlanning(false)
    }
  }

  

  // Handle student data changes
  const handleStudentChange = (id: string, field: string, value: any) => {
    setStudents(prev => {
      const newStudents = prev.map(student => 
        student.id === id ? { ...student, [field]: value } : student
      )
      
      // Update consolidated student availability text if availability changed
      if (field === 'availabilityText') {
        const consolidatedText = newStudents.map(student => {
          const studentName = student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name
          return `${studentName}: ${student.availabilityText}`
        }).join('\n')
        setConsolidatedStudentAvailabilityText(consolidatedText)
        
        // Save availability to database immediately
        const studentIndex = students.findIndex(s => s.id === id)
        if (studentIndex !== -1) {
          saveStudentAvailabilityToDatabase(studentIndex)
        }
      }
      
      return newStudents
    })
    
    // Update localStorage when student data changes
    updateLocalStorageData()
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
    
    // Reset completed
  }

  // Navigation functions - simplified for editable data approach
  const handleNext = () => {
    // For the new approach, we go directly to test-planning
    if (currentStep === 'instructor') {
      setCurrentStep('student-details')
    } else if (currentStep === 'student-details') {
      setCurrentStep('settings')
    } else if (currentStep === 'settings') {
      setCurrentStep('test-planning')
    }
  }

  const handlePrevious = () => {
    if (currentStep === 'student-details') {
      setCurrentStep('instructor')
    } else if (currentStep === 'settings') {
      setCurrentStep('student-details')
    } else if (currentStep === 'test-planning') {
      setCurrentStep('settings')
    }
  }



  // Handle settings change
  const handleSettingsChange = async (field: string, value: any) => {
    // Force breakAfterEachStudent to true always
    if (field === 'breakAfterEachStudent') {
      setSettings(prev => ({ ...prev, breakAfterEachStudent: true }))
      return
    }
    setSettings(prev => ({ ...prev, [field]: value, breakAfterEachStudent: true }))
    
    // Update AI settings in database for specific fields
    if ([
      'connectLocations',
      'minutesBreakEveryLesson',
      'minutesPerBreak',
      'blokuren'
    ].includes(field)) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          console.error('No access token found for updating AI settings')
          return
        }

        // Map field names to database field names
        const fieldMapping: Record<string, string> = {
          connectLocations: 'locatiesKoppelen',
          minutesBreakEveryLesson: 'pauzeTussenLessen',
          minutesPerBreak: 'langePauzeDuur',
          blokuren: 'blokuren'
        }

        const mappedField = fieldMapping[field]
        if (!mappedField) return

        const updateData: any = {}
        updateData[mappedField] = value

        const response = await fetch('/api/ai-schedule/update-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Error updating AI settings:', errorData)
        } else {
          console.log(`Successfully updated ${field} in AI settings`)
          // Update localStorage with new settings
          updateLocalStorageData()
        }

        // Note: sample_input.json updates removed since we now use in-memory approach
      } catch (error) {
        console.error('Error updating AI settings:', error)
      }
    }
    
    // Settings updated
  }

  // Generate AI prompt - removed as we now use actual planning

  // Send to AI - removed as we now use actual planning

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
    if (testPlanningResult && testPlanningResult.lessons) {
      const allLessonIds = testPlanningResult.lessons.map((_: any, index: number) => index.toString())
      setSelectedLessons(new Set(allLessonIds))
    }
  }

  const handleDeselectAll = () => {
    setSelectedLessons(new Set())
  }

  // Add selected lessons to database
  const handleAddSelectedLessons = async () => {
    if (!user || !testPlanningResult || !testPlanningResult.lessons) return
    
    const selectedLessonData = testPlanningResult.lessons.filter((_: any, index: number) => 
      selectedLessons.has(index.toString())
    )
    
    if (selectedLessonData.length === 0) {
      toast.error('Geen lessen geselecteerd')
      return
    }
    
    setIsAddingLessons(true)
    
    try {
      // Debug: Log current user state
      console.log('=== FRONTEND DEBUG ===')
      console.log('Current user:', user ? { id: user.id, email: user.email } : 'No user')
      
      // Get the current session to get the JWT token
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('Session:', session ? {
        hasAccessToken: !!session.access_token,
        tokenLength: session.access_token?.length,
        expiresAt: session.expires_at,
        isExpired: session.expires_at ? new Date(session.expires_at * 1000) < new Date() : 'Unknown'
      } : 'No session')
      
      if (!session?.access_token) {
        console.log('No access token found in session')
        throw new Error('Geen geldige sessie gevonden')
      }
      
      console.log('Token preview:', session.access_token.substring(0, 20) + '...')
      
      const response = await fetch('/api/lessons/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          lessons: selectedLessonData,
          instructorId: user.id
        })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json()
        console.log('Error response:', errorData)
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Fout bij het toevoegen van lessen'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Success response:', result)
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
                Vul je beschikbare tijden in. Wijzigingen worden automatisch opgeslagen naar de database.
              </p>
            </div>
            
            <div className="card">
              <div className="space-y-4">
                {DAY_ORDER.map((dayInfo, index) => {
                  const day = availability[index]
                  const dateLabels = getDateLabels()
                  const date = dateLabels[dayInfo.day as keyof typeof dateLabels]
                  const dateLabel = date ? `${dayInfo.shortName} ${date.getDate()} ${date.toLocaleDateString('nl-NL', { month: 'short' })}` : dayInfo.name
                  
                  return (
                    <div key={dayInfo.day} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      {/* Checkbox */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={day.available}
                          onChange={(e) => handleAvailabilityChange(index, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-900 min-w-[100px]">
                          {dateLabel}
                        </label>
                      </div>
                      
                      {/* Time inputs - only show if available */}
                      {day.available && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Van</span>
                          
                          {/* Start time */}
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={day.startHours}
                              onChange={(e) => handleTimeChange(index, 'startHours', e.target.value)}
                              onBlur={(e) => handleTimeBlur(index, 'startHours', e.target.value)}
                              className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              style={{ width: '32px', padding: '0', margin: '0' }}
                              maxLength={2}
                            />
                            <span className="text-sm text-gray-500"> :</span>
                            <input
                              type="text"
                              value={day.startMinutes}
                              onChange={(e) => handleTimeChange(index, 'startMinutes', e.target.value)}
                              onBlur={(e) => handleTimeBlur(index, 'startMinutes', e.target.value)}
                              className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              style={{ width: '32px', padding: '0', margin: '0' }}
                              maxLength={2}
                            />
                          </div>
                          
                          <span className="text-sm text-gray-500">tot</span>
                          
                          {/* End time */}
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={day.endHours}
                              onChange={(e) => handleTimeChange(index, 'endHours', e.target.value)}
                              onBlur={(e) => handleTimeBlur(index, 'endHours', e.target.value)}
                              className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              style={{ width: '32px', padding: '0', margin: '0' }}
                              maxLength={2}
                            />
                            <span className="text-sm text-gray-500"> :</span>
                            <input
                              type="text"
                              value={day.endMinutes}
                              onChange={(e) => handleTimeChange(index, 'endMinutes', e.target.value)}
                              onBlur={(e) => handleTimeBlur(index, 'endMinutes', e.target.value)}
                              className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              style={{ width: '32px', padding: '0', margin: '0' }}
                              maxLength={2}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Not available text */}
                      {!day.available && (
                        <span className="text-sm text-gray-500 italic">
                          Niet beschikbaar
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Wijzigingen worden automatisch opgeslagen naar de database en gebruikt voor de AI planning.
                </p>
              </div>
            </div>
          </div>
        )

      case 'student-details':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Leerling instellingen</h3>
              <p className="text-gray-600 mb-6">
                Pas de lesinstellingen en beschikbaarheid aan voor elke leerling. Wijzigingen worden automatisch opgeslagen naar de database.
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
              <div className="space-y-6">
                {/* Leerling beschikbaarheid per dag */}
                <div className="card">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschikbaarheid per leerling
                    </label>
                    <p className="text-sm text-gray-600 mb-4">
                      Configureer de beschikbaarheid voor elke leerling per dag van de week. Wijzigingen worden automatisch opgeslagen.
                    </p>
                    
                    {students.map((student, studentIndex) => (
                      <div key={student.id} className="mb-6 p-4 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {student.first_name} {student.last_name || ''}
                        </h4>
                        
                        <div className="space-y-3">
                          {DAY_ORDER.map((dayInfo, dayIndex) => {
                            const dayAvailability = student.availability?.[dayIndex] || {
                              day: dayInfo.day,
                              available: false,
                              startTime: '09:00',
                              endTime: '17:00',
                              startHours: '09',
                              startMinutes: '00',
                              endHours: '17',
                              endMinutes: '00'
                            }
                            
                            const dateLabels = getDateLabels()
                            const date = dateLabels[dayInfo.day as keyof typeof dateLabels]
                            const dateLabel = date ? `${dayInfo.shortName} ${date.getDate()} ${date.toLocaleDateString('nl-NL', { month: 'short' })}` : dayInfo.name
                            
                            return (
                              <div key={dayInfo.day} className="flex items-center space-x-4 p-3 border border-gray-100 rounded-lg">
                                {/* Checkbox */}
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={dayAvailability.available}
                                    onChange={(e) => handleStudentAvailabilityChange(studentIndex, dayIndex, e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <label className="ml-2 text-sm font-medium text-gray-900 min-w-[100px]">
                                    {dateLabel}
                                  </label>
                                </div>
                                
                                {/* Time inputs - only show if available */}
                                {dayAvailability.available && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">Van</span>
                                    
                                    {/* Start time */}
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="text"
                                        value={dayAvailability.startHours}
                                        onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'startHours', e.target.value)}
                                        onBlur={(e) => handleStudentTimeBlur(studentIndex, dayIndex, 'startHours', e.target.value)}
                                        className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        style={{ width: '32px', padding: '0', margin: '0' }}
                                        maxLength={2}
                                      />
                                      <span className="text-sm text-gray-500"> :</span>
                                      <input
                                        type="text"
                                        value={dayAvailability.startMinutes}
                                        onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'startMinutes', e.target.value)}
                                        onBlur={(e) => handleStudentTimeBlur(studentIndex, dayIndex, 'startMinutes', e.target.value)}
                                        className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        style={{ width: '32px', padding: '0', margin: '0' }}
                                        maxLength={2}
                                      />
                                    </div>
                                    
                                    <span className="text-sm text-gray-500">tot</span>
                                    
                                    {/* End time */}
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="text"
                                        value={dayAvailability.endHours}
                                        onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'endHours', e.target.value)}
                                        onBlur={(e) => handleStudentTimeBlur(studentIndex, dayIndex, 'endHours', e.target.value)}
                                        className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        style={{ width: '32px', padding: '0', margin: '0' }}
                                        maxLength={2}
                                      />
                                      <span className="text-sm text-gray-500"> :</span>
                                      <input
                                        type="text"
                                        value={dayAvailability.endMinutes}
                                        onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'endMinutes', e.target.value)}
                                        onBlur={(e) => handleStudentTimeBlur(studentIndex, dayIndex, 'endMinutes', e.target.value)}
                                        className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        style={{ width: '32px', padding: '0', margin: '0' }}
                                        maxLength={2}
                                      />
                                    </div>
                                  </div>
                                )}
                                
                                {/* Not available text */}
                                {!dayAvailability.available && (
                                  <span className="text-sm text-gray-500 italic">
                                    Niet beschikbaar
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individuele leerling instellingen */}
                <div className="space-y-4">
                  {students.map((student, index) => (
                    <div key={student.id} className="card">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-6">
                          <h4 className="font-medium text-gray-900">
                            {student.first_name} {student.last_name || ''}
                          </h4>
                          
                          {/* Lessen per week en lesduur direct naast de naam */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Lessen/week:</span>
                              <input
                                type="number"
                                min="1"
                                max="7"
                                value={student.lessons}
                                onChange={(e) => handleStudentChange(student.id, 'lessons', parseInt(e.target.value))}
                                className={`w-16 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                                  isValueDifferentFromDefault(student, 'lessons') 
                                    ? 'border-orange-300 bg-orange-50' 
                                    : 'border-gray-300'
                                }`}
                              />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Minuten:</span>
                              <input
                                type="number"
                                min="30"
                                max="180"
                                step="15"
                                value={student.minutes}
                                onChange={(e) => handleStudentChange(student.id, 'minutes', parseInt(e.target.value))}
                                className={`w-16 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                                  isValueDifferentFromDefault(student, 'minutes') 
                                    ? 'border-orange-300 bg-orange-50' 
                                    : 'border-gray-300'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {(isValueDifferentFromDefault(student, 'lessons') || isValueDifferentFromDefault(student, 'minutes')) && (
                          <button
                            onClick={() => resetToDefault(student.id)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Reset naar standaard
                          </button>
                        )}
                      </div>
                      
                      {/* <div className="mt-4">
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
                      </div> */}
                    </div>
                  ))}
                </div>
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
                Configureer hoe de AI je rooster moet plannen. Wijzigingen worden automatisch opgeslagen naar de database.
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Blokuren</h4>
                    <p className="text-sm text-gray-600">Plan lessen in blokken van 2 uur</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.blokuren}
                    onChange={(e) => handleSettingsChange('blokuren', e.target.checked)}
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
                        Lange pauze duur (minuten)
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
                        Pauze tussen lessen (minuten)
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
                    {/* Pauze na elke leerling toggle verwijderd */}
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
              
              {/* <div className="card">
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
              </div> */}
            </div>
          </div>
        )

      case 'prompt':
        return (
          <div className="space-y-6">
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
            {/* Show results below the button if available */}
            {testPlanningResult && (
              <>
                {/* Samenvatting */}
                <div className="card">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Lessen ingepland</h4>
                      <p className="text-2xl font-bold text-blue-600">{testPlanningResult.schedule_details?.lessen || testPlanningResult.lessons?.length || 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-1">Totale tijd tussen lessen</h4>
                      <p className="text-2xl font-bold text-green-600">{testPlanningResult.schedule_details?.totale_minuten_tussen_lessen || 0} min</p>
                    </div>
                  </div>
                </div>
                {/* Bulk selectie */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">
                      Geselecteerd: {selectedLessons.size} van {testPlanningResult.lessons?.length || 0} lessen
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
                        Selectie opheffen
                      </button>
                    </div>
                  </div>
                </div>
                {/* Lessen lijst */}
                <div className="space-y-2">
                  {testPlanningResult.lessons?.map((lesson: any, index: number) => {
                    const studentNameParts = lesson.studentName.split(' ')
                    const firstName = studentNameParts[0]
                    const lastNameInitial = studentNameParts.length > 1 ? studentNameParts[1][0] : ''
                    const displayName = lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName
                    const lessonDate = new Date(lesson.date)
                    const shortDate = lessonDate.toLocaleDateString('nl-NL', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long'
                    })
                    return (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedLessons.has(index.toString())}
                            onChange={() => handleLessonSelection(index.toString())}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
                          />
                          <div className="flex-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-900">
                              {displayName}
                            </span>
                            <div className="flex items-center gap-3 text-gray-600">
                              <span>{shortDate}</span>
                              <span className="font-mono">{lesson.startTime} - {lesson.endTime}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Leerlingen zonder les waarschuwing */}
                <div className="card">
                  {testPlanningResult.leerlingen_zonder_les && Object.keys(testPlanningResult.leerlingen_zonder_les).length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h5 className="font-medium text-yellow-800 mb-2">Leerlingen met onvoldoende lessen:</h5>
                      <div className="text-sm text-yellow-700">
                        {Object.entries(testPlanningResult.leerlingen_zonder_les).map(([name, count]: [string, any]) => (
                          <div key={name} className="flex justify-between">
                            <span>{name}</span>
                            <span>{count as number} les(sen) tekort</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Toevoegen knop */}
                <div className="card">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Selecteer de lessen die je wilt toevoegen aan je rooster
                    </p>
                    <button
                      onClick={handleAddSelectedLessons}
                      disabled={selectedLessons.size === 0 || isAddingLessons}
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingLessons ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Lessen toevoegen...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Geselecteerde lessen toevoegen ({selectedLessons.size})
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

      case 'test-planning':
        return (
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
                  Klik op de knop hieronder om de test planning uit te voeren. De data wordt eerst hergeïnitialiseerd van de database.
                </p>
                
                <div className="space-y-4">
                  <button
                    onClick={handleStartTestPlanning}
                    disabled={isRunningTestPlanning}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {isRunningTestPlanning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Test Planning wordt uitgevoerd...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Start Test Planning
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={reinitializeDataFromDatabase}
                    disabled={isRunningTestPlanning}
                    className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    <Settings className="h-4 w-4" />
                    Herinitialiseer data van database
                  </button>
                </div>
                
                {testPlanningResult && (
                  <div className="mt-6 space-y-4">
                    {/* Summary */}
                    <div className="card">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-1">Lessen ingepland</h4>
                          <p className="text-2xl font-bold text-blue-600">{testPlanningResult.schedule_details?.lessen || testPlanningResult.lessons?.length || 0}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-1">Totale tijd tussen lessen</h4>
                          <p className="text-2xl font-bold text-green-600">{testPlanningResult.schedule_details?.totale_minuten_tussen_lessen || 0} min</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lessons list */}
                    {testPlanningResult.lessons && testPlanningResult.lessons.length > 0 && (
                      <div className="card">
                        <h4 className="font-medium text-gray-900 mb-4">Geplande lessen:</h4>
                        <div className="space-y-2">
                          {testPlanningResult.lessons.map((lesson: any, index: number) => {
                            const studentNameParts = lesson.studentName.split(' ')
                            const firstName = studentNameParts[0]
                            const lastNameInitial = studentNameParts.length > 1 ? studentNameParts[1][0] : ''
                            const displayName = lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName
                            const lessonDate = new Date(lesson.date)
                            const shortDate = lessonDate.toLocaleDateString('nl-NL', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'long'
                            })
                            return (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-gray-900">
                                    {displayName}
                                  </span>
                                  <div className="flex items-center gap-3 text-gray-600">
                                    <span>{shortDate}</span>
                                    <span className="font-mono">{lesson.startTime} - {lesson.endTime}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Students without lessons warning */}
                    {testPlanningResult.leerlingen_zonder_les && Object.keys(testPlanningResult.leerlingen_zonder_les).length > 0 && (
                      <div className="card">
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h5 className="font-medium text-yellow-800 mb-2">Leerlingen met onvoldoende lessen:</h5>
                          <div className="text-sm text-yellow-700">
                            {Object.entries(testPlanningResult.leerlingen_zonder_les).map(([name, count]: [string, any]) => (
                              <div key={name} className="flex justify-between">
                                <span>{name}</span>
                                <span>{count as number} les(sen) tekort</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Export to lessons */}
                    <div className="card">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                          <strong>Tip:</strong> Je kunt de resultaten exporteren naar je lessen overzicht
                        </p>
                        <Link href="/dashboard/lessons" className="btn btn-primary">
                          Bekijk lessen overzicht
                        </Link>
                      </div>
                    </div>
                    
                    {/* Debug Information */}
                    <details className="card">
                      <summary className="cursor-pointer font-medium text-gray-900 mb-2">Debug: Processing Information</summary>
                      <div className="space-y-4">
                        {/* Processing Steps */}
                        {testPlanningResult.debug_info?.processing_steps && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Processing Steps:</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {testPlanningResult.debug_info.processing_steps.map((step: string, index: number) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Input Data Summary */}
                        {testPlanningResult.debug_info?.input_data_summary && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Input Data Summary:</h4>
                            <pre className="text-sm text-gray-600 overflow-auto max-h-32">
                              {JSON.stringify(testPlanningResult.debug_info.input_data_summary, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {/* Instructor Data */}
                        {testPlanningResult.debug_info?.instructor_data && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Instructor Data:</h4>
                            <pre className="text-sm text-gray-600 overflow-auto max-h-32">
                              {JSON.stringify(testPlanningResult.debug_info.instructor_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {/* Students Data */}
                        {testPlanningResult.debug_info?.students_data && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Students Data:</h4>
                            <pre className="text-sm text-gray-600 overflow-auto max-h-32">
                              {JSON.stringify(testPlanningResult.debug_info.students_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {/* Raw JSON */}
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2">Complete Raw JSON:</h4>
                          <pre className="text-sm text-gray-600 overflow-auto max-h-64">
                            {JSON.stringify(testPlanningResult, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        // Check if this is a student step
        if (currentStep.startsWith('student-')) {
          const studentId = currentStep.replace('student-', '')
          const studentIndex = students.findIndex(s => s.id === studentId)
          const student = students.find(s => s.id === studentId)
          
          if (!student || studentIndex === -1) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-500">Leerling niet gevonden</p>
              </div>
            )
          }
          
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {student.first_name} {student.last_name || ''}
                </h3>
                <p className="text-gray-600 mb-6">
                  Configureer de beschikbaarheid en instellingen voor deze leerling
                </p>
              </div>
              
              {/* Beschikbaarheid van [Leerling naam] */}
              <div className="card">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Beschikbaarheid van {student.first_name} {student.last_name || ''}
                  </label>
                  
                  <div className="space-y-4">
                    {DAY_ORDER.map((dayInfo, dayIndex) => {
                      const dayAvailability = student.availability?.[dayIndex] || {
                        day: dayInfo.day,
                        available: false,
                        startTime: '09:00',
                        endTime: '17:00',
                        startHours: '09',
                        startMinutes: '00',
                        endHours: '17',
                        endMinutes: '00'
                      }
                      
                      return (
                        <div key={dayInfo.day} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                          {/* Checkbox */}
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={dayAvailability.available}
                              onChange={(e) => handleStudentAvailabilityChange(studentIndex, dayIndex, e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label className="ml-2 text-sm font-medium text-gray-900 min-w-[80px]">
                              {dayInfo.name}
                            </label>
                          </div>
                          
                          {/* Time inputs - only show if available */}
                          {dayAvailability.available && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">Van</span>
                              
                              {/* Start time */}
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={dayAvailability.startHours}
                                  onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'startHours', e.target.value)}
                                  onBlur={(e) => handleStudentTimeBlur(studentIndex, dayIndex, 'startHours', e.target.value)}
                                  className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  style={{ width: '32px', padding: '0', margin: '0' }}
                                  maxLength={2}
                                />
                                <span className="text-sm text-gray-500"> :</span>
                                <input
                                  type="text"
                                  value={dayAvailability.startMinutes}
                                  onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'startMinutes', e.target.value)}
                                  onBlur={(e) => handleStudentTimeBlur(studentIndex, dayIndex, 'startMinutes', e.target.value)}
                                  className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  style={{ width: '32px', padding: '0', margin: '0' }}
                                  maxLength={2}
                                />
                              </div>
                              
                              <span className="text-sm text-gray-500">tot</span>
                              
                              {/* End time */}
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={dayAvailability.endHours}
                                  onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'endHours', e.target.value)}
                                  onBlur={(e) => handleStudentTimeBlur(studentIndex, dayIndex, 'endHours', e.target.value)}
                                  className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  style={{ width: '32px', padding: '0', margin: '0' }}
                                  maxLength={2}
                                />
                                <span className="text-sm text-gray-500"> :</span>
                                <input
                                  type="text"
                                  value={dayAvailability.endMinutes}
                                  onChange={(e) => handleStudentTimeChange(studentIndex, dayIndex, 'endMinutes', e.target.value)}
                                  onBlur={(e) => handleStudentTimeBlur(studentIndex, dayIndex, 'endMinutes', e.target.value)}
                                  className="h-8 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  style={{ width: '32px', padding: '0', margin: '0' }}
                                  maxLength={2}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Not available text */}
                          {!dayAvailability.available && (
                            <span className="text-sm text-gray-500 italic">
                              Niet beschikbaar
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-3">
                    Selecteer de dagen waarop deze leerling beschikbaar is en stel de tijden in. Wijzigingen worden automatisch opgeslagen.
                  </p>
                </div>
              </div>
              
              {/* Instellingen voor [Leerling naam] */}
              <div className="card">
                <div>
                  <h4 className="text-md font-semibold mb-4">
                    Instellingen voor {student.first_name} {student.last_name || ''}
                  </h4>
                  
                  <div className="space-y-4">
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
                    
                    {/* <div>
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
                    </div> */}
                    
                    {(isValueDifferentFromDefault(student, 'lessons') || isValueDifferentFromDefault(student, 'minutes')) && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => resetToDefault(student.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Reset naar standaard
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }
        
        return null
    }
  }

  // Check if can go to next step
  const canGoNext = () => {
    // For the new approach, we can always go next if we have data
    switch (currentStep) {
      case 'instructor':
        return availability.some(day => day.available)
      case 'student-details':
        return students.length > 0
      case 'settings':
        return true
      case 'test-planning':
        return true // Always allow going to next step from test planning
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

  // Generate steps for the new editable data approach
  const generateSteps = () => {
    const baseSteps = [
      { key: 'instructor', name: 'Instructeur', icon: Calendar },
      { key: 'student-details', name: 'Leerlingen', icon: Users },
      { key: 'settings', name: 'Instellingen', icon: Settings }
    ]
    
    // Add test planning step if we have an editable input path
    if (editableInputPath) {
      baseSteps.push(
        { key: 'test-planning', name: 'Test Planning', icon: Brain }
      )
    }
    
    return baseSteps
  }
  
  const steps = generateSteps()

  // Helper function to format selected week information
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Navigation */}
      <nav className="bg-white shadow-sm border-b safe-area-top flex-shrink-0">
        <div className="container-mobile">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard/lessons" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
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

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="container-mobile py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              AI-geassisteerde Planning
            </h1>
            <p className="text-gray-600">
              Laat AI je optimale lesrooster maken
            </p>
            {getSelectedWeekInfo() && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Geselecteerde week:</strong> {getSelectedWeekInfo()?.start} - {getSelectedWeekInfo()?.end}
                </p>
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="card mb-6">
            <div className="flex items-center justify-between overflow-x-auto">
              {steps.map((step, index) => {
                const StepIcon = step.icon
                const isActive = currentStep === step.key
                const isCompleted = steps.findIndex(s => s.key === currentStep) > index
                
                return (
                  <div key={step.key} className="flex items-center flex-shrink-0">
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
                    <span className={`ml-2 text-sm font-medium whitespace-nowrap ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                    {index < steps.length - 1 && (
                      <div className="mx-4 w-8 h-0.5 bg-gray-200 flex-shrink-0"></div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="card">
            {renderCurrentStep()}
          </div>
        </div>
      </div>

      {/* Fixed Navigation Footer */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="container-mobile py-4">
          <div className="flex gap-3">
            {currentStep !== 'instructor' && (
              <button
                onClick={handlePrevious}
                className="btn btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Vorige
              </button>
            )}
            
            {currentStep !== 'test-planning' && (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="btn btn-primary flex items-center gap-2 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === 'instructor' ? (
                  <>
                    Leerlingen
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : currentStep === 'student-details' ? (
                  <>
                    Instellingen
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : currentStep === 'settings' ? (
                  <>
                    Test Planning
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Volgende
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AISchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center safe-area-top">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    }>
      <AISchedulePageContent />
    </Suspense>
  )
}