'use client'

import { useState, useEffect } from 'react'

interface LogEntry {
  id: number
  timestamp: string
  level: 'log' | 'error' | 'warn' | 'info'
  message: string
  data?: any
}

export default function DebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [logId, setLogId] = useState(0)

  useEffect(() => {
    // Override console methods to capture logs
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info

    const addLog = (level: LogEntry['level'], ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      
      const newLog: LogEntry = {
        id: logId,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        data: args.length > 1 ? args : undefined
      }
      
      setLogs(prev => [...prev, newLog])
      setLogId(prev => prev + 1)
    }

    console.log = (...args) => {
      originalLog(...args)
      addLog('log', ...args)
    }

    console.error = (...args) => {
      originalError(...args)
      addLog('error', ...args)
    }

    console.warn = (...args) => {
      originalWarn(...args)
      addLog('warn', ...args)
    }

    console.info = (...args) => {
      originalInfo(...args)
      addLog('info', ...args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
      console.info = originalInfo
    }
  }, [logId])

  const clearLogs = () => {
    setLogs([])
    setLogId(0)
  }

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warn': return 'text-yellow-600 bg-yellow-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
      >
        🐛 Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="font-medium">Debug Panel</h3>
        <div className="space-x-2">
          <button
            onClick={clearLogs}
            className="text-xs bg-gray-200 px-2 py-1 rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs bg-red-200 px-2 py-1 rounded"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="h-80 overflow-y-auto p-3 space-y-2">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No logs yet...</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className={`text-xs p-2 rounded ${getLogColor(log.level)}`}>
              <div className="flex justify-between">
                <span className="font-mono">{log.timestamp}</span>
                <span className="uppercase">{log.level}</span>
              </div>
              <div className="mt-1 break-words">{log.message}</div>
              {log.data && (
                <pre className="mt-1 text-xs bg-black text-green-400 p-2 rounded overflow-auto">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
} 