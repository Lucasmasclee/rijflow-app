'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Car, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ClientOnly from '@/components/ClientOnly'
import PasswordInput from '@/components/PasswordInput'
import { createSupabaseClient } from '@/lib/supabase'

const supabase = createSupabaseClient()

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function SignInPage() {
  const { signIn, mounted } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Attempting to sign in...')
      await signIn(formData.email, formData.password)
      console.log('Sign in successful, showing toast...')
      toast.success('Succesvol ingelogd!')
      
      console.log('Redirecting to dashboard...')
      // Simple redirect to dashboard - let middleware handle subscription creation and routing
      router.push('/dashboard')
      
      // Add a fallback redirect after a delay
      setTimeout(() => {
        console.log('Fallback redirect...')
        window.location.href = '/dashboard'
      }, 2000)
    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error.message || 'Inloggen mislukt. Controleer je gegevens.')
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Inloggen</h2>
            <p className="mt-2 text-sm text-gray-600">
              Welkom terug bij RijFlow
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Inloggen</h2>
          <p className="mt-2 text-sm text-gray-600">
            Welkom terug bij RijFlow
          </p>
        </div>

        <ClientOnly delay={100}>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
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
                    placeholder="Je wachtwoord"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-900 whitespace-nowrap">Onthoud mij</label>
              </div>

              <div className="text-sm">
                <span className="font-medium text-gray-400">
                  Wachtwoord vergeten? Neem contact op met support
                </span>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Inloggen...' : 'Inloggen'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Nog geen account?{' '}
                <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                  Maak een account aan
                </Link>
              </p>
            </div>
          </form>
        </ClientOnly>
      </div>
    </div>
  )
} 