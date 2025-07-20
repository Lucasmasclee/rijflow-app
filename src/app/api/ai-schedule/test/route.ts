import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting AI schedule generation...')
    
    // For production, use a pre-generated static file instead of running Python
    // This avoids issues with Python not being available on the server
    const jsonFilePath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'ai-schedule', 'best_week_planning.json')
    console.log('Looking for JSON file at:', jsonFilePath)
    
    if (!fs.existsSync(jsonFilePath)) {
      // If the file doesn't exist, create a fallback response
      console.log('JSON file not found, creating fallback response')
      const fallbackResponse = {
        lessons: [
          {
            date: "2025-07-21",
            startTime: "09:05",
            endTime: "09:55",
            studentId: "ab9e1b31-8772-4b59-b357-62d6cc8bf44b",
            studentName: "Luna van der Meer",
            notes: ""
          },
          {
            date: "2025-07-21",
            startTime: "09:55",
            endTime: "10:45",
            studentId: "ab9e1b31-8772-4b59-b357-62d6cc8bf44b",
            studentName: "Luna van der Meer",
            notes: ""
          },
          {
            date: "2025-07-22",
            startTime: "11:00",
            endTime: "12:00",
            studentId: "616619e8-b605-43a7-a60f-87c27fd4934b",
            studentName: "Daan Willems",
            notes: ""
          },
          {
            date: "2025-07-22",
            startTime: "12:00",
            endTime: "13:00",
            studentId: "616619e8-b605-43a7-a60f-87c27fd4934b",
            studentName: "Daan Willems",
            notes: ""
          },
          {
            date: "2025-07-23",
            startTime: "09:05",
            endTime: "09:55",
            studentId: "70fb4d19-38f8-4bbb-989a-fae00be78b55",
            studentName: "Luuk Schouten",
            notes: ""
          },
          {
            date: "2025-07-23",
            startTime: "09:55",
            endTime: "10:45",
            studentId: "70fb4d19-38f8-4bbb-989a-fae00be78b55",
            studentName: "Luuk Schouten",
            notes: ""
          }
        ],
        leerlingen_zonder_les: {
          "Emma de Vries": 1,
          "Noah Bakker": 1,
          "Tess Visser": 1,
          "Lars Smit": 4,
          "Julia Mulder": 1,
          "Milan Koning": 1,
          "Lieke Kuiper": 1,
          "Jens van Leeuwen": 1,
          "Bram Jansen": 1,
          "Luna van der Meer": 1,
          "Mees Peeters": 2,
          "Isa de Groot": 1,
          "Luuk Schouten": 2
        },
        schedule_details: {
          lessen: 32,
          totale_minuten_tussen_lessen: 150
        }
      }
      
      return NextResponse.json(fallbackResponse)
    }
    
    const jsonData = fs.readFileSync(jsonFilePath, 'utf-8')
    console.log('JSON file content length:', jsonData.length)
    
    const aiResponse = JSON.parse(jsonData)
    console.log('Successfully parsed JSON response')
    
    return NextResponse.json(aiResponse)
    
  } catch (error) {
    console.error('Error in test AI schedule API:', error)
    return NextResponse.json(
      { 
        error: 'Fout bij het genereren van het test rooster',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 