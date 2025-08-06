export interface User {
  id: string
  email?: string
  created_at?: string
  updated_at?: string
  role?: 'instructor' | 'student'
  user_metadata?: {
    role?: 'instructor' | 'student'
    student_id?: string
    [key: string]: any
  }
}

export interface Instructeur {
  id: string
  email: string
  rijschoolnaam: string
  location?: string
  kvk_number?: string
  logo_url?: string
  abonnement?: 'no_subscription' | 'basic-monthly' | 'basic-yearly' | 'premium-monthly' | 'premium-yearly'
  start_free_trial?: string
  subscription_status?: 'active' | 'inactive'
  stripe_customer_id?: string
  subscription_id?: string
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
  public_token?: string
  sms_laatst_gestuurd?: string
  public_url?: string
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
  lessen_geregistreerd: number
  created_at: string
  updated_at: string
}

export interface ProgressNote {
  id: string
  student_id: string
  instructor_id: string
  notes: string
  created_at: string
  updated_at: string
}

export interface StudentWithProgressNotes extends Student {
  progress_notes?: ProgressNote
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

export interface StudentAvailability {
  id: string
  student_id: string
  week_start: string // YYYY-MM-DD format
  notes?: string
  created_at: string
  updated_at: string
}

// Nieuwe interfaces voor het herstructureerde systeem
export interface NewStudentAvailability {
  id: string
  student_id: string
  week_start: string // YYYY-MM-DD format
  availability_data: Record<string, string[]> // { "maandag": ["09:00", "17:00"], ... }
  created_at: string
  updated_at: string
}

export interface NewInstructorAvailability {
  id: string
  instructor_id: string
  week_start: string // YYYY-MM-DD format
  availability_data: Record<string, string[]> // { "maandag": ["09:00", "17:00"], ... }
  settings: {
    maxLessenPerDag?: number
    blokuren?: boolean
    pauzeTussenLessen?: number
    langePauzeDuur?: number
    locatiesKoppelen?: boolean
  }
  created_at: string
  updated_at: string
}

// Interface voor AI weekplanning data
export interface AIWeekplanningData {
  instructeur: {
    beschikbareUren: Record<string, string[]>
    datums: string[]
    maxLessenPerDag: number
    blokuren: boolean
    pauzeTussenLessen: number
    langePauzeDuur: number
    locatiesKoppelen: boolean
  }
  leerlingen: Array<{
    id: string
    naam: string
    lessenPerWeek: number
    lesDuur: number
    beschikbaarheid: Record<string, string[]>
  }>
}

export interface InstructorAISettings {
  id: string
  instructor_id: string
  pauze_tussen_lessen: number
  lange_pauze_duur: number
  locaties_koppelen: boolean
  blokuren: boolean
  created_at: string
  updated_at: string
}

// Interface voor standaard beschikbaarheid van instructeurs
export interface StandardAvailability {
  id: string
  instructor_id: string
  availability_data: Record<string, string[]> // { "maandag": ["09:00", "17:00"], ... }
  default_lesson_duration: number // Standaard lesduur in minuten
  created_at: string
  updated_at: string
}

// Interface voor week-specifieke beschikbaarheid links
export interface AvailabilityLink {
  id: string
  student_id: string
  week_start: string // YYYY-MM-DD format
  token: string // unieke token voor de link
  created_at: string
  expires_at: string
} 