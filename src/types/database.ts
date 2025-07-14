export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  role: 'instructor' | 'student'
}

export interface Instructeur {
  id: string
  name: string
  location: string
  kvk_number: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  notes?: string
  instructor_id: string
  instructeur_id: string
  invite_token?: string
  user_id?: string
  default_lessons_per_week?: number
  default_lesson_duration_minutes?: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  date: string
  start_time: string
  end_time: string
  student_id: string
  instructor_id: string
  status: 'scheduled' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
}

export interface ProgressNote {
  id: string
  student_id: string
  instructor_id: string
  lesson_id?: string
  date: string
  notes: string
  topics_covered?: string[]
  created_at: string
  updated_at: string
}

export interface StudentWithProgressNotes extends Student {
  progress_notes?: ProgressNote[]
}

export interface ChatMessage {
  id: string
  student_id: string
  instructor_id: string
  message: string
  sender_role: 'instructor' | 'student'
  created_at: string
}

export interface Availability {
  id: string
  student_id: string
  day_of_week: number // 0-6 (Sunday-Saturday)
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

export interface InstructorAvailability {
  id: string
  instructor_id: string
  day_of_week: number // 0-6 (Sunday-Saturday)
  available: boolean
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
} 