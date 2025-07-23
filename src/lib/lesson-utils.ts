// Utility functies voor les berekeningen
import { supabase } from './supabase'

/**
 * Berekent het aantal lessen op basis van de lesduur en standaard lesduur
 * @param startTime Starttijd van de les (HH:MM)
 * @param endTime Eindtijd van de les (HH:MM)
 * @param defaultLessonDuration Standaard lesduur in minuten
 * @returns Aantal lessen dat deze les vertegenwoordigt
 */
export function calculateLessonCount(startTime: string, endTime: string, defaultLessonDuration: number): number {
  if (!startTime || !endTime || defaultLessonDuration <= 0) {
    return 1 // Fallback naar 1 les
  }

  // Parse tijden naar minuten sinds middernacht
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  
  if (startMinutes === -1 || endMinutes === -1 || endMinutes <= startMinutes) {
    return 1 // Fallback naar 1 les
  }

  const actualDuration = endMinutes - startMinutes
  
  // Bereken aantal lessen met een marge van 5 minuten
  // Als de duur tussen (n*defaultDuration - 5) en (n*defaultDuration + 5) ligt, tel als n lessen
  const baseCount = Math.floor(actualDuration / defaultLessonDuration)
  const remainder = actualDuration % defaultLessonDuration
  
  // Als de rest meer dan 5 minuten is, tel als extra les
  if (remainder > 5) {
    return Math.max(1, baseCount + 1)
  } else {
    return Math.max(1, baseCount)
  }
}

/**
 * Converteert een tijd string (HH:MM) naar minuten sinds middernacht
 * @param time Tijd string in HH:MM formaat
 * @returns Aantal minuten sinds middernacht, of -1 als ongeldig
 */
function parseTimeToMinutes(time: string): number {
  if (!time || typeof time !== 'string') {
    return -1
  }

  const parts = time.split(':')
  if (parts.length !== 2) {
    return -1
  }

  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return -1
  }

  return hours * 60 + minutes
}

/**
 * Haalt de standaard lesduur op voor een instructeur
 * @param instructorId ID van de instructeur
 * @returns Standaard lesduur in minuten, of 50 als fallback
 */
export async function getDefaultLessonDuration(instructorId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('standard_availability')
      .select('default_lesson_duration')
      .eq('instructor_id', instructorId)
      .single()

    if (error || !data) {
      console.warn('Could not fetch default lesson duration, using fallback of 50 minutes')
      return 50
    }

    return data.default_lesson_duration || 50
  } catch (error) {
    console.error('Error fetching default lesson duration:', error)
    return 50
  }
}

/**
 * Berekent het totale aantal lessen voor een array van lessen
 * @param lessons Array van lessen met start_time en end_time
 * @param defaultLessonDuration Standaard lesduur in minuten
 * @returns Totaal aantal lessen
 */
export function calculateTotalLessonCount(lessons: Array<{ start_time: string; end_time: string }>, defaultLessonDuration: number): number {
  return lessons.reduce((total, lesson) => {
    return total + calculateLessonCount(lesson.start_time, lesson.end_time, defaultLessonDuration)
  }, 0)
} 