'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Car, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ClientOnly from '@/components/ClientOnly'
import PasswordInput from '@/components/PasswordInput'

export default function SignUpPage() {
  const { signUp, mounted } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'instructor' as 'instructor' | 'student'
  })
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signUp(formData.email, formData.password, formData.role)
      setEmailSent(true)
      toast.success('Account aangemaakt! Controleer je e-mail om je account te bevestigen.')
    } catch (error: any) {
      toast.error(error.message || 'Er is iets misgegaan bij het aanmaken van je account.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state until component is mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center mb-8">
              <Car className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">RijFlow</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Account aanmaken</h2>
            <p className="mt-2 text-sm text-gray-600">
              Start je gratis proefperiode van 30 dagen
            </p>
          </div>
          <div className="card text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Laden...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center mb-8">
            <Car className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-2xl font-bold text-gray-900">RijFlow</span>
          </Link>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Account aanmaken</h2>
          <p className="mt-2 text-sm text-gray-600">
            Start je gratis proefperiode van 30 dagen
          </p>
        </div>

        <ClientOnly delay={100}>
          {emailSent ? (
            <div className="card text-center">
              <div className="text-2xl mb-2">📧</div>
              <h3 className="text-lg font-semibold mb-2">Bevestig je e-mailadres</h3>
              <p className="text-gray-700 mb-4">
                We hebben een bevestigingsmail gestuurd naar <span className="font-semibold">{formData.email}</span>.<br />
                Klik op de link in de e-mail om je account te activeren.
              </p>
              <p className="text-gray-500 text-sm">
                Geen e-mail ontvangen? Controleer je spamfolder of probeer het opnieuw.
              </p>
              <Link href="/auth/signin" className="mt-4 inline-block text-blue-600 hover:underline font-medium">
                Naar inloggen
              </Link>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Ik ben een...
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'instructor' })}
                      className={`p-4 border-2 rounded-lg text-center transition-colors min-h-[80px] flex flex-col items-center justify-center ${
                        formData.role === 'instructor'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-medium">Rijinstructeur</div>
                      <div className="text-xs text-gray-500 mt-1">Ik geef rijles</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'student' })}
                      className={`p-4 border-2 rounded-lg text-center transition-colors min-h-[80px] flex flex-col items-center justify-center ${
                        formData.role === 'student'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-medium">Leerling</div>
                      <div className="text-xs text-gray-500 mt-1">Ik volg rijles</div>
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-mailadres
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="jouw@email.nl"
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Wachtwoord
                  </label>
                  <div>
                    <PasswordInput
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimaal 6 karakters"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? 'Account aanmaken...' : 'Account aanmaken'}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Heb je al een account?{' '}
                  <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
                    Log in
                  </Link>
                </p>
              </div>
            </form>
          )}
        </ClientOnly>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-500">
                Door je aan te melden ga je akkoord met onze
              </span>
            </div>
          </div>
          <div className="text-center mt-2">
            <Link href="/terms" className="text-sm text-blue-600 hover:text-blue-500">
              Algemene voorwaarden
            </Link>
            {' en '}
            <Link href="/privacy" className="text-sm text-blue-600 hover:text-blue-500">
              Privacybeleid
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 