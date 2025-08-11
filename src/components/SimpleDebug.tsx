'use client';

import { useEffect, useState } from 'react';

export default function SimpleDebug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 20)]);
  };

  useEffect(() => {
    addLog('SimpleDebug component mounted');
    
    // Test basic functionality
    addLog(`Window width: ${window.innerWidth}, height: ${window.innerHeight}`);
    addLog(`User agent: ${navigator.userAgent}`);
    addLog(`Document ready state: ${document.readyState}`);
    
    // Test if Capacitor is available
    if ((window as any).Capacitor) {
      addLog('✅ Capacitor detected');
      try {
        const platform = (window as any).Capacitor.getPlatform();
        addLog(`Platform: ${platform}`);
      } catch (e) {
        addLog(`❌ Error getting platform: ${e}`);
      }
    } else {
      addLog('❌ Capacitor not detected');
    }

    // Test DOM access
    if (document.body) {
      addLog('✅ Document body accessible');
      addLog(`Body children count: ${document.body.children.length}`);
    } else {
      addLog('❌ Document body not accessible');
    }

    // Override console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog(`LOG: ${args.join(' ')}`);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog(`ERROR: ${args.join(' ')}`);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog(`WARN: ${args.join(' ')}`);
    };

    // Global error handler
    const handleError = (event: ErrorEvent) => {
      addLog(`GLOBAL ERROR: ${event.message} at ${event.filename}:${event.lineno}`);
    };

    window.addEventListener('error', handleError);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-red-600 text-white px-3 py-2 rounded text-sm font-bold"
      >
        SHOW DEBUG
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white p-4 overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-red-400">RijFlow Debug Panel</h1>
        <button
          onClick={() => setIsVisible(false)}
          className="bg-red-600 px-4 py-2 rounded font-bold"
        >
          HIDE
        </button>
      </div>

      <div className="mb-4 p-4 bg-gray-800 rounded">
        <h2 className="text-lg font-semibold mb-2">Quick Tests</h2>
        <div className="space-x-2">
          <button
            onClick={() => addLog('Test button clicked')}
            className="bg-blue-600 px-3 py-2 rounded"
          >
            Test Log
          </button>
          <button
            onClick={() => {
              try {
                throw new Error('Test error');
              } catch (e) {
                console.error('Test error:', e);
              }
            }}
            className="bg-red-600 px-3 py-2 rounded"
          >
            Test Error
          </button>
          <button
            onClick={() => {
              addLog(`Current time: ${new Date().toISOString()}`);
              addLog(`Window size: ${window.innerWidth}x${window.innerHeight}`);
            }}
            className="bg-green-600 px-3 py-2 rounded"
          >
            Test Info
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Debug Logs</h2>
          <button
            onClick={() => setLogs([])}
            className="bg-gray-600 px-3 py-2 rounded"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-800 rounded p-4 max-h-96 overflow-auto">
          {logs.length === 0 ? (
            <p className="text-gray-400">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1 p-1 bg-gray-700 rounded">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400">
        <p>Debug panel loaded at: {new Date().toLocaleString()}</p>
        <p>If you see this, the app is working but may have other issues</p>
      </div>
    </div>
  );
} 