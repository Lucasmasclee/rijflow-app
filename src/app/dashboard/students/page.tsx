'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  X
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Student } from '@/types/database'

interface StudentWithStats extends Student {
  lessons_count: number
  last_lesson?: string
}

export default function StudentsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleteModalStudentId, setDeleteModalStudentId] = useState<string|null>(null)
  const [deleteModalStudentName, setDeleteModalStudentName] = useState<string>('')

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
        toast.error('Fout bij het laden van leerlingen')
        return
      }

      // Transform students to include stats (for now, we'll add these later)
      const studentsWithStats: StudentWithStats[] = (data || []).map(student => ({
        ...student,
        lessons_count: 0, // TODO: Calculate from lessons table
        last_lesson: undefined // TODO: Get from lessons table
      }))

      setStudents(studentsWithStats)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Fout bij het laden van leerlingen')
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Fetch students when user is available
  useEffect(() => {
    if (user && !loading) {
      fetchStudents()
    }
  }, [user, loading])

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'active') return matchesSearch && student.lessons_count > 0
    if (filterStatus === 'new') return matchesSearch && student.lessons_count === 0
    
    return matchesSearch
  })

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

      // Update local state
      setStudents(prev => prev.filter(student => student.id !== deleteModalStudentId))
      toast.success('Leerling succesvol verwijderd!')
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Er is iets misgegaan bij het verwijderen van de leerling.')
    }
    setDeleteModalStudentId(null)
    setDeleteModalStudentName('')
  }

  const cancelDeleteStudent = () => {
    setDeleteModalStudentId(null)
    setDeleteModalStudentName('')
  }

  if (loading || loadingStudents) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Terug naar dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leerlingen</h1>
            <p className="text-gray-600 mt-2">
              Beheer al je leerlingen en hun voortgang
            </p>
          </div>
          <Link
            href="/dashboard/students/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nieuwe leerling
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Zoek op naam of e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Alle leerlingen</option>
                <option value="active">Actieve leerlingen</option>
                <option value="new">Nieuwe leerlingen</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {student.first_name} {student.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteStudent(student.id, student.first_name)}
                    className="text-red-400 hover:text-red-600 p-1 rounded"
                    title="Leerling verwijderen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {student.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {student.address}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {student.lessons_count} lessen gevolgd
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Notes Preview */}
                  {student.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Laatste notities:</p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {student.notes.length > 100 
                          ? `${student.notes.substring(0, 100)}...` 
                          : student.notes
                        }
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/students/${student.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg text-sm font-medium"
                    >
                      Bekijk profiel
                    </Link>
                    <Link
                      href={`/dashboard/chat/${student.id}`}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen leerlingen gevonden</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Probeer een andere zoekterm' : 'Voeg je eerste leerling toe om te beginnen'}
            </p>
            {!searchTerm && (
              <Link
                href="/dashboard/students/new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Nieuwe leerling toevoegen
              </Link>
            )}
          </div>
        )}
      </div>
      {deleteModalStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-grey bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Leerling verwijderen</h2>
            <p className="mb-6">Weet je zeker dat je {deleteModalStudentName} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDeleteStudent}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Annuleren
              </button>
              <button
                onClick={confirmDeleteStudent}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 