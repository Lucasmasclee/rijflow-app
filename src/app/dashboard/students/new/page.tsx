'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Copy, Send } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

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

  if (inviteToken) {
    const inviteUrl = `${window.location.origin}/invite/${inviteToken}`
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <nav className="bg-white shadow-sm border-b safe-area-top">
          <div className="container-mobile">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/dashboard/students" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Terug naar leerlingen</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="container-mobile py-6">
          <div className="card text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <User className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-4">Leerling toegevoegd!</h2>
            <p className="mb-6 text-gray-600">Stuur deze uitnodigingslink naar de leerling:</p>
            
            <div className="mb-6">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center font-mono text-sm bg-gray-50"
                onFocus={e => e.target.select()}
              />
            </div>
            
            <div className="space-y-3">
              <button
                className="btn btn-primary w-full flex items-center justify-center gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl)
                  toast.success('Link gekopieerd!')
                }}
              >
                <Copy className="h-4 w-4" />
                Kopieer link
              </button>
              
              {formData.email && (
                <a
                  className="btn bg-green-600 hover:bg-green-700 text-white w-full flex items-center justify-center gap-2"
                  href={`mailto:${formData.email}?subject=Uitnodiging RijFlow&body=Klik op deze link om je account te activeren: ${inviteUrl}`}
                >
                  <Send className="h-4 w-4" />
                  Verstuur e-mail
                </a>
              )}
              
              {formData.phone && (
                <a
                  className="btn bg-purple-600 hover:bg-purple-700 text-white w-full flex items-center justify-center gap-2"
                  href={`sms:${formData.phone}?body=Je bent uitgenodigd voor RijFlow! Klik op deze link om je account te activeren: ${inviteUrl}`}
                >
                  <Send className="h-4 w-4" />
                  Verstuur sms
                </a>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link href="/dashboard/students" className="text-blue-600 hover:text-blue-700 font-medium">
                Terug naar leerlingenoverzicht
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
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
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nieuwe leerling toevoegen</h1>
          <p className="text-gray-600 mt-2">
            Voeg een nieuwe leerling toe aan je rijschool
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Persoonlijke gegevens
              </h2>
              
              <div className="space-y-4">
                <div className="mobile-grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Voornaam *
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      required
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Voornaam"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Achternaam
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Achternaam"
                    />
                  </div>
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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@voorbeeld.nl"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Telefoonnummer
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="06 12345678"
                  />
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Adres
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Straatnaam 123, 1234 AB Stad"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Notities
              </h2>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Algemene notities
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Optionele notities over de leerling..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Leerling toevoegen...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Leerling toevoegen
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 