import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Helper functions from generate_week_planning.js
function parse_time(time_str: string): number {
  const [hours, minutes] = time_str.split(':').map(Number);
  return hours * 60 + minutes;
}

function format_time(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const minutes_remainder = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes_remainder.toString().padStart(2, '0')}`;
}

function get_next_week_dates(instructor: any): Record<string, string> {
  const week_dates: Record<string, string> = {};
  const datums = instructor.datums || [];
  const standard_week_order = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  
  for (let i = 0; i < standard_week_order.length; i++) {
    const day = standard_week_order[i];
    if (i < datums.length) {
      week_dates[day] = datums[i];
    } else {
      const today = new Date();
      const days_ahead = 7 - today.getDay();
      const next_monday = new Date(today);
      next_monday.setDate(today.getDate() + (days_ahead <= 0 ? days_ahead + 7 : days_ahead));
      const date = new Date(next_monday);
      date.setDate(next_monday.getDate() + i);
      week_dates[day] = date.toISOString().split('T')[0];
    }
  }
  
  return week_dates;
}

function check_consecutive_lessons_time(day_lessons: any[], new_lesson_start: number, new_lesson_end: number, instructor: any): boolean {
  if (day_lessons.length === 0) {
    return false;
  }
  
  const sorted_lessons = day_lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
  const consecutive_lessons = [];
  
  for (const lesson of sorted_lessons) {
    const lesson_start = parse_time(lesson.startTime);
    const lesson_end = parse_time(lesson.endTime);
    
    if (lesson_end <= new_lesson_start && 
        new_lesson_start - lesson_end < instructor.pauzeTussenLessen) {
      consecutive_lessons.push(lesson);
    } else if (new_lesson_end <= lesson_start && 
              lesson_start - new_lesson_end < instructor.pauzeTussenLessen) {
      consecutive_lessons.push(lesson);
    }
  }
  
  if (consecutive_lessons.length === 0) {
    return false;
  }
  
  const all_lessons = [...consecutive_lessons, {startTime: format_time(new_lesson_start), endTime: format_time(new_lesson_end)}];
  all_lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
  
  const total_consecutive_time = parse_time(all_lessons[all_lessons.length - 1].endTime) - parse_time(all_lessons[0].startTime);
  
  return total_consecutive_time >= 180;
}

function add_long_break_if_needed(day_lessons: any[], new_lesson_start: number, new_lesson_end: number, instructor: any): number {
  if (!check_consecutive_lessons_time(day_lessons, new_lesson_start, new_lesson_end, instructor)) {
    return new_lesson_start;
  }
  
  const sorted_lessons = day_lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
  let prev_lesson = null;
  
  for (const lesson of sorted_lessons) {
    const lesson_end = parse_time(lesson.endTime);
    if (lesson_end <= new_lesson_start) {
      prev_lesson = lesson;
    }
  }
  
  if (prev_lesson) {
    const break_start = parse_time(prev_lesson.endTime) + instructor.pauzeTussenLessen;
    const break_end = break_start + instructor.langePauzeDuur;
    return break_end + instructor.pauzeTussenLessen;
  }
  
  return new_lesson_start;
}

function can_schedule_block_hour(student_id: string, day: string, used_time_slots: any, instructor: any): boolean {
  if (!instructor.blokuren) {
    return false;
  }
  
  const day_lessons = used_time_slots[day].filter((lesson: any) => lesson.studentId === student_id);
  return day_lessons.length === 0;
}

function can_schedule_normal_hour(student_id: string, day: string, used_time_slots: any, instructor: any): boolean {
  const day_lessons = used_time_slots[day].filter((lesson: any) => lesson.studentId === student_id);
  
  if (day_lessons.length === 0) {
    return true;
  }
  
  if (!instructor.blokuren) {
    return false;
  }
  
  return false;
}

function generate_week_planning(data: any): any {
  const instructor = data.instructeur;
  const students = data.leerlingen;
  const week_dates = get_next_week_dates(instructor);
  
  const lessons: any[] = [];
  const warnings: string[] = [];
  
  // Track lessons per student
  const student_lessons: Record<string, number> = {};
  for (const student of students) {
    student_lessons[student.id] = 0;
  }
  
  // Track used time slots per day
  const used_time_slots: Record<string, any[]> = {};
  for (const day of Object.keys(week_dates)) {
    used_time_slots[day] = [];
  }
  
  // Create all possible time slots
  const all_time_slots: any[] = [];
  
  for (const [day, date] of Object.entries(week_dates)) {
    if (!(day in instructor.beschikbareUren) || 
        !instructor.beschikbareUren[day] || 
        instructor.beschikbareUren[day].length < 2) {
      continue;
    }
    
    const instructor_start = parse_time(instructor.beschikbareUren[day][0]);
    const instructor_end = parse_time(instructor.beschikbareUren[day][1]);
    
    // Create time slots every 5 minutes
    let current_time = instructor_start;
    
    while (current_time < instructor_end) {
      const available_students = [];
      
      for (const student of students) {
        if (student_lessons[student.id] < student.lessenPerWeek && 
            day in student.beschikbaarheid) {
          
          const student_start = parse_time(student.beschikbaarheid[day][0]);
          const student_end = parse_time(student.beschikbaarheid[day][1]);
          
          let can_schedule = false;
          
          if (can_schedule_block_hour(student.id, day, used_time_slots, instructor)) {
            if (student_start <= current_time && current_time + student.lesDuur <= student_end) {
              can_schedule = true;
            }
          } else if (can_schedule_normal_hour(student.id, day, used_time_slots, instructor)) {
            if (student_start <= current_time && current_time + student.lesDuur <= student_end) {
              can_schedule = true;
            }
          }
          
          if (can_schedule) {
            available_students.push(student);
          }
        }
      }
      
      if (available_students.length > 0) {
        all_time_slots.push({
          day: day,
          date: date,
          time: current_time,
          available_students: [...available_students]
        });
      }
      
      current_time += 5;
    }
  }
  
  // Sort time slots by day and time
  const day_order = {maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6, zondag: 7};
  all_time_slots.sort((a, b) => {
    const day_a = day_order[a.day as keyof typeof day_order] || 999;
    const day_b = day_order[b.day as keyof typeof day_order] || 999;
    if (day_a !== day_b) return day_a - day_b;
    return a.time - b.time;
  });
  
  // Greedy algorithm: assign lessons to time slots
  for (const slot of all_time_slots) {
    const day = slot.day;
    const date = slot.date;
    const time = slot.time;
    
    const available_students = [];
    for (const student of slot.available_students) {
      if (student_lessons[student.id] < student.lessenPerWeek) {
        let can_schedule = false;
        
        if (can_schedule_block_hour(student.id, day, used_time_slots, instructor)) {
          can_schedule = true;
        } else if (can_schedule_normal_hour(student.id, day, used_time_slots, instructor)) {
          can_schedule = true;
        }
        
        if (can_schedule) {
          available_students.push(student);
        }
      }
    }
    
    if (available_students.length > 0) {
      const selected_student = available_students.reduce((max, s) => {
        const max_block = can_schedule_block_hour(max.id, day, used_time_slots, instructor);
        const s_block = can_schedule_block_hour(s.id, day, used_time_slots, instructor);
        const max_remaining = max.lessenPerWeek - student_lessons[max.id];
        const s_remaining = s.lessenPerWeek - student_lessons[s.id];
        
        if (s_block !== max_block) return s_block ? s : max;
        if (s_remaining !== max_remaining) return s_remaining > max_remaining ? s : max;
        return s.id > max.id ? s : max;
      });
      
      let lesson_start = time;
      let lesson_end_time = time + selected_student.lesDuur;
      
      const adjusted_start = add_long_break_if_needed(used_time_slots[day], lesson_start, lesson_end_time, instructor);
      
      if (adjusted_start !== lesson_start) {
        lesson_start = adjusted_start;
        lesson_end_time = adjusted_start + selected_student.lesDuur;
      }
      
      // Check for overlaps
      let overlaps = false;
      for (const existing_lesson of used_time_slots[day]) {
        const existing_start = parse_time(existing_lesson.startTime);
        const existing_end = parse_time(existing_lesson.endTime);
        
        if (!(lesson_end_time <= existing_start || lesson_start >= existing_end)) {
          overlaps = true;
          break;
        }
      }
      
      if (!overlaps) {
        const lesson = {
          date: date,
          startTime: format_time(lesson_start),
          endTime: format_time(lesson_end_time),
          studentId: selected_student.id,
          studentName: selected_student.naam,
          notes: ""
        };
        
        lessons.push(lesson);
        used_time_slots[day].push(lesson);
        student_lessons[selected_student.id] += 1;
      }
    }
  }
  
  // Check students who didn't get their desired number of lessons
  for (const student of students) {
    if (student_lessons[student.id] < student.lessenPerWeek) {
      const missing_lessons = student.lessenPerWeek - student_lessons[student.id];
      warnings.push(`Student ${student.naam} heeft nog ${missing_lessons} les(sen) nodig`);
    }
  }
  
  // Calculate summary
  const total_required_lessons = students.reduce((sum: number, student: any) => sum + student.lessenPerWeek, 0);
  const total_planned_lessons = lessons.length;
  const summary = `Planning voor komende week: ${total_planned_lessons}/${total_required_lessons} lessen ingepland`;
  
  return {
    lessons: lessons,
    summary: summary,
    warnings: warnings
  };
}

export async function POST(request: NextRequest) {
  try {
    const { weekStart, instructorId } = await request.json()

    if (!weekStart || !instructorId) {
      return NextResponse.json(
        { error: 'weekStart and instructorId are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get instructor availability for the specific week
    const { data: instructorAvailability, error: instructorError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('week_start', weekStart)
      .single()

    if (instructorError && instructorError.code !== 'PGRST116') {
      console.error('Error fetching instructor availability:', instructorError)
      return NextResponse.json(
        { error: 'Failed to fetch instructor availability' },
        { status: 500 }
      )
    }

    // Get AI settings for the instructor
    const { data: aiSettings, error: aiSettingsError } = await supabase
      .from('instructor_ai_settings')
      .select('*')
      .eq('instructor_id', instructorId)
      .single()

    if (aiSettingsError && aiSettingsError.code !== 'PGRST116') {
      console.error('Error fetching AI settings:', aiSettingsError)
      return NextResponse.json(
        { error: 'Failed to fetch AI settings' },
        { status: 500 }
      )
    }

    // Get all students for this instructor
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('instructor_id', instructorId)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    // Get student availability for the specific week
    const { data: studentAvailability, error: studentAvailabilityError } = await supabase
      .from('student_availability')
      .select('*')
      .eq('week_start', weekStart)

    if (studentAvailabilityError) {
      console.error('Error fetching student availability:', studentAvailabilityError)
      return NextResponse.json(
        { error: 'Failed to fetch student availability' },
        { status: 500 }
      )
    }

    // Generate week dates (Monday to Sunday)
    const weekStartDate = new Date(weekStart)
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate)
      date.setDate(weekStartDate.getDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
    }

    // Build instructor availability data
    const beschikbareUren: Record<string, string[]> = {}
    
    if (instructorAvailability) {
      const availabilityData = instructorAvailability.availability_data || {}
      for (const [day, times] of Object.entries(availabilityData)) {
        if (Array.isArray(times) && times.length >= 2) {
          beschikbareUren[day] = times
        }
      }
    }

    // Build students data
    const leerlingen = []
    
    for (const student of students) {
      // Find student availability for this week
      const studentAvail = studentAvailability.find(sa => sa.student_id === student.id)
      
      const beschikbaarheid: Record<string, string[]> = {}
      
      if (studentAvail && studentAvail.availability_data) {
        for (const [day, times] of Object.entries(studentAvail.availability_data)) {
          if (Array.isArray(times) && times.length >= 2) {
            beschikbaarheid[day] = times
          }
        }
      }

      leerlingen.push({
        id: student.id,
        naam: student.last_name ? `${student.first_name} ${student.last_name}` : student.first_name,
        lessenPerWeek: student.default_lessons_per_week || 2,
        lesDuur: student.default_lesson_duration_minutes || 60,
        beschikbaarheid
      })
    }

    // Create the sample input structure
    const sampleInput = {
      instructeur: {
        beschikbareUren,
        datums: weekDates,
        blokuren: aiSettings?.blokuren ?? true,
        pauzeTussenLessen: aiSettings?.pauze_tussen_lessen ?? 10,
        langePauzeDuur: aiSettings?.lange_pauze_duur ?? 0,
        locatiesKoppelen: aiSettings?.locaties_koppelen ?? true
      },
      leerlingen
    }

    // Generate the planning using the integrated logic
    const planningResult = generate_week_planning(sampleInput)

    // Print the entire file for debugging
    console.log('Generated planning:')
    console.log(JSON.stringify(planningResult, null, 2))

    return NextResponse.json({
      success: true,
      data: planningResult,
      message: 'Week planning generated successfully'
    })

  } catch (error) {
    console.error('Error generating planning:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 