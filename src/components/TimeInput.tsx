'use client'

import { useState, useEffect } from 'react'

interface TimeInputProps {
  startTime: string
  endTime: string
  onTimeChange: (startTime: string, endTime: string) => void
  disabled?: boolean
  className?: string
}

export default function TimeInput({ 
  startTime, 
  endTime, 
  onTimeChange, 
  disabled = false,
  className = ''
}: TimeInputProps) {
  // Time input state for better UX
  const [timeInputs, setTimeInputs] = useState({
    startHours: '09',
    startMinutes: '00',
    endHours: '17',
    endMinutes: '00'
  })

  // Initialize from props
  useEffect(() => {
    if (startTime) {
      const [hours, minutes] = startTime.split(':')
      setTimeInputs(prev => ({ 
        ...prev, 
        startHours: hours || '09',
        startMinutes: minutes || '00'
      }))
    }
    if (endTime) {
      const [hours, minutes] = endTime.split(':')
      setTimeInputs(prev => ({ 
        ...prev, 
        endHours: hours || '17',
        endMinutes: minutes || '00'
      }))
    }
  }, [startTime, endTime])

  // Helper functions for time input handling
  const updateTimeInputs = (field: string, value: string) => {
    setTimeInputs(prev => ({ ...prev, [field]: value }))
  }

  const formatTimeOnBlur = (field: string, value: string, maxValue: number) => {
    let numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0) {
      numValue = 0
    } else if (numValue > maxValue) {
      numValue = maxValue
    }
    const formattedValue = numValue.toString().padStart(2, '0')
    setTimeInputs(prev => ({ ...prev, [field]: formattedValue }))
    return formattedValue
  }

  const updateFormTime = () => {
    const startTime = `${timeInputs.startHours}:${timeInputs.startMinutes}`
    const endTime = `${timeInputs.endHours}:${timeInputs.endMinutes}`
    onTimeChange(startTime, endTime)
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={timeInputs.startHours}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || /^\d{0,2}$/.test(value)) {
                updateTimeInputs('startHours', value)
                updateFormTime()
              }
            }}
            onBlur={(e) => {
              const formattedValue = formatTimeOnBlur('startHours', e.target.value, 23)
              updateFormTime()
            }}
            className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
            placeholder="HH"
            disabled={disabled}
          />
          <span className="text-gray-500 font-medium">:</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={timeInputs.startMinutes}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || /^\d{0,2}$/.test(value)) {
                updateTimeInputs('startMinutes', value)
                updateFormTime()
              }
            }}
            onBlur={(e) => {
              const formattedValue = formatTimeOnBlur('startMinutes', e.target.value, 59)
              updateFormTime()
            }}
            className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
            placeholder="MM"
            disabled={disabled}
          />
        </div>
      </div>
      <span className="text-gray-500 font-medium">-</span>
      <div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={timeInputs.endHours}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || /^\d{0,2}$/.test(value)) {
                updateTimeInputs('endHours', value)
                updateFormTime()
              }
            }}
            onBlur={(e) => {
              const formattedValue = formatTimeOnBlur('endHours', e.target.value, 23)
              updateFormTime()
            }}
            className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
            placeholder="HH"
            disabled={disabled}
          />
          <span className="text-gray-500 font-medium">:</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={timeInputs.endMinutes}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || /^\d{0,2}$/.test(value)) {
                updateTimeInputs('endMinutes', value)
                updateFormTime()
              }
            }}
            onBlur={(e) => {
              const formattedValue = formatTimeOnBlur('endMinutes', e.target.value, 59)
              updateFormTime()
            }}
            className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
            placeholder="MM"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
} 