'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import { 
  Calendar, 
  Users, 
  FileText, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Star,
  Car,
  Menu,
  X
} from 'lucide-react'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function HomePage() {
  const { user } = useAuth() || { user: null }
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleGetStarted = () => {
    if (email) {
      // In a real app, you'd collect this email for marketing
      router.push('/auth/signup')
    } else {
      router.push('/auth/signup')
    }
  }

  if (user) {
    router.push('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Mobile Navigation */}
      <nav className="bg-white shadow-sm safe-area-top">
        <div className="container-mobile">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center">
              <Car className="h-6 w-6 text-blue-600" />
              <span className="ml-1.5 text-base font-bold text-gray-900">RijFlow</span>
            </div>
            
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => router.push('/auth/signin')}
                className="btn btn-secondary"
                style={{ padding: '9px 18px', fontSize: '12px', minHeight: '33px' }}
              >
                Inloggen
              </button>
              <button
                onClick={() => router.push('/auth/signup')}
                className="btn btn-primary"
                style={{ padding: '9px 18px', fontSize: '12px', minHeight: '33px' }}
              >
                Registreren
              </button>
            </div>
          </div>
        </div>
      </nav>
      {/* Features Section */}
      <div className="bg-gray-50 py-12 md:py-20">
        <div className="container-mobile">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-mobile-xl md:text-3xl font-bold text-gray-900 mb-4">
              Alles wat je nodig hebt in één app
            </h2>
            <p className="text-mobile-lg md:text-xl text-gray-600">
              Gemaakt door een leerling, die voor zijn instructeur deze tool heeft gemaakt.
            </p>
          </div>

          <div className="mobile-grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="card" style={{ padding: '11px', marginBottom: '11px' }}>
              <div className="flex items-center mb-3">
                <Calendar className="h-8 w-8 text-blue-600 mr-2" />
                <h3 className="text-sm md:text-base font-semibold text-gray-900">AI Weekplanning</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Laat AI je optimale weekplanning maken op basis van beschikbaarheid en voorkeuren.
              </p>
            </div>

            <div className="card" style={{ padding: '11px', marginBottom: '11px' }}>
              <div className="flex items-center mb-3">
                <Users className="h-8 w-8 text-blue-600 mr-2" />
                <h3 className="text-sm md:text-base font-semibold text-gray-900">Dagplanning</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Overzichtelijke dagplanning met alle lessen, locaties en leerlingen.
              </p>
            </div>

            <div className="card" style={{ padding: '11px', marginBottom: '11px' }}>
              <div className="flex items-center mb-3">
                <FileText className="h-8 w-8 text-blue-600 mr-2" />
                <h3 className="text-sm md:text-base font-semibold text-gray-900">Weekplanning</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Plan je hele week vooruit met een duidelijk weekoverzicht van alle lessen.
              </p>
            </div>

            <div className="card" style={{ padding: '11px', marginBottom: '11px' }}>
              <div className="flex items-center mb-3">
                <MessageSquare className="h-8 w-8 text-blue-600 mr-2" />
                <h3 className="text-sm md:text-base font-semibold text-gray-900">Leerlingbeheer</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Beheer al je leerlingen, hun gegevens en lespakketten op één centrale plek.
              </p>
            </div>

            <div className="card" style={{ padding: '11px', marginBottom: '11px' }}>
              <div className="flex items-center mb-3">
                <Clock className="h-8 w-8 text-blue-600 mr-2" />
                <h3 className="text-sm md:text-base font-semibold text-gray-900">Voortgang bijhouden</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Houd de voortgang van je leerlingen bij en zie hun ontwikkeling over tijd.
              </p>
            </div>

            <div className="card" style={{ padding: '11px', marginBottom: '11px' }}>
              <div className="flex items-center mb-3">
                <CheckCircle className="h-8 w-8 text-blue-600 mr-2" />
                <h3 className="text-sm md:text-base font-semibold text-gray-900">Urenregistratie</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Automatische urenregistratie voor een complete administratie van je werkuren.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* App Store Section */}
      <div className="bg-white py-12 md:py-16">
        <div className="container-mobile text-center">
          <h2 className="text-mobile-xl md:text-3xl font-bold text-gray-900 mb-4">
            Download de app
          </h2>
          <p className="text-mobile-lg md:text-xl text-gray-600 mb-8">
            Download RijFlow in de Appstores.
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-row items-center gap-2">
              {/* Google Play Button */}
              <a
                href="https://play.google.com/store/apps/details?id=com.Mascelli.RijlesPlanner"
                className="inline-block"
              >
                <Image 
                  src="/playstoreknop.png"
                  alt="Get it on Google Play"
                  width={168}
                  height={56}
                  className="h-14 w-auto"
                />
              </a>

              {/* App Store Button */}
              <a
                href="https://apps.apple.com/us/app/optimalfitness-workout-diet/id6742567522"
                className="inline-block"
              >
                <Image
                  src="/appstoreknop.png" 
                  alt="Download on App Store"
                  width={168}
                  height={56}
                  className="h-17.5 w-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-6 md:py-10">
        <div className="container-mobile text-center">
          <h2 className="text-mobile-xl md:text-3xl font-bold text-white mb-4">
            Klaar om te beginnen?
          </h2>
          <p className="text-mobile-lg md:text-xl text-blue-100 mb-8">
            Deze tool is nog in ontwikkeling, en om die reden volledig gratis.
          </p>
          <button
            onClick={() => router.push('/auth/signup')}
            className="btn bg-white hover:bg-gray-100 text-blue-600 text-lg btn-mobile-full md:w-auto"
          >
            Registreren
          </button>
        </div>
      </div>

      

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 safe-area-bottom">
        <div className="container-mobile">
          <div className="mobile-grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Car className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">RijFlow</span>
              </div>
              <p className="text-gray-400">
                De slimme cockpit voor moderne rijinstructeurs
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Functies</li>
                <li>Prijzen</li>
                <li>Demo</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Help</li>
                <li>Contact</li>
                <li>Documentatie</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Bedrijf</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Over ons</li>
                <li>Blog</li>
                <li>Privacy</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 RijFlow. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>
    </div>
    
    
  )
}
