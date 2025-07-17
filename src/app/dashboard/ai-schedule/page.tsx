'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Users, Calendar, Settings, Brain, Check, X, Clock, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Student, StudentAvailability } from '@/types/database'
import { AIScheduleLesson, AIScheduleResponse } from '@/lib/openai'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const DAY_ORDER = [
  { day: 'monday', name: 'Maandag' },
  { day: 'tuesday', name: 'Dinsdag' },
  { day: 'wednesday', name: 'Woensdag' },
  { day: 'thursday', name: 'Donderdag' },
  { day: 'friday', name: 'Vrijdag' },
  { day: 'saturday', name: 'Zaterdag' },
  { day: 'sunday', name: 'Zondag' },
]

type Step = 'instructor' | 'student-details' | 'settings' | 'prompt' | 'result' | 'selection' | `student-${string}`

interface StudentWithScheduleData extends Student {
  lessons: number
  minutes: number
  notes: string
  aiNotes: string
  availabilityNotes: string[] // Per week, komende 5 weken
  availabilityText: string // Beschikbaarheid als tekst
}

export default function AISchedulePage() {
  const { user, loading, mounted } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('instructor')
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0)
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Instructeur beschikbaarheid - geconsolideerd in één veld
  const [availability, setAvailability] = useState([
    { day: 'monday', available: true, startTime: '09:00', endTime: '17:00', availabilityText: '09:00 - 17:00' },
    { day: 'tuesday', available: true, startTime: '09:00', endTime: '17:00', availabilityText: '09:00 - 17:00' },
    { day: 'wednesday', available: true, startTime: '09:00', endTime: '17:00', availabilityText: '09:00 - 17:00' },
    { day: 'thursday', available: true, startTime: '09:00', endTime: '17:00', availabilityText: '09:00 - 17:00' },
    { day: 'friday', available: true, startTime: '09:00', endTime: '17:00', availabilityText: '09:00 - 17:00' },
    { day: 'saturday', available: false, startTime: '09:00', endTime: '17:00', availabilityText: 'Niet beschikbaar' },
    { day: 'sunday', available: false, startTime: '09:00', endTime: '17:00', availabilityText: 'Niet beschikbaar' },
  ])
  
  // Geconsolideerde beschikbaarheid tekst
  const [consolidatedAvailabilityText, setConsolidatedAvailabilityText] = useState('')
  
  // Geconsolideerde student beschikbaarheid tekst
  const [consolidatedStudentAvailabilityText, setConsolidatedStudentAvailabilityText] = useState('')

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

  // Parse consolidated availability text to update individual days
  const parseConsolidatedAvailability = (text: string) => {
    const newAvailability = [...availability]
    
    // Parse each day from the consolidated text
    DAY_ORDER.forEach(({ day, name }) => {
      // Look for patterns like "Maandag: 09:00 - 17:00" or "Maandag: Niet beschikbaar"
      const dayPattern = new RegExp(`${name}:\\s*([^,]+)`, 'i')
      const match = text.match(dayPattern)
      
      if (match) {
        const dayText = match[1].trim()
        const parsed = parseAvailabilityText(dayText)
        
        const dayIndex = newAvailability.findIndex(item => item.day === day)
        if (dayIndex !== -1) {
          newAvailability[dayIndex] = {
            ...newAvailability[dayIndex],
            available: parsed.available,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            availabilityText: dayText
          }
        }
      }
    })
    
    return newAvailability
  }

  // Parse availability text to extract times
  const parseAvailabilityText = (text: string) => {
    const trimmed = text.trim().toLowerCase()
    
    if (trimmed === 'niet beschikbaar' || trimmed === 'niet' || trimmed === 'nee' || trimmed === '') {
      return { available: false, startTime: '09:00', endTime: '17:00' }
    }
    
    // Try to parse time ranges like "09:00 - 17:00" or "9:00-17:00"
    const timeRangeMatch = trimmed.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/)
    if (timeRangeMatch) {
      const startHour = timeRangeMatch[1]
      const startMinute = timeRangeMatch[2] || '00'
      const endHour = timeRangeMatch[3]
      const endMinute = timeRangeMatch[4] || '00'
      
      return {
        available: true,
        startTime: `${startHour.padStart(2, '0')}:${startMinute}`,
        endTime: `${endHour.padStart(2, '0')}:${endMinute}`
      }
    }
    
    // Try to parse single time like "09:00" (assume 8 hour workday)
    const singleTimeMatch = trimmed.match(/(\d{1,2}):?(\d{2})?/)
    if (singleTimeMatch) {
      const hour = parseInt(singleTimeMatch[1])
      const minute = singleTimeMatch[2] || '00'
      const endHour = hour + 8
      
      return {
        available: true,
        startTime: `${hour.toString().padStart(2, '0')}:${minute}`,
        endTime: `${endHour.toString().padStart(2, '0')}:${minute}`
      }
    }
    
    // Default to available if text is provided but can't be parsed
    return { available: true, startTime: '09:00', endTime: '17:00' }
  }

  // Handle consolidated availability text change
  const handleConsolidatedAvailabilityChange = (value: string) => {
    setConsolidatedAvailabilityText(value)
    const newAvailability = parseConsolidatedAvailability(value)
    setAvailability(newAvailability)
    
    // Save instructor availability to database
    saveInstructorAvailability(newAvailability)
    
    // Reset AI prompt als beschikbaarheid wordt gewijzigd
    if (hasGeneratedPrompt) {
      setHasGeneratedPrompt(false)
      setAiPrompt('')
    }
  }

  // Save instructor availability to database
  const saveInstructorAvailability = async (availabilityData: typeof availability) => {
    if (!user) return
    
    try {
      // Convert UI format to database format
      const availabilityToSave = availabilityData.map(day => ({
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
      }
    } catch (error) {
      console.error('Error saving instructor availability:', error)
    }
  }

  // Parse consolidated student availability text to update individual students
  const parseConsolidatedStudentAvailability = (text: string) => {
    const newStudents = [...students]
    
    // Parse each student from the consolidated text
    students.forEach((student, index) => {
      const studentName = student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name
      
      // Create a pattern that matches the student name followed by availability text
      // The availability text should capture everything until the next student name or end of text
      const escapedName = studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const namePattern = new RegExp(`${escapedName}:\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z][a-z]+\\s+[A-Z][a-z]+:|$)`, 'i')
      const match = text.match(namePattern)
      
      if (match) {
        const availabilityText = match[1].trim()
        newStudents[index] = {
          ...newStudents[index],
          availabilityText,
          notes: availabilityText // Also update notes field which is used by AI prompt generation
        }
      }
    })
    
    return newStudents
  }

  // Handle consolidated student availability text change
  const handleConsolidatedStudentAvailabilityChange = (value: string) => {
    setConsolidatedStudentAvailabilityText(value)
    const newStudents = parseConsolidatedStudentAvailability(value)
    setStudents(newStudents)
    
    // Save student availability to database for changed students
    newStudents.forEach(student => {
      if (student.availabilityText) {
        saveStudentAvailability(student.id, student.availabilityText)
      }
    })
    
    // Reset AI prompt als student beschikbaarheid wordt gewijzigd
    if (hasGeneratedPrompt) {
      setHasGeneratedPrompt(false)
      setAiPrompt('')
    }
  }

  // Save student availability to database
  const saveStudentAvailability = async (studentId: string, availabilityText: string) => {
    if (!user) return
    
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
      
      console.log(`Saving availability for student ${studentId} for week ${currentWeekStart}: ${availabilityText}`)
      
      const { error } = await supabase
        .from('student_availability')
        .upsert({
          student_id: studentId,
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
        console.log(`Successfully saved availability for student ${studentId}`)
      }
    } catch (error) {
      console.error('Error saving student availability:', error)
      toast.error('Fout bij opslaan beschikbaarheid')
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
              availabilityText: day !== 'saturday' && day !== 'sunday' ? '09:00 - 17:00' : 'Niet beschikbaar'
            }))
            setAvailability(fallbackAvailability)
            
            // Update consolidated text
            const consolidatedText = fallbackAvailability.map(item => {
              const dayName = DAY_ORDER.find(d => d.day === item.day)?.name
              return `${dayName}: ${item.availabilityText}`
            }).join('\n ')
            setConsolidatedAvailabilityText(consolidatedText)
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
              const availabilityText = available ? `${startTime} - ${endTime}` : 'Niet beschikbaar'
              
              return {
                day,
                available,
                startTime,
                endTime,
                availabilityText
              }
            })
            
            setAvailability(newAvailability)
            
            // Update consolidated text
            const consolidatedText = newAvailability.map(item => {
              const dayName = DAY_ORDER.find(d => d.day === item.day)?.name
              return `${dayName}: ${item.availabilityText}`
            }).join('\n ')
            setConsolidatedAvailabilityText(consolidatedText)
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
          const availabilityText = available ? `${startTime} - ${endTime}` : 'Niet beschikbaar'
          
          return {
            day,
            available,
            startTime,
            endTime,
            availabilityText
          }
        })
        setAvailability(newAvailability)
        
        // Update consolidated text
        const consolidatedText = newAvailability.map(item => {
          const dayName = DAY_ORDER.find(d => d.day === item.day)?.name
          return `${dayName}: ${item.availabilityText}`
        }).join('\n ')
        setConsolidatedAvailabilityText(consolidatedText)
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
            const availabilityText = available ? `${startTime} - ${endTime}` : 'Niet beschikbaar'
            
            return {
              day,
              available,
              startTime,
              endTime,
              availabilityText
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
        availabilityText: day !== 'saturday' && day !== 'sunday' ? '09:00 - 17:00' : 'Niet beschikbaar'
      }))
      setAvailability(fallbackAvailability)
      
      // Update consolidated text
      const consolidatedText = fallbackAvailability.map(item => {
        const dayName = DAY_ORDER.find(d => d.day === item.day)?.name
        return `${dayName}: ${item.availabilityText}`
      }).join('\n ')
      setConsolidatedAvailabilityText(consolidatedText)
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
        availabilityText: 'Flexibel beschikbaar' // Will be updated by fetchStudentAvailability
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

        return {
          ...student,
          availabilityNotes,
          availabilityText,
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

  useEffect(() => {
    if (user && mounted) {
      fetchInstructorAvailability()
      fetchStudents()
    }
  }, [user, mounted])

  // Initialize consolidated text when availability changes
  useEffect(() => {
    if (availability.length > 0 && !consolidatedAvailabilityText) {
      const consolidatedText = availability.map(item => {
        const dayName = DAY_ORDER.find(d => d.day === item.day)?.name
        return `${dayName}: ${item.availabilityText}`
      }).join('\n')
      setConsolidatedAvailabilityText(consolidatedText)
    }
  }, [availability, consolidatedAvailabilityText])

  // Initialize consolidated student availability text when students change
  useEffect(() => {
    if (students.length > 0 && !consolidatedStudentAvailabilityText) {
      const consolidatedText = students.map(student => {
        const studentName = student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name
        return `${studentName}: ${student.availabilityText}`
      }).join('\n')
      setConsolidatedStudentAvailabilityText(consolidatedText)
    }
  }, [students, consolidatedStudentAvailabilityText])

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
        saveStudentAvailability(id, value)
      }
      
      return newStudents
    })
    
    // Reset AI prompt als leerling data wordt gewijzigd (including availability)
    if (hasGeneratedPrompt && (field === 'availabilityText' || field === 'notes' || field === 'lessons' || field === 'minutes' || field === 'aiNotes')) {
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
    
    // Reset AI prompt when default values are reset
    if (hasGeneratedPrompt) {
      setHasGeneratedPrompt(false)
      setAiPrompt('')
    }
  }

  // Navigation functions
  const handleNext = () => {
    // Check if current step is a student step
    if (currentStep.startsWith('student-')) {
      const currentStudentId = currentStep.replace('student-', '')
      const currentIndex = students.findIndex(s => s.id === currentStudentId)
      
      if (currentIndex < students.length - 1) {
        // Go to next student
        const nextStudent = students[currentIndex + 1]
        setCurrentStep(`student-${nextStudent.id}`)
      } else {
        // Go to settings after last student
        setCurrentStep('settings')
      }
    } else {
      // Handle regular steps
      const steps: Step[] = ['instructor', 'student-details', 'settings', 'prompt', 'selection', 'result']
      const currentIndex = steps.indexOf(currentStep as Step)
      
      if (currentIndex < steps.length - 1) {
        const nextStep = steps[currentIndex + 1]
        
        // If next step is student-details, go to first student instead
        if (nextStep === 'student-details' && students.length > 0) {
          setCurrentStep(`student-${students[0].id}`)
        } else {
          setCurrentStep(nextStep)
        }
      }
    }
  }

  const handlePrevious = () => {
    // Check if current step is a student step
    if (currentStep.startsWith('student-')) {
      const currentStudentId = currentStep.replace('student-', '')
      const currentIndex = students.findIndex(s => s.id === currentStudentId)
      
      if (currentIndex > 0) {
        // Go to previous student
        const previousStudent = students[currentIndex - 1]
        setCurrentStep(`student-${previousStudent.id}`)
      } else {
        // Go to instructor after first student
        setCurrentStep('instructor')
      }
    } else {
      // Handle regular steps
      const steps: Step[] = ['instructor', 'student-details', 'settings', 'prompt', 'selection', 'result']
      const currentIndex = steps.indexOf(currentStep as Step)
      
      if (currentIndex > 0) {
        const previousStep = steps[currentIndex - 1]
        
        // If previous step is student-details, go to last student instead
        if (previousStep === 'student-details' && students.length > 0) {
          const lastStudent = students[students.length - 1]
          setCurrentStep(`student-${lastStudent.id}`)
        } else {
          setCurrentStep(previousStep)
        }
        
        // Reset AI prompt als je teruggaat naar eerdere stappen
        if (previousStep !== 'prompt') {
          setHasGeneratedPrompt(false)
          setAiPrompt('')
        }
      }
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
  const generateAIPrompt = async () => {
    // Refresh student availability data from database first
    await fetchStudentAvailability(students)
    
    // Fetch the latest availability data from the database
    const availabilityData = await fetchLatestStudentAvailability()
    
    const requestData = {
      instructorAvailability: availability,
      students: students.map((student: StudentWithScheduleData) => {
        // Get the availability for this student from the database
        const studentAvailability = availabilityData.find((a: any) => a.student_id === student.id)
        // Use the availability from student_availability table, fallback to current student.notes (which should contain the availability)
        const availabilityText = studentAvailability?.notes || student.notes || 'Flexibel beschikbaar'
        
        return {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          lessons: student.lessons,
          minutes: student.minutes,
          aiNotes: student.aiNotes,
          notes: availabilityText // Use actual database availability from student_availability table
        }
      }),
      settings
    }

    // Genereer de prompt (gebruik dezelfde logica als in openai.ts)
    const { instructorAvailability: instructorAvail, students: studentsData, settings: settingsData } = requestData
    
    // Bereken de datums voor de komende week
    const today = new Date()
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Volgende maandag
    
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(nextMonday)
      date.setDate(nextMonday.getDate() + i)
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
    
    // Instructeur beschikbaarheid met datums
    const availabilityWithDates = instructorAvail
      .filter((day: any) => day.available)
      .map((day: any) => {
        const date = dayToDateMap[day.day as keyof typeof dayToDateMap]
        const dateStr = date.toLocaleDateString('nl-NL', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        })
        // Ensure time format is HH:MM
        const startTime = day.startTime.split(':').slice(0, 2).join(':')
        const endTime = day.endTime.split(':').slice(0, 2).join(':')
        return `${dateStr} (${day.day}): ${startTime} - ${endTime}`
      })
      .join('\n')

    // Leerlingen informatie
    const studentsText = studentsData.map((student: any) => {
      // Use the actual availability text from the student_availability table
      // student.notes contains the availability from the database (set by fetchStudentAvailability)
      const availabilityText = student.notes ? `\nBeschikbaarheid: ${student.notes}` : ''
      const aiNotes = student.aiNotes ? `\nAI Notities: ${student.aiNotes}` : ''
      const fullName = student.lastName ? `${student.firstName} ${student.lastName}` : student.firstName
      
      return `- ${fullName}:
  ${student.lessons} lessen van ${student.minutes} minuten per week${availabilityText}${aiNotes}`
    }).join('\n')

    // Week overzicht met datums
    const weekOverview = weekDates.map(date => {
      const dayName = date.toLocaleDateString('nl-NL', { weekday: 'long' }).toLowerCase()
      const dayKey = dayName === 'maandag' ? 'monday' :
                    dayName === 'dinsdag' ? 'tuesday' :
                    dayName === 'woensdag' ? 'wednesday' :
                    dayName === 'donderdag' ? 'thursday' :
                    dayName === 'vrijdag' ? 'friday' :
                    dayName === 'zaterdag' ? 'saturday' : 'sunday'
      
      const dayData = instructorAvail.find((d: any) => d.day === dayKey)
      const isAvailable = dayData?.available || false
      const timeRange = isAvailable && dayData ? 
        `${dayData.startTime.split(':').slice(0, 2).join(':')} - ${dayData.endTime.split(':').slice(0, 2).join(':')}` : 
        'Niet beschikbaar'
      
      return `${date.toLocaleDateString('nl-NL', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      })}: ${timeRange}`
    }).join('\n')

    // Instellingen
    const prompt = `
PLANNING VOOR DE KOMENDE WEEK (${nextMonday.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} - ${weekDates[6].toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })})

WEEK OVERZICHT:
${weekOverview}

PLANNING INSTELLINGEN:
- Locaties verbinden: ${settingsData.connectLocations ? 'Ja' : 'Nee'}
- Aantal pauzes per dag: ${settingsData.numberOfBreaks}
- Minuten per pauze: ${settingsData.minutesPerBreak}
- Minuten pauze tussen lessen: ${settingsData.minutesBreakEveryLesson}
- Pauze na elke leerling: ${settingsData.breakAfterEachStudent ? 'Ja' : 'Nee'}
${settingsData.additionalSpecifications ? `- Extra specificaties: ${settingsData.additionalSpecifications}` : ''}

KRITIEKE PLANNING REGELS:
1. Plan ALLEEN op dagen én tijden dat de instructeur beschikbaar is (zie week overzicht hierboven)
2. Plan ALLEEN op dagen én tijden dat de leerling beschikbaar is (uit hun beschikbaarheid notities)
3. Als een leerling specifieke beschikbare dagen heeft, plan dan NOOIT op andere dagen
4. Zoek naar Nederlandse en Engelse dagnamen in de notities (maandag/monday, dinsdag/tuesday, etc.)
5. Verdeel de lessen gelijkmatig over de beschikbare dagen
6. Respecteer de lesduur van elke leerling
7. Plan pauzes tussen lessen volgens de instellingen
8. Als er geen overlappende beschikbare dagen zijn, geef dan een waarschuwing

BESCHIKBARE TIJDEN PER DAG:
${availabilityWithDates}

LEERLINGEN:
${studentsText}

BELANGRIJK: Geef ALTIJD een geldig JSON object terug in exact dit formaat, zonder extra tekst ervoor of erna. Gebruik de exacte datums uit het week overzicht hierboven:

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
  "summary": "Samenvatting van het rooster voor de komende week",
  "warnings": ["Eventuele waarschuwingen"]
}

OPDRACHT: Maak een optimaal lesrooster voor de komende week op basis van bovenstaande informatie. Zorg ervoor dat alle lessen worden ingepland binnen de beschikbare tijden en dat alle regels worden gevolgd.
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
      // Refresh student availability data from database first
      await fetchStudentAvailability(students)
      
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

      // Fetch the latest availability data from the database
      const availabilityData = await fetchLatestStudentAvailability()
      
      const requestData = {
        instructorAvailability: availability,
        students: validStudents.map(student => {
          // Zorg ervoor dat alle verplichte velden aanwezig zijn
          const lessons = student.lessons || student.default_lessons_per_week || 2
          const minutes = student.minutes || student.default_lesson_duration_minutes || 60
          
          // Get the availability for this student from the database
          const studentAvailability = availabilityData.find((a: any) => a.student_id === student.id)
          // Use the availability from student_availability table, fallback to current student.notes (which should contain the availability)
          const availabilityText = studentAvailability?.notes || student.notes || 'Flexibel beschikbaar'
          
          return {
            id: student.id,
            firstName: student.first_name || '',
            lastName: student.last_name || '', // Achternaam is optioneel, kan leeg zijn
            lessons: Math.max(1, lessons), // Zorg ervoor dat het minimaal 1 is
            minutes: Math.max(30, minutes), // Zorg ervoor dat het minimaal 30 is
            aiNotes: student.aiNotes || '',
            notes: availabilityText // Use actual database availability from student_availability table
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

      // Roep de AI API aan - gebruik de bewerkte prompt als die bestaat, anders genereer een nieuwe
      const response = await fetch('/api/ai-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestData,
          customPrompt: aiPrompt // Stuur de bewerkte prompt mee als die bestaat
        })
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
                Configureer je beschikbare tijden voor de komende weken. Voer je beschikbaarheid in voor alle dagen.
              </p>
            </div>
            
            <div className="card">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschikbaarheid per dag
                </label>
                <textarea
                  value={consolidatedAvailabilityText}
                  onChange={(e) => handleConsolidatedAvailabilityChange(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Maandag: 09:00 - 17:00, Dinsdag: 09:00 - 17:00, Woensdag: 09:00 - 17:00, Donderdag: 09:00 - 17:00, Vrijdag: 09:00 - 17:00, Zaterdag: Niet beschikbaar, Zondag: Niet beschikbaar"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Voorbeelden: "Maandag: 09:00 - 17:00", "Dinsdag: Niet beschikbaar", "Woensdag: 10:00" (8 uur vanaf starttijd). Wijzigingen worden automatisch opgeslagen.
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
                Pas de lesinstellingen en beschikbaarheid aan voor elke leerling
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
                {/* Geconsolideerde beschikbaarheid */}
                <div className="card">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschikbaarheid per leerling
                    </label>
                    <textarea
                      value={consolidatedStudentAvailabilityText}
                      onChange={(e) => handleConsolidatedStudentAvailabilityChange(e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={6}
                      placeholder="Jan Jansen: Maandag, woensdag, vrijdag&#10;Piet Pietersen: Flexibel beschikbaar&#10;Anna de Vries: Alleen 's avonds"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Voorbeelden: "Jan Jansen: Maandag, woensdag, vrijdag", "Piet Pietersen: Flexibel beschikbaar", "Anna de Vries: Alleen 's avonds". Wijzigingen worden automatisch opgeslagen.
                    </p>
                  </div>
                </div>

                {/* Individuele leerling instellingen */}
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
                    onClick={() => generateAIPrompt()}
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
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full h-full min-h-[200px] text-sm text-gray-800 font-mono leading-relaxed bg-transparent border-none focus:ring-0 focus:outline-none resize-y"
                      spellCheck={false}
                    />
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
        // Check if this is a student step
        if (currentStep.startsWith('student-')) {
          const studentId = currentStep.replace('student-', '')
          const student = students.find(s => s.id === studentId)
          
          if (!student) {
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschikbaarheid van {student.first_name} {student.last_name || ''}
                  </label>
                  <textarea
                    value={student.availabilityText}
                    onChange={(e) => handleStudentChange(student.id, 'availabilityText', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Bijvoorbeeld: Maandag, woensdag, vrijdag of Flexibel beschikbaar"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Beschrijf wanneer deze leerling beschikbaar is voor lessen. Voorbeelden: "Maandag, woensdag, vrijdag", "Flexibel beschikbaar", "Alleen 's avonds". Wijzigingen worden automatisch opgeslagen.
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
                    
                    <div>
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
    // Check if current step is a student step
    if (currentStep.startsWith('student-')) {
      return true // Always allow going to next step from student step
    }
    
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

  // Generate steps dynamically to include individual student steps
  const generateSteps = () => {
    const baseSteps = [
      { key: 'instructor', name: 'Beschikbaarheid', icon: Calendar }
    ]
    
    // Add student steps
    students.forEach((student, index) => {
      baseSteps.push({
        key: `student-${student.id}`,
        name: student.first_name,
        icon: Users
      })
    })
    
    // Add remaining steps
    baseSteps.push(
      { key: 'settings', name: 'Instellingen', icon: Settings },
      { key: 'prompt', name: 'AI Planning', icon: Brain },
      { key: 'selection', name: 'Selectie', icon: Check },
      { key: 'result', name: 'Resultaat', icon: Check }
    )
    
    return baseSteps
  }
  
  const steps = generateSteps()

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
              {currentStep.startsWith('student-') && students.length > 0 ? (
                (() => {
                  const currentStudentId = currentStep.replace('student-', '')
                  const currentIndex = students.findIndex(s => s.id === currentStudentId)
                  if (currentIndex > 0) {
                    return `Vorige leerling`
                  } else {
                    return `Beschikbaarheid`
                  }
                })()
              ) : (
                `Vorige`
              )}
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
                {currentStep.startsWith('student-') && students.length > 0 ? (
                  <>
                    {(() => {
                      const currentStudentId = currentStep.replace('student-', '')
                      const currentIndex = students.findIndex(s => s.id === currentStudentId)
                      if (currentIndex < students.length - 1) {
                        return `Volgende leerling`
                      } else {
                        return `Instellingen`
                      }
                    })()}
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Volgende
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 