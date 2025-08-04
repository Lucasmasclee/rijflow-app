'use client'

import { useState } from 'react'
import { Check, Star, ArrowRight, Info, Shield, Clock, Users, Zap, MessageSquare, Calendar, TrendingUp, Award, ChevronRight } from 'lucide-react'

interface Plan {
  id: number
  name: string
  price: number
  trial: string
  features: string[]
  missingFeatures: string[]
  smsLimit?: string
  badge?: string
  savings?: string
  popular?: boolean
}

const plans: Plan[] = [
  {
    id: 1,
    name: 'Basic',
    price: 20,
    trial: '60 dagen gratis',
    features: ['Dagplanning', 'Weekplanning', 'Leerlingbeheer'],
    missingFeatures: ['Automatische weekplanning', 'Automatische SMS meldingen']
  },
  {
    id: 2,
    name: 'Basic + AW',
    price: 45,
    trial: '60 dagen gratis',
    features: ['Dagplanning', 'Weekplanning', 'Leerlingbeheer', 'Automatische weekplanning'],
    missingFeatures: ['Automatische SMS meldingen']
  },
  {
    id: 3,
    name: 'Basic + SMS',
    price: 65,
    trial: '€50 voor 2 maanden (met 500 SMS t.w.v. €50)',
    features: ['Dagplanning', 'Weekplanning', 'Leerlingbeheer', 'Automatische SMS meldingen (tot 500/mnd)'],
    missingFeatures: ['Automatische weekplanning'],
    smsLimit: '500 SMS/maand'
  },
  {
    id: 4,
    name: 'Pro (Alles-in-één)',
    price: 80,
    trial: '€50 voor 2 maanden (met 500 SMS t.w.v. €50)',
    features: ['Dagplanning', 'Weekplanning', 'Leerlingbeheer', 'Automatische weekplanning', 'Automatische SMS meldingen (tot 500/mnd)'],
    missingFeatures: [],
    smsLimit: '500 SMS/maand',
    badge: 'Meest gekozen',
    savings: '25% voordeel',
    popular: true
  }
]

export default function SubscriptionsPage() {
  const [question1, setQuestion1] = useState<boolean | null>(null)
  const [question2, setQuestion2] = useState<boolean | null>(null)
  const [showPlans, setShowPlans] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(1)

  const getRecommendedPlans = () => {
    if (question1 === null || question2 === null) return []

    // Logica voor plan selectie
    if (question1 && question2) {
      return [plans[3], plans[0]] // Pro + Basic
    } else if (question1 && !question2) {
      return [plans[1], plans[3]] // Basic + AW + Pro
    } else if (!question1 && question2) {
      return [plans[2], plans[3]] // Basic + SMS + Pro
    } else {
      return [plans[0], plans[3]] // Basic + Pro
    }
  }

  const handleShowPlans = () => {
    if (question1 !== null && question2 !== null) {
      setShowPlans(true)
      // Scroll naar plannen
      setTimeout(() => {
        document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  const recommendedPlans = getRecommendedPlans()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10"></div>
        <div className="container mx-auto px-4 py-16 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="h-4 w-4 mr-2" />
              Meer dan 500+ rijinstructeurs vertrouwen op RijFlow
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Kies het perfecte
              <span className="text-blue-600"> abonnement</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
              Beantwoord 2 korte vragen en ontdek welk plan het beste bij jouw manier van werken past. 
              Start vandaag nog met je gratis proefperiode.
            </p>
            
            {/* Social Proof */}
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 mb-8">
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                60 dagen gratis proberen
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-blue-500 mr-2" />
                Geen verplichtingen
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-orange-500 mr-2" />
                Direct toegang
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Persoonlijk advies in 30 seconden
              </h2>
              <p className="text-gray-600">
                Beantwoord deze vragen en krijg een op maat gemaakte aanbeveling
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Vraag {currentQuestion} van 2</span>
                <span className="text-sm text-gray-500">{Math.round((currentQuestion / 2) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentQuestion / 2) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question 1 */}
            {currentQuestion === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Wil je gebruik maken van automatische weekplanning?
                  </h3>
                  <p className="text-gray-600">
                    AI-gebaseerde planning die rekening houdt met beschikbaarheid en voorkeuren
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setQuestion1(true)
                      setCurrentQuestion(2)
                    }}
                    className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                      question1 === true
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-lg">Ja, graag!</div>
                      <Zap className={`h-5 w-5 transition-colors ${
                        question1 === true ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <div className="text-sm text-gray-600">
                      Bespaar tijd met AI-gebaseerde planning die rekening houdt met beschikbaarheid en voorkeuren
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setQuestion1(false)
                      setCurrentQuestion(2)
                    }}
                    className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                      question1 === false
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-lg">Nee, liever niet</div>
                      <Calendar className={`h-5 w-5 transition-colors ${
                        question1 === false ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <div className="text-sm text-gray-600">
                      Ik plan liever handmatig en heb volledige controle over mijn planning
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Question 2 */}
            {currentQuestion === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Wil je automatische meldingen via SMS sturen naar leerlingen?
                  </h3>
                  <p className="text-gray-600">
                    Verhoog opkomst met automatische herinneringen en bevestigingen
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setQuestion2(true)
                      setShowPlans(true)
                      setTimeout(() => {
                        document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })
                      }, 100)
                    }}
                    className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                      question2 === true
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-lg">Ja, zeker!</div>
                      <MessageSquare className={`h-5 w-5 transition-colors ${
                        question2 === true ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <div className="text-sm text-gray-600">
                      Verhoog opkomst met automatische herinneringen en bevestigingen
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setQuestion2(false)
                      setShowPlans(true)
                      setTimeout(() => {
                        document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })
                      }, 100)
                    }}
                    className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                      question2 === false
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-lg">Nee, liever niet</div>
                      <Users className={`h-5 w-5 transition-colors ${
                        question2 === false ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <div className="text-sm text-gray-600">
                      Ik regel communicatie zelf en heb liever persoonlijk contact
                    </div>
                  </button>
                </div>
                
                {/* Back button */}
                <div className="text-center pt-4">
                  <button
                    onClick={() => setCurrentQuestion(1)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center mx-auto"
                  >
                    <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                    Terug naar vraag 1
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plans Section */}
      {showPlans && (
        <div id="plans-section" className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Award className="h-4 w-4 mr-2" />
              Persoonlijke aanbeveling
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Jouw perfecte match
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Op basis van jouw antwoorden hebben we deze plannen voor je geselecteerd. 
              Alle plannen zijn volledig gratis uit te proberen.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {recommendedPlans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-3xl shadow-xl border-2 transition-all duration-500 hover:shadow-2xl hover:scale-105 ${
                  index === 0 ? 'animate-fade-in-up' : 'animate-fade-in-up delay-200'
                } ${
                  plan.popular ? 'border-blue-500 shadow-blue-100' : 'border-gray-200'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full text-sm font-semibold flex items-center shadow-lg">
                      <Star className="h-4 w-4 mr-2" />
                      {plan.badge}
                    </div>
                  </div>
                )}

                {/* Savings Badge */}
                {plan.savings && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                      {plan.savings}
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {plan.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-5xl font-bold text-gray-900">€{plan.price}</span>
                      <span className="text-gray-500 text-lg">/maand</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-4 bg-blue-50 rounded-lg py-2 px-4">
                      {plan.trial}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    <div className="text-sm font-medium text-gray-700 mb-3">Wat je krijgt:</div>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {plan.missingFeatures.map((feature, idx) => (
                      <div key={idx} className="flex items-start opacity-50">
                        <div className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-500 line-through">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* SMS Info */}
                  {plan.smsLimit && (
                    <div className="bg-blue-50 rounded-xl p-4 mb-8">
                      <div className="flex items-center text-sm text-blue-700">
                        <Info className="h-4 w-4 mr-2" />
                        {plan.smsLimit} inbegrepen
                      </div>
                    </div>
                  )}

                  {/* CTA Button */}
                  <button className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl' 
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}>
                    Start mijn gratis proef
                    <ArrowRight className="inline ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Waarom rijinstructeurs voor RijFlow kiezen
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Meer leerlingen</h4>
                  <p className="text-gray-600 text-sm">
                    Automatische herinneringen verhogen opkomst met 40%
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Tijd besparen</h4>
                  <p className="text-gray-600 text-sm">
                    AI-planning bespaart gemiddeld 8 uur per week
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Veilig & betrouwbaar</h4>
                  <p className="text-gray-600 text-sm">
                    99.9% uptime en volledige GDPR-compliance
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">
              Alle plannen zijn volledig gratis uit te proberen
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-1" />
                Geen verplichtingen
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-1" />
                Direct toegang
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-1" />
                Gratis support
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 