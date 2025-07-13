'use client'

import { useEffect, useState } from 'react'

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  delay?: number
}

export default function ClientOnly({ children, fallback = null, delay = 0 }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (!mounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
} 