'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, X, Check, Copy, Link as LinkIcon, FileText, Calendar, Trash2, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import React from 'react'
import { supabase } from '@/lib/supabase'

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

interface ProgressNote {
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

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState<string>('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    default_lessons_per_week: 2,
    default_lesson_duration_minutes: 60
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string>('')
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([])
  const [newProgressNote, setNewProgressNote] = useState('')
  const [savingProgressNote, setSavingProgressNote] = useState(false)
  const [lessonStats, setLessonStats] = useState({
    lessonsCompleted: 0,
    lessonsScheduled: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  // Get params and set student ID
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setStudentId(resolvedParams.id)
    }
    getParams()
  }, [params])

  // Load student from Supabase
  useEffect(() => {
    if (!studentId) return

    const fetchStudent = async () => {
      try {
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single()

        if (error) {
          toast.error('Fout bij het ophalen van de leerling')
          router.push('/dashboard/students')
          return
        }

        if (!student) {
          toast.error('Leerling niet gevonden')
          router.push('/dashboard/students')
          return
        }

        setStudent(student)
        setFormData({
          first_name: student.first_name,
          last_name: student.last_name || '',
          email: student.email || '',
          phone: student.phone || '',
          address: student.address || '',
          notes: student.notes || '',
          default_lessons_per_week: student.default_lessons_per_week || 2,
          default_lesson_duration_minutes: student.default_lesson_duration_minutes || 60
        })
        
        // Set invitation URL if invite_token exists
        if (student.invite_token) {
          setInviteUrl(`${window.location.origin}/invite/${student.invite_token}`)
        }
      } catch (error) {
        toast.error('Fout bij het ophalen van de leerling')
        router.push('/dashboard/students')
      }
    }
    fetchStudent()
  }, [studentId, router])

  // Load progress notes from Supabase
  useEffect(() => {
    if (!studentId || !user) return

    const fetchProgressNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('progress_notes')
          .select('*')
          .eq('student_id', studentId)
          .eq('instructor_id', user.id)
          .order('date', { ascending: true })
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching progress notes:', error)
          return
        }

        // Convert progress notes to single text field format
        const notesText = data?.map(note => {
          const date = new Date(note.date)
          const formattedDate = date.toLocaleDateString('nl-NL', { 
            day: 'numeric', 
            month: 'long' 
          })
          return `${formattedDate}: ${note.notes}`
        }).join('\n') || ''

        setNewProgressNote(notesText)
        setProgressNotes(data || [])
      } catch (error) {
        console.error('Error fetching progress notes:', error)
      }
    }
    fetchProgressNotes()
  }, [studentId, user])

  // Fetch lesson statistics
  useEffect(() => {
    if (!studentId) return

    const fetchLessonStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        
        // Get completed lessons (date <= today)
        const { data: completedLessons, error: completedError } = await supabase
          .from('lessons')
          .select('id')
          .eq('student_id', studentId)
          .lte('date', today)
          .not('status', 'eq', 'cancelled')

        if (completedError) {
          console.error('Error fetching completed lessons:', completedError)
        }

        // Get scheduled lessons (date > today)
        const { data: scheduledLessons, error: scheduledError } = await supabase
          .from('lessons')
          .select('id')
          .eq('student_id', studentId)
          .gt('date', today)
          .not('status', 'eq', 'cancelled')

        if (scheduledError) {
          console.error('Error fetching scheduled lessons:', scheduledError)
        }

        setLessonStats({
          lessonsCompleted: completedLessons?.length || 0,
          lessonsScheduled: scheduledLessons?.length || 0
        })
      } catch (error) {
        console.error('Error fetching lesson statistics:', error)
      }
    }

    fetchLessonStats()
  }, [studentId])

  const handleAddProgressNote = async () => {
    if (!newProgressNote.trim() || !user || !studentId) return

    setSavingProgressNote(true)
    try {
      // Get the latest note content (last line)
      const lines = newProgressNote.trim().split('\n')
      const latestLine = lines[lines.length - 1]
      
      // Use the entire line as content, no date parsing needed
      const noteContent = latestLine.trim()
      
      if (!noteContent) {
        toast.error('Voeg een notitie toe')
        return
      }

      // Always use today's date for the database
      const noteDate = new Date()
      const dateString = noteDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('progress_notes')
        .insert({
          student_id: studentId,
          instructor_id: user.id,
          date: dateString,
          notes: noteContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error('Error adding progress note:', error)
        toast.error('Fout bij het toevoegen van de notitie')
        return
      }

      setProgressNotes(prev => [...prev, data[0]])
      toast.success('Notitie toegevoegd!')
    } catch (error) {
      console.error('Error adding progress note:', error)
      toast.error('Er is iets misgegaan bij het toevoegen van de notitie.')
    } finally {
      setSavingProgressNote(false)
    }
  }

  const handleDeleteProgressNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('progress_notes')
        .delete()
        .eq('id', noteId)

      if (error) {
        console.error('Error deleting progress note:', error)
        toast.error('Fout bij het verwijderen van de notitie')
        return
      }

      setProgressNotes(prev => prev.filter(note => note.id !== noteId))
      
      // Update the text field to reflect the deletion
      const updatedNotes = progressNotes.filter(note => note.id !== noteId)
      const notesText = updatedNotes.map(note => {
        const date = new Date(note.date)
        const formattedDate = date.toLocaleDateString('nl-NL', { 
          day: 'numeric', 
          month: 'long' 
        })
        return `${formattedDate}: ${note.notes}`
      }).join('\n')
      
      setNewProgressNote(notesText)
      toast.success('Notitie verwijderd!')
    } catch (error) {
      console.error('Error deleting progress note:', error)
      toast.error('Er is iets misgegaan bij het verwijderen van de notitie.')
    }
  }

  const handleSave = async () => {
    if (!studentId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('students')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
          default_lessons_per_week: formData.default_lessons_per_week,
          default_lesson_duration_minutes: formData.default_lesson_duration_minutes
        })
        .eq('id', studentId)

      if (error) {
        console.error('Error updating student:', error)
        toast.error('Fout bij het opslaan van de wijzigingen')
        return
      }

      // Update local state
      setStudent(prev => prev ? {
        ...prev,
        ...formData
      } : null)

      toast.success('Wijzigingen opgeslagen!')
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('Er is iets misgegaan bij het opslaan van de wijzigingen.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDeleteStudent = async () => {
    if (!studentId) return

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (error) {
        console.error('Error deleting student:', error)
        toast.error('Fout bij het verwijderen van de leerling')
        return
      }

      toast.success('Leerling succesvol verwijderd!')
      router.push('/dashboard/students')
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Er is iets misgegaan bij het verwijderen van de leerling.')
    }
  }

  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
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

  if (!user || !student) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Navigation */}
      <nav className="bg-white shadow-sm border-b safe-area-top">
        <div className="container-mobile">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard/students" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Terug naar leerlingen</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Opslaan
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-mobile py-10">
        {/* Header - Non-editable first name */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {student.first_name}
          </h1>
          <p className="text-gray-600 mt-2">
            Leerling sinds {new Date(student.created_at).toLocaleDateString('nl-NL')}
          </p>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card text-center py-4">
            <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">{lessonStats.lessonsCompleted}</div>
            <div className="text-xs text-gray-600">Voltooide lessen</div>
          </div>
          <div className="card text-center py-4">
            <Calendar className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">{lessonStats.lessonsScheduled}</div>
            <div className="text-xs text-gray-600">Geplande lessen</div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-6">
          {/* First Name - Editable */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voornaam *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Last Name */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Achternaam
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefoonnummer
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mailadres
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Address */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adres
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.address && (
                <button
                  onClick={() => openGoogleMaps(formData.address)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* General Notes */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Algemene Notities
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          {/* Progress Notes */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Voortgangsnotities</h3>
            
            <div className="space-y-4">
              <div>
                <textarea
                  value={newProgressNote}
                  onChange={(e) => setNewProgressNote(e.target.value)}
                  placeholder="Voeg notities toe...&#10;Schrijf gewoon vrije tekst&#10;Elke regel wordt een aparte notitie"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={8}
                />
                <div className="mt-2 text-sm text-gray-600">
                  <p>Schrijf gewoon vrije tekst voor je notities</p>
                  <p>Elke regel wordt een aparte notitie met de huidige datum</p>
                </div>
                <button
                  onClick={handleAddProgressNote}
                  disabled={savingProgressNote || !newProgressNote.trim()}
                  className="btn btn-primary mt-2 flex items-center gap-2"
                >
                  {savingProgressNote ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Notities opslaan
                    </>
                  )}
                </button>
              </div>

              {progressNotes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nog geen voortgangsnotities</p>
              ) : (
                <div className="space-y-3">
                  {progressNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-gray-500">
                          {new Date(note.date).toLocaleDateString('nl-NL')}
                        </span>
                        <button
                          onClick={() => handleDeleteProgressNote(note.id)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-gray-900 whitespace-pre-wrap">{note.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lesson Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Lesinstellingen</h3>
            
            <div className="space-y-4">
              <div className="mobile-grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Standaard lessen per week
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={formData.default_lessons_per_week}
                    onChange={(e) => handleInputChange('default_lessons_per_week', parseInt(e.target.value))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    value={formData.default_lesson_duration_minutes}
                    onChange={(e) => handleInputChange('default_lesson_duration_minutes', parseInt(e.target.value))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Leerling verwijderen
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Weet je zeker dat je <strong>{student.first_name} {student.last_name || ''}</strong> wilt verwijderen? 
                Deze actie kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDeleteStudent}
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