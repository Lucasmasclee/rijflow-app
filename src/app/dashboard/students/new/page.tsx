'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Save, User, Mail, Phone, MapPin } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid';

export default function NewStudentPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
    if (user) {
      // Test database connectivity
      testDatabaseConnection()
    }
  }, [user, loading, router])

  const testDatabaseConnection = async () => {
    console.log('Testing database connection...')
    
    try {
      // Test 1: Check if we can access the students table
      const { data: tableTest, error: tableError } = await supabase
        .from('students')
        .select('count')
        .limit(1)
      
      console.log('Table access test:', { tableTest, tableError })
      
      // Test 2: Check table structure
      const { data: structureTest, error: structureError } = await supabase
        .from('students')
        .select('*')
        .limit(1)
      
      console.log('Table structure test:', { structureTest, structureError })
      
      // Test 3: Check if we can insert (without actually inserting)
      if (user) {
        console.log('Current user:', user)
        console.log('User ID:', user.id)
      }
      
    } catch (error) {
      console.error('Database connection test failed:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!user) {
        toast.error('Je bent niet ingelogd')
        return
      }

      console.log('Creating student with user ID:', user.id)

      // Genereer unieke invite_token
      const invite_token = uuidv4();
      console.log('Generated invite token:', invite_token)
      
      // Create new student object for database
      const newStudent = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        instructor_id: user.id,
        invite_token
      }

      console.log('Attempting to insert student:', newStudent)

      const { data, error } = await supabase
        .from('students')
        .insert([newStudent])
        .select()

      // Log de volledige response voor debuggen
      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Error creating student:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        toast.error(`Fout bij het toevoegen van de leerling: ${error.message}`)
        return
      }

      console.log('Student created successfully:', data)
      
      // Verify the student was actually saved by fetching it back
      const { data: verifyData, error: verifyError } = await supabase
        .from('students')
        .select('*')
        .eq('invite_token', invite_token)
        .single()
      
      if (verifyError) {
        console.error('Verification error:', verifyError)
        toast.error('Leerling toegevoegd, maar er was een probleem met de verificatie.')
      } else {
        console.log('Student verified in database:', verifyData)
        toast.success('Leerling succesvol toegevoegd!')
      }
      
      setInviteToken(invite_token)
      // router.push('/dashboard/students') // Niet direct redirecten
    } catch (error) {
      console.error('Error creating student:', error)
      toast.error('Er is iets misgegaan bij het toevoegen van de leerling.')
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

  if (!user) {
    return null
  }

  if (inviteToken) {
    const inviteUrl = `${window.location.origin}/invite/${inviteToken}`
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Leerling toegevoegd!</h2>
        <p className="mb-4">Stuur deze uitnodigingslink naar de leerling:</p>
        <div className="mb-4">
          <input
            type="text"
            value={inviteUrl}
            readOnly
            className="w-full px-3 py-2 border rounded text-center font-mono"
            onFocus={e => e.target.select()}
          />
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
          onClick={() => {navigator.clipboard.writeText(inviteUrl); toast.success('Link gekopieerd!')}}
        >
          Kopieer link
        </button>
        <a
          className="bg-green-600 text-white px-4 py-2 rounded mr-2"
          href={`mailto:${formData.email}?subject=Uitnodiging RijFlow&body=Klik op deze link om je account te activeren: ${inviteUrl}`}
        >
          Verstuur e-mail
        </a>
        <a
          className="bg-purple-600 text-white px-4 py-2 rounded"
          href={`sms:${formData.phone}?body=Je bent uitgenodigd voor RijFlow! Klik op deze link om je account te activeren: ${inviteUrl}`}
        >
          Verstuur sms
        </a>
        <div className="mt-8">
          <Link href="/dashboard/students" className="text-blue-700 underline">Terug naar leerlingenoverzicht</Link>
        </div>
      </div>
    )
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
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nieuwe leerling toevoegen</h1>
          <p className="text-gray-600 mt-2">
            Voeg een nieuwe leerling toe aan je rijschool
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Persoonlijke gegevens
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Voornaam *
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    required
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jan"
                  />
                </div>
                
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Achternaam
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jansen"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Contactgegevens
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="jan.jansen@email.nl"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefoonnummer
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="06-12345678"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Adres
              </h2>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Volledig adres
                </label>
                <textarea
                  id="address"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Hoofdstraat 1, 1234 AB Amsterdam"
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Notities
              </h2>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Voortgang en notities
              </label>
              <textarea
                id="notes"
                rows={6}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Houd hier de voortgang van de leerling bij, belangrijke opmerkingen, sterke punten, verbeterpunten, etc..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Gebruik dit veld om de voortgang van de leerling bij te houden. Je kunt dit later altijd bewerken.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/dashboard/students"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Opslaan...' : 'Leerling toevoegen'}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Tips voor het toevoegen van leerlingen</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Alleen de voornaam is verplicht - alle andere velden zijn optioneel</li>
            <li>• Je kunt later altijd meer informatie toevoegen aan het leerlingprofiel</li>
            <li>• Het e-mailadres wordt gebruikt voor communicatie en inloggen</li>
            <li>• Na het toevoegen kun je direct lessen plannen voor deze leerling</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 