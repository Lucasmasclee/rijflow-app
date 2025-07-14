'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Edit2, X, Check, Copy, Link as LinkIcon, FileText } from 'lucide-react'
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

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState<string>('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string>('')
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([])
  const [newProgressNote, setNewProgressNote] = useState('')
  const [savingProgressNote, setSavingProgressNote] = useState(false)

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
          last_name: student.last_name,
          email: student.email,
          phone: student.phone,
          address: student.address,
          notes: student.notes || ''
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
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching progress notes:', error)
          return
        }

        setProgressNotes(data || [])
      } catch (error) {
        console.error('Error fetching progress notes:', error)
      }
    }
    fetchProgressNotes()
  }, [studentId, user])

  const handleAddProgressNote = async () => {
    if (!newProgressNote.trim() || !user || !studentId) return

    setSavingProgressNote(true)
    try {
      const { data, error } = await supabase
        .from('progress_notes')
        .insert({
          student_id: studentId,
          instructor_id: user.id,
          date: new Date().toISOString().split('T')[0],
          notes: newProgressNote.trim()
        })
        .select()

      if (error) {
        toast.error('Fout bij het toevoegen van voortgangsnotitie')
        return
      }

      if (data) {
        setProgressNotes(prev => [data[0], ...prev])
        setNewProgressNote('')
        toast.success('Voortgangsnotitie toegevoegd!')
      }
    } catch (error) {
      toast.error('Fout bij het toevoegen van voortgangsnotitie')
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
        toast.error('Fout bij het verwijderen van voortgangsnotitie')
        return
      }

      setProgressNotes(prev => prev.filter(note => note.id !== noteId))
      toast.success('Voortgangsnotitie verwijderd!')
    } catch (error) {
      toast.error('Fout bij het verwijderen van voortgangsnotitie')
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form data to original values
    if (student) {
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        phone: student.phone,
        address: student.address,
        notes: student.notes
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update student in Supabase
      const { error } = await supabase
        .from('students')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes
        })
        .eq('id', studentId)

      if (error) {
        toast.error('Fout bij het bijwerken van de leerling')
        setSaving(false)
        return
      }

      setStudent(prev => prev ? { ...prev, ...formData } : null)
      setIsEditing(false)
      toast.success('Leerling succesvol bijgewerkt!')
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      toast.error('Er is iets misgegaan bij het bijwerken van de leerling.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDeleteStudent = async () => {
    setShowDeleteModal(false)
    try {
      // Delete student from Supabase
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (error) {
        toast.error('Fout bij het verwijderen van de leerling')
        return
      }

      toast.success('Leerling succesvol verwijderd!')
      router.push('/dashboard/students')
    } catch (error) {
      toast.error('Er is iets misgegaan bij het verwijderen van de leerling.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard/students" className="text-gray-600 hover:text-gray-900 flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Terug naar leerlingen
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Bewerken
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Annuleren
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {saving ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-gray-600 mt-2">
            Leerling profiel en voortgang
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Persoonlijke gegevens
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voornaam
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{student.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Achternaam
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{student.last_name}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Contactgegevens
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mailadres
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{student.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefoonnummer
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{student.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Adres
                </h2>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volledig adres
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{student.address}</p>
                )}
              </div>
            </div>

            {/* General Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Algemene notities
                </h2>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Algemene notities over {student.first_name}
                </label>
                {isEditing ? (
                  <textarea
                    rows={6}
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Algemene informatie over de leerling, persoonlijke voorkeuren, bijzonderheden, etc..."
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{student.notes || 'Geen algemene notities toegevoegd.'}</p>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Deze notities zijn alleen zichtbaar in het leerlingprofiel en worden getoond bij uitgeklapte lessen.
                </p>
              </div>
            </div>

            {/* Progress Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Voortgangsnotities
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Add new progress note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nieuwe voortgangsnotitie toevoegen
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={3}
                      value={newProgressNote}
                      onChange={(e) => setNewProgressNote(e.target.value)}
                      placeholder="Voeg een nieuwe voortgangsnotitie toe..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleAddProgressNote}
                      disabled={savingProgressNote || !newProgressNote.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {savingProgressNote ? 'Toevoegen...' : 'Toevoegen'}
                    </button>
                  </div>
                </div>

                {/* Progress notes list */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Eerdere voortgangsnotities</h3>
                  {progressNotes.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nog geen voortgangsnotities toegevoegd.</p>
                  ) : (
                    <div className="space-y-3">
                      {progressNotes.map((note) => (
                        <div key={note.id} className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-500">
                              {new Date(note.date).toLocaleDateString('nl-NL')}
                            </span>
                            <button
                              onClick={() => handleDeleteProgressNote(note.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              title="Verwijder notitie"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-gray-900 whitespace-pre-wrap text-sm">{note.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Voortgangsnotities zijn zichtbaar en bewerkbaar in het leerlingprofiel en bij uitgeklapte lessen.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistieken</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Totaal lessen</p>
                  <p className="text-2xl font-bold text-gray-900">{student.lessons_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Laatste les</p>
                  <p className="text-gray-900">{student.last_lesson ? new Date(student.last_lesson).toLocaleDateString('nl-NL') : 'Nog geen lessen'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lid sinds</p>
                  <p className="text-gray-900">{new Date(student.created_at).toLocaleDateString('nl-NL')}</p>
                </div>
              </div>
            </div>

            {/* Invitation Link */}
            {inviteUrl && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <LinkIcon className="h-5 w-5 mr-2" />
                  Uitnodigingslink
                </h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">Uitnodigingslink voor deze leerling:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1 font-mono"
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteUrl);
                          toast.success('Link gekopieerd!');
                        }}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                      >
                        <Copy className="h-3 w-3" />
                        Kopieer
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${student.email}?subject=Uitnodiging RijFlow&body=Klik op deze link om je account te activeren: ${inviteUrl}`}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 px-3 rounded text-xs font-medium"
                    >
                      Verstuur e-mail
                    </a>
                    <a
                      href={`sms:${student.phone}?body=Je bent uitgenodigd voor RijFlow! Klik op deze link om je account te activeren: ${inviteUrl}`}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-center py-2 px-3 rounded text-xs font-medium"
                    >
                      Verstuur SMS
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Snelle acties</h3>
              <div className="space-y-3">
                <Link
                  href={`/dashboard/lessons/new?student=${student.id}`}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg text-sm font-medium"
                >
                  Les plannen
                </Link>
                <Link
                  href={`/dashboard/chat/${student.id}`}
                  className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded-lg text-sm font-medium"
                >
                  Bericht sturen
                </Link>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="block w-full bg-red-600 hover:bg-red-700 text-white text-center py-2 px-4 rounded-lg text-sm font-medium"
                >
                  Leerling verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center  bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Leerling verwijderen</h2>
            <p className="mb-6">Weet je zeker dat je deze leerling wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteStudent}
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