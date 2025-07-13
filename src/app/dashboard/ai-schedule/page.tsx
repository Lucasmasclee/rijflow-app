'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

const DAY_ORDER = [
  { day: 'monday', name: 'Maandag' },
  { day: 'tuesday', name: 'Dinsdag' },
  { day: 'wednesday', name: 'Woensdag' },
  { day: 'thursday', name: 'Donderdag' },
  { day: 'friday', name: 'Vrijdag' },
  { day: 'saturday', name: 'Zaterdag' },
  { day: 'sunday', name: 'Zondag' },
]

// Dummy leerlingen
const DUMMY_STUDENTS = [
  { id: 1, name: 'Jan Jansen' },
  { id: 2, name: 'Lisa de Vries' },
]

export default function AISchedulePage() {
  // Instructeur beschikbaarheid
  const [availability, setAvailability] = useState([
    { day: 'monday', available: true },
    { day: 'tuesday', available: true },
    { day: 'wednesday', available: true },
    { day: 'thursday', available: true },
    { day: 'friday', available: true },
    { day: 'saturday', available: false },
    { day: 'sunday', available: false },
  ])

  // Leerlingen data
  const [students, setStudents] = useState(
    DUMMY_STUDENTS.map(s => ({
      ...s,
      lessons: 1,
      minutes: 60,
      notes: '',
      aiNotes: '',
    }))
  )

  // Resultaat van ChatGPT (dummy)
  const [aiResult, setAiResult] = useState('')

  useEffect(() => {
    function updateAvailability() {
      const saved = localStorage.getItem('instructorAvailability')
      if (saved) {
        // Alleen dag en beschikbaarheid nodig
        const arr = JSON.parse(saved)
        setAvailability(
          DAY_ORDER.map(({ day }) => {
            const found = arr.find((a: any) => a.day === day)
            return { day, available: found ? found.available : true }
          })
        )
      }
    }
    updateAvailability()
    window.addEventListener('focus', updateAvailability)
    return () => {
      window.removeEventListener('focus', updateAvailability)
    }
  }, [])

  // Handler voor leerling inputs
  const handleStudentChange = (id: number, field: string, value: any) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  // Genereer instructeur-beschikbaarheid als tekst
  const instructorText = DAY_ORDER
    .map(({ day, name }) => {
      const found = availability.find(a => a.day === day)
      return `${name} ${found && found.available ? 'Hele dag' : 'Niet beschikbaar'}`
    })
    .join('\n')

  // Genereer prompt voor ChatGPT
  const prompt = `Maak een rooster voor deze week.\n\nBeschikbaarheid instructeur:\n${instructorText}\n\nLeerlingen:\n${students.map(s =>
    `- ${s.name}:\n  Beschikbaarheid: [hier komt later de AI notitie] \n  Aantal lessen: ${s.lessons}\n  Minuten per les: ${s.minutes}\n  Notities: ${s.notes}`
  ).join('\n\n')}
\nGeef het resultaat als JSON of CSV.\nVoor later: Houd rekening met afstand tussen plaatsen en extra notities voor praktische zaken (spits, etc).`

  // Dummy AI call
  const handleSendToAI = () => {
    setAiResult('ChatGPT resultaat (dummy):\n[Hier zou het rooster als JSON of CSV verschijnen]')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard/week-overview" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug naar Weekoverzicht
              </Link>
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">AI Rooster</span>
          </div>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Instructeur beschikbaarheid */}
        <div>
          <h2 className="text-lg font-bold mb-2">Beschikbaarheid instructeur</h2>
          <textarea
            className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none text-base bg-white shadow-sm mb-2"
            value={instructorText}
            readOnly
          />
        </div>
        {/* Leerling beschikbaarheid (voor nu leeg) */}
        <div>
          <h2 className="text-lg font-bold mb-2">Beschikbaarheid leerlingen</h2>
          <div className="w-full h-24 p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center">
            (Hier komt later de beschikbaarheid van leerlingen)
          </div>
        </div>
        {/* Per leerling invulvelden */}
        <div>
          <h2 className="text-lg font-bold mb-4">Leerlingen</h2>
          <div className="space-y-8">
            {students.map(student => (
              <div key={student.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="font-semibold text-blue-900 mb-2">{student.name}</div>
                <div className="flex flex-wrap gap-4 mb-2">
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-700">Aantal lessen</span>
                    <input
                      type="number"
                      min={1}
                      className="border rounded px-2 py-1 w-24"
                      value={student.lessons}
                      onChange={e => handleStudentChange(student.id, 'lessons', Number(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-700">Minuten per les</span>
                    <input
                      type="number"
                      min={10}
                      className="border rounded px-2 py-1 w-24"
                      value={student.minutes}
                      onChange={e => handleStudentChange(student.id, 'minutes', Number(e.target.value))}
                    />
                  </label>
                </div>
                <label className="block mb-2">
                  <span className="text-sm text-gray-700">Notities leerling (vrije tekst, evt. AI samenvatting)</span>
                  <textarea
                    className="w-full h-20 border border-gray-300 rounded p-2 mt-1"
                    value={student.notes}
                    onChange={e => handleStudentChange(student.id, 'notes', e.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
        {/* Prompt generator */}
        <div>
          <h2 className="text-lg font-bold mb-2">Prompt voor ChatGPT</h2>
          <textarea
            className="w-full h-40 p-4 border border-blue-300 rounded-lg resize-none text-base bg-blue-50 shadow-sm mb-2"
            value={prompt}
            readOnly
          />
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            onClick={handleSendToAI}
          >
            Verstuur naar ChatGPT
          </button>
        </div>
        {/* Resultaatvlak */}
        <div>
          <h2 className="text-lg font-bold mb-2">Resultaat van ChatGPT</h2>
          <textarea
            className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none text-base bg-white shadow-sm"
            value={aiResult}
            readOnly
          />
        </div>
      </div>
    </div>
  )
} 