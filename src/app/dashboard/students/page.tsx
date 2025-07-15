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
  X,
  ArrowLeft,
  Trash2,
  Edit
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
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Terug naar dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden md:inline">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leerlingen</h1>
            <p className="text-gray-600 mt-2">
              Beheer al je leerlingen en hun voortgang
            </p>
          </div>
          <Link
            href="/dashboard/students/new"
            className="btn btn-primary flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nieuwe leerling
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="card mb-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Zoek op naam of e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Actief
              </button>
              <button
                onClick={() => setFilterStatus('new')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Nieuw
              </button>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-4">
          {filteredStudents.length === 0 ? (
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
                      <h3 className="text-lg font-semibold text-gray-900">
                        {student.first_name} {student.last_name}
                      </h3>
                      {student.lessons_count === 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          Nieuw
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{student.email}</span>
                      </div>
                      {student.phone && (
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
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{student.lessons_count} lessen</span>
                      </div>
                      {student.last_lesson && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>Laatste les: {student.last_lesson}</span>
                        </div>
                      )}
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
                      onClick={() => handleDeleteStudent(student.id, `${student.first_name} ${student.last_name}`)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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