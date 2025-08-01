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
  // Raw input values (what user is typing)
  const [startHoursRaw, setStartHoursRaw] = useState('09')
  const [startMinutesRaw, setStartMinutesRaw] = useState('00')
  const [endHoursRaw, setEndHoursRaw] = useState('17')
  const [endMinutesRaw, setEndMinutesRaw] = useState('00')

  // Formatted values (what gets sent to parent)
  const [startHours, setStartHours] = useState('09')
  const [startMinutes, setStartMinutes] = useState('00')
  const [endHours, setEndHours] = useState('17')
  const [endMinutes, setEndMinutes] = useState('00')

  // Initialize from props
  useEffect(() => {
    if (startTime) {
      const [hours, minutes] = startTime.split(':')
      const formattedHours = hours || '09'
      const formattedMinutes = minutes || '00'
      setStartHours(formattedHours)
      setStartMinutes(formattedMinutes)
      setStartHoursRaw(formattedHours)
      setStartMinutesRaw(formattedMinutes)
    }
    if (endTime) {
      const [hours, minutes] = endTime.split(':')
      const formattedHours = hours || '17'
      const formattedMinutes = minutes || '00'
      setEndHours(formattedHours)
      setEndMinutes(formattedMinutes)
      setEndHoursRaw(formattedHours)
      setEndMinutesRaw(formattedMinutes)
    }
  }, [startTime, endTime])

  // Helper function to validate and format time values
  const validateAndFormatTime = (value: string, maxValue: number): string => {
    const numValue = parseInt(value) || 0
    if (numValue < 0) return '00'
    if (numValue > maxValue) return maxValue.toString().padStart(2, '0')
    return numValue.toString().padStart(2, '0')
  }

  // Handle raw input changes (no validation)
  const handleRawTimeChange = (field: 'startHours' | 'startMinutes' | 'endHours' | 'endMinutes', value: string) => {
    switch (field) {
      case 'startHours':
        setStartHoursRaw(value)
        break
      case 'startMinutes':
        setStartMinutesRaw(value)
        break
      case 'endHours':
        setEndHoursRaw(value)
        break
      case 'endMinutes':
        setEndMinutesRaw(value)
        break
    }
  }

  // Handle blur events for validation and formatting
  const handleBlur = (field: 'startHours' | 'startMinutes' | 'endHours' | 'endMinutes') => {
    let rawValue = ''
    let formattedValue = ''
    
    // Get the raw value for this field
    switch (field) {
      case 'startHours':
        rawValue = startHoursRaw
        break
      case 'startMinutes':
        rawValue = startMinutesRaw
        break
      case 'endHours':
        rawValue = endHoursRaw
        break
      case 'endMinutes':
        rawValue = endMinutesRaw
        break
    }

    // Validate and format the value
    if (field === 'startHours' || field === 'endHours') {
      formattedValue = validateAndFormatTime(rawValue, 23)
    } else if (field === 'startMinutes' || field === 'endMinutes') {
      formattedValue = validateAndFormatTime(rawValue, 59)
    }

    // Update both raw and formatted values
    switch (field) {
      case 'startHours':
        setStartHours(formattedValue)
        setStartHoursRaw(formattedValue)
        break
      case 'startMinutes':
        setStartMinutes(formattedValue)
        setStartMinutesRaw(formattedValue)
        break
      case 'endHours':
        setEndHours(formattedValue)
        setEndHoursRaw(formattedValue)
        break
      case 'endMinutes':
        setEndMinutes(formattedValue)
        setEndMinutesRaw(formattedValue)
        break
    }

    // Notify parent component with formatted values
    const newStartTime = `${startHours}:${startMinutes}`
    const newEndTime = `${endHours}:${endMinutes}`
    onTimeChange(newStartTime, newEndTime)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={startHoursRaw}
          onChange={(e) => handleRawTimeChange('startHours', e.target.value)}
          onBlur={() => handleBlur('startHours')}
          className="w-8 h-8 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={2}
          disabled={disabled}
          placeholder="09"
        />
        <span className="text-gray-500">:</span>
        <input
          type="text"
          value={startMinutesRaw}
          onChange={(e) => handleRawTimeChange('startMinutes', e.target.value)}
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
          value={endHoursRaw}
          onChange={(e) => handleRawTimeChange('endHours', e.target.value)}
          onBlur={() => handleBlur('endHours')}
          className="w-8 h-8 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={2}
          disabled={disabled}
          placeholder="17"
        />
        <span className="text-gray-500">:</span>
        <input
          type="text"
          value={endMinutesRaw}
          onChange={(e) => handleRawTimeChange('endMinutes', e.target.value)}
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