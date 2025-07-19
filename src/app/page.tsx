'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">RijFlow</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => router.push('/auth/signin')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Inloggen
              </button>
              <button
                onClick={() => router.push('/auth/signup')}
                className="btn btn-primary"
              >
                Registreren
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="container-mobile py-4 space-y-4">
              <button
                onClick={() => {
                  router.push('/auth/signin')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left text-gray-600 hover:text-gray-900 py-2 px-3 rounded-md text-base font-medium"
              >
                Inloggen
              </button>
              <button
                onClick={() => {
                  router.push('/auth/signup')
                  setMobileMenuOpen(false)
                }}
                className="btn btn-primary w-full"
              >
                Registreren
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      {/* <div className="container-mobile py-12 md:py-20">
        <div className="text-center">
          <h1 className="text-mobile-2xl md:text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            Rijflow{' '}
            <span className="text-blue-600">Rijles Planner</span>
          </h1>
          <p className="text-mobile-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Beheer je planning, leerlingen en administratie op één plek. 
            Werk 30% minder aan administratie en focus op wat echt belangrijk is: je leerlingen.
          </p>
          
          <div className="mobile-stack md:flex-row gap-4 justify-center items-center mb-12">
            <input
              type="email"
              placeholder="Je e-mailadres"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-6 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full max-w-md"
            />
            <button
              onClick={handleGetStarted}
              className="btn btn-primary flex items-center justify-center gap-2 btn-mobile-full md:w-auto"
            >
              Registreren
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mobile-stack md:flex-row items-center justify-center gap-4 md:gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>60 dagen proefperiode</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Geen creditcard vereist</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Direct aan de slag</span>
            </div>
          </div>
        </div>
      </div> */}

      {/* Problem & Solution Section */}
      {/* <div className="bg-white py-12 md:py-20">
        <div className="container-mobile">
          <div className="mobile-grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            <div>
              <h2 className="text-mobile-xl md:text-3xl font-bold text-gray-900 mb-6">
                Het probleem: administratie kost te veel tijd
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Leskaartjes, rittenplanning en facturatie handmatig bijhouden</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Leerlingen bijhouden met Excel en WhatsApp</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Geen centrale plek voor alles</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Onhandige tools die niet samenwerken</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-mobile-xl md:text-3xl font-bold text-gray-900 mb-6">
                De oplossing: alles-in-één webapp
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Lesplanning met kalender en drag & drop</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Leerlingbeheer en voortgang bijhouden</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Automatische facturatie en rapportage</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Digitale leskaart en communicatie</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Features Section */}
      <div className="bg-gray-50 py-12 md:py-20">
        <div className="container-mobile">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-mobile-xl md:text-3xl font-bold text-gray-900 mb-4">
              Alles wat je nodig hebt in één app
            </h2>
            <p className="text-mobile-lg md:text-xl text-gray-600">
              Van lesplanning tot facturatie, alles op één plek
            </p>
          </div>

          <div className="mobile-grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="card">
              <Calendar className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">AI Weekplanning</h3>
              <p className="text-gray-600">
                Laat AI je optimale weekplanning maken op basis van beschikbaarheid en voorkeuren.
              </p>
            </div>

            <div className="card">
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Dagplanning</h3>
              <p className="text-gray-600">
                Overzichtelijke dagplanning met alle lessen, locaties en leerlingen.
              </p>
            </div>

            <div className="card">
              <FileText className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Weekplanning</h3>
              <p className="text-gray-600">
                Plan je hele week vooruit met een duidelijk weekoverzicht van alle lessen.
              </p>
            </div>

            <div className="card">
              <MessageSquare className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Leerlingbeheer</h3>
              <p className="text-gray-600">
                Beheer al je leerlingen, hun gegevens en lespakketten op één centrale plek.
              </p>
            </div>

            <div className="card">
              <Clock className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Voortgang bijhouden</h3>
              <p className="text-gray-600">
                Houd de voortgang van je leerlingen bij en zie hun ontwikkeling over tijd.
              </p>
            </div>

            <div className="card">
              <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Urenregistratie</h3>
              <p className="text-gray-600">
                Automatische urenregistratie voor een complete administratie van je werkuren.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      {/* <div className="bg-white py-12 md:py-20">
        <div className="container-mobile">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-mobile-xl md:text-3xl font-bold text-gray-900 mb-4">
              Eenvoudige prijzen
            </h2>
            <p className="text-mobile-lg md:text-xl text-gray-600">
              Start gratis en upgrade wanneer je groeit
            </p>
          </div>

          <div className="mobile-grid md:grid-cols-3 gap-6 md:gap-8">
            <div className="card">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Freemium</h3>
              <p className="text-gray-600 mb-6">Perfect om te starten</p>
              <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                €0<span className="text-base md:text-lg font-normal text-gray-600">/maand</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>1 instructeur</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Beperkt aantal leerlingen</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Basis planning</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/auth/signup')}
                className="btn btn-secondary w-full"
              >
                Gratis starten
              </button>
            </div>

            <div className="card bg-blue-600 text-white relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                  Meest populair
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2">Basic</h3>
              <p className="text-blue-100 mb-6">Voor groeiende instructeurs</p>
              <div className="text-3xl md:text-4xl font-bold mb-6">
                €19<span className="text-base md:text-lg font-normal text-blue-100">/maand</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>Volledige planning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>Leerlingbeheer</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>Rapportage</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>Digitale leskaart</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/auth/signup')}
                className="btn bg-white hover:bg-gray-100 text-blue-600 w-full font-medium"
              >
                Start gratis proef
              </button>
            </div>

            <div className="card">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <p className="text-gray-600 mb-6">Voor professionals</p>
              <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                €39<span className="text-base md:text-lg font-normal text-gray-600">/maand</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Alles uit Basic</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Facturatie</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Leerlingportal</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>2+ instructeurs</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/auth/signup')}
                className="btn btn-primary w-full"
              >
                Start gratis proef
              </button>
            </div>
          </div>
        </div>
      </div> */}

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

      {/* App Store Section */}
      <div className="bg-white py-12 md:py-16">
        <div className="container-mobile text-center">
          <h2 className="text-mobile-xl md:text-3xl font-bold text-gray-900 mb-4">
            Download de app
          </h2>
          <p className="text-mobile-lg md:text-xl text-gray-600 mb-8">
            Gebruik RijFlow ook op je mobiele apparaat
          </p>
          
          <div className="flex flex-col items-center gap-4">
            {/* Google Play Button */}
            <a
              href="https://play.google.com/store/apps/details?id=com.Mascelli.RijlesPlanner"
              className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200"
              style={{ minWidth: '200px' }}
            >
              <div className="flex items-center">
                {/* Google Play Logo */}
                <div className="mr-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3L21 12L3 21V3Z" fill="#00DC82"/>
                    <path d="M3 3L21 12L3 21V3Z" fill="#00DC82" fillOpacity="0.8"/>
                    <path d="M3 3L21 12L3 21V3Z" fill="#00DC82" fillOpacity="0.6"/>
                    <path d="M3 3L21 12L3 21V3Z" fill="#00DC82" fillOpacity="0.4"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium">GET IT ON</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </div>
            </a>

            {/* App Store Button */}
            <a
              href="https://apps.apple.com/us/app/optimalfitness-workout-diet/id6742567522"
              className="inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200"
              style={{ minWidth: '200px' }}
            >
              <div className="flex items-center">
                {/* Apple Logo */}
                <div className="mr-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="white"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium">Download on</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </div>
            </a>
          </div>
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
