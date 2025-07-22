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
  // Parse start time
  const [startHours, setStartHours] = useState('09')
  const [startMinutes, setStartMinutes] = useState('00')
  
  // Parse end time
  const [endHours, setEndHours] = useState('17')
  const [endMinutes, setEndMinutes] = useState('00')

  // Initialize from props
  useEffect(() => {
    if (startTime) {
      const [hours, minutes] = startTime.split(':')
      setStartHours(hours || '09')
      setStartMinutes(minutes || '00')
    }
    if (endTime) {
      const [hours, minutes] = endTime.split(':')
      setEndHours(hours || '17')
      setEndMinutes(minutes || '00')
    }
  }, [startTime, endTime])

  // Helper function to validate and format time values
  const validateAndFormatTime = (value: string, maxValue: number): string => {
    const numValue = parseInt(value) || 0
    if (numValue < 0) return '00'
    if (numValue > maxValue) return maxValue.toString().padStart(2, '0')
    return numValue.toString().padStart(2, '0')
  }

  // Handle time input changes
  const handleTimeChange = (field: 'startHours' | 'startMinutes' | 'endHours' | 'endMinutes', value: string) => {
    let formattedValue = value
    
    // Validate based on field type
    if (field === 'startHours' || field === 'endHours') {
      formattedValue = validateAndFormatTime(value, 23)
    } else if (field === 'startMinutes' || field === 'endMinutes') {
      formattedValue = validateAndFormatTime(value, 59)
    }

    // Update state
    switch (field) {
      case 'startHours':
        setStartHours(formattedValue)
        break
      case 'startMinutes':
        setStartMinutes(formattedValue)
        break
      case 'endHours':
        setEndHours(formattedValue)
        break
      case 'endMinutes':
        setEndMinutes(formattedValue)
        break
    }

    // Notify parent component
    const newStartTime = `${startHours}:${startMinutes}`
    const newEndTime = `${endHours}:${endMinutes}`
    onTimeChange(newStartTime, newEndTime)
  }

  // Handle blur events for additional validation
  const handleBlur = (field: 'startHours' | 'startMinutes' | 'endHours' | 'endMinutes') => {
    const currentValue = {
      startHours,
      startMinutes,
      endHours,
      endMinutes
    }[field]

    let formattedValue = currentValue
    if (field === 'startHours' || field === 'endHours') {
      formattedValue = validateAndFormatTime(currentValue, 23)
    } else if (field === 'startMinutes' || field === 'endMinutes') {
      formattedValue = validateAndFormatTime(currentValue, 59)
    }

    handleTimeChange(field, formattedValue)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={startHours}
          onChange={(e) => handleTimeChange('startHours', e.target.value)}
          onBlur={() => handleBlur('startHours')}
          className="w-8 h-8 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={2}
          disabled={disabled}
          placeholder="09"
        />
        <span className="text-gray-500">:</span>
        <input
          type="text"
          value={startMinutes}
          onChange={(e) => handleTimeChange('startMinutes', e.target.value)}
          onBlur={() => handleBlur('startMinutes')}
          className="w-8 h-8 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={2}
          disabled={disabled}
          placeholder="00"
        />
      </div>
      <span className="text-gray-500">-</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={endHours}
          onChange={(e) => handleTimeChange('endHours', e.target.value)}
          onBlur={() => handleBlur('endHours')}
          className="w-8 h-8 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={2}
          disabled={disabled}
          placeholder="17"
        />
        <span className="text-gray-500">:</span>
        <input
          type="text"
          value={endMinutes}
          onChange={(e) => handleTimeChange('endMinutes', e.target.value)}
          onBlur={() => handleBlur('endMinutes')}
          className="w-8 h-8 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={2}
          disabled={disabled}
          placeholder="00"
        />
      </div>
    </div>
  )
} 