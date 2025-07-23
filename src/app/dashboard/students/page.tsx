'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Users, Plus, Mail, Phone, MapPin, Calendar, MessageSquare, Edit, Trash2, Clock } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { calculateTotalLessonCount, getDefaultLessonDuration } from '@/lib/lesson-utils'

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  notes: string
  created_at: string
  lessons_count: number
  last_lesson?: string
  invite_token?: string
  default_lessons_per_week?: number
  default_lesson_duration_minutes?: number
}

interface StudentWithStats extends Student {
  lessonStats: {
    lessonsCompleted: number
    lessonsScheduled: number
  }
}

export default function StudentsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'new'>('all')
  const [deleteModalStudentId, setDeleteModalStudentId] = useState<string | null>(null)
  const [deleteModalStudentName, setDeleteModalStudentName] = useState<string>('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

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
        toast.error('Fout bij het ophalen van leerlingen')
        return
      }

      // Fetch lesson statistics for each student
      const studentsWithStats = await Promise.all(
        (data || []).map(async (student) => {
          const lessonStats = await fetchLessonStats(student.id)
          return {
            ...student,
            lessonStats
          }
        })
      )

      setStudents(studentsWithStats)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Er is iets misgegaan bij het ophalen van leerlingen.')
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchLessonStats = async (studentId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get all lessons for this student (both completed and scheduled)
      const { data: allLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('date, start_time, end_time, status')
        .eq('student_id', studentId)
        .not('status', 'eq', 'cancelled')
        .order('date', { ascending: true })

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError)
        return {
          lessonsCompleted: 0,
          lessonsScheduled: 0
        }
      }

      // Get default lesson duration for the instructor
      const defaultLessonDuration = await getDefaultLessonDuration(user?.id || '')

      // Separate completed and scheduled lessons
      const completedLessons = (allLessons || []).filter(lesson => lesson.date <= today)
      const scheduledLessons = (allLessons || []).filter(lesson => lesson.date > today)

      // Calculate lesson counts based on duration
      const completedCount = calculateTotalLessonCount(completedLessons, defaultLessonDuration)
      const scheduledCount = calculateTotalLessonCount(scheduledLessons, defaultLessonDuration)

      return {
        lessonsCompleted: completedCount,
        lessonsScheduled: scheduledCount
      }
    } catch (error) {
      console.error('Error fetching lesson statistics:', error)
      return {
        lessonsCompleted: 0,
        lessonsScheduled: 0
      }
    }
  }

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    setDeleteModalStudentId(studentId)
    setDeleteModalStudentName(studentName)
  }

  const confirmDeleteStudent = async () => {
    if (!deleteModalStudentId) return

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteModalStudentId)

      if (error) {
        console.error('Error deleting student:', error)
        toast.error('Fout bij het verwijderen van de leerling')
        return
      }

      toast.success('Leerling succesvol verwijderd!')
      setStudents(prev => prev.filter(student => student.id !== deleteModalStudentId))
      setDeleteModalStudentId(null)
      setDeleteModalStudentName('')
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Er is iets misgegaan bij het verwijderen van de leerling.')
    }
  }

  const cancelDeleteStudent = () => {
    setDeleteModalStudentId(null)
    setDeleteModalStudentName('')
  }

  useEffect(() => {
    if (user) {
      fetchStudents()
    }
  }, [user])

  // Filter students based on search term and status
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === '' || 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && student.lessonStats.lessonsCompleted > 0) ||
      (filterStatus === 'new' && student.lessonStats.lessonsCompleted === 0 && student.lessonStats.lessonsScheduled === 0)

    return matchesSearch && matchesFilter
  })

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Navigation */}
      <nav className="bg-white shadow-sm border-b safe-area-top">
        <div className="container-mobile">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Leerlingen</h1>
            </div>
            <Link href="/dashboard/students/new" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe leerling
            </Link>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-10">
        {/* Search and Filter */}
        {/* <div className="card mb-6">
          <div className="space-y-4"> */}
            {/* <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Zoek op naam of e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div> */}
            
            {/* <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle
              </button> */}
              {/* <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Actief
              </button> */}
              {/* <button
                onClick={() => setFilterStatus('new')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Nieuw
              </button> */}
            {/* </div> */}
          {/* </div>
        </div> */}
        

        {/* Students List */}
        <div className="space-y-4 pt-10">
          {loadingStudents ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Leerlingen laden...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Geen leerlingen gevonden' : 'Nog geen leerlingen'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Probeer een andere zoekterm'
                  : 'Voeg je eerste leerling toe om te beginnen'
                }
              </p>
              {!searchTerm && (
                <Link href="/dashboard/students/new" className="btn btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste leerling toevoegen
                </Link>
              )}
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {student.first_name} {student.last_name || ''}
                      </h3>
                      {student.lessonStats.lessonsCompleted === 0 && student.lessonStats.lessonsScheduled === 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          Nieuw
                        </span>
                      )}
                    </div>
                    
                    {/* <div className="space-y-1 text-sm text-gray-600"> */}
                      {/* <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{student.email}</span>
                      </div> */}
                      {/* {student.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{student.phone}</span>
                        </div>
                      )}
                      {student.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{student.address}</span>
                        </div>
                      )} */}
                    {/* </div> */}

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="h-4 w-4" />
                        <span className="whitespace-nowrap">{student.lessonStats.lessonsCompleted} gehad, {student.lessonStats.lessonsScheduled} ingepland</span>
                      </div>
                      {/* {student.last_lesson && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>Laatste les: {student.last_lesson}</span>
                        </div>
                      )} */}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/dashboard/students/${student.id}`}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteStudent(student.id, `${student.first_name} ${student.last_name || ''}`)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

<nav className="nav-mobile safe-area-bottom">
        <div className="container-mobile">
          <div className="flex justify-around">
            <Link href="/dashboard" className="nav-mobile-item">
              <Clock className="h-6 w-6" />
              <span>Dagplanning</span>
            </Link>
            <Link href="/dashboard/lessons" className="nav-mobile-item">
              <Calendar className="h-6 w-6" />
              <span>Weekplanning</span>
            </Link>
            {/* <Link href="/dashboard" className="nav-mobile-item active">
              <Home className="h-6 w-6" />
              <span>Dashboard</span>
            </Link> */}
            <Link href="/dashboard/students" className="nav-mobile-item active">
              <Users className="h-6 w-6" />
              <span>Leerlingen</span>
            </Link>
          </div>
        </div>
      </nav>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalStudentId && (
        <div className="modal-overlay" onClick={cancelDeleteStudent}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Leerling verwijderen
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Weet je zeker dat je <strong>{deleteModalStudentName}</strong> wilt verwijderen? 
                Deze actie kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteStudent}
                  className="btn btn-secondary flex-1"
                >
                  Annuleren
                </button>
                <button
                  onClick={confirmDeleteStudent}
                  className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 