'use client';

import { useEffect, useState } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export default function DebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [appStatus, setAppStatus] = useState({
    userAgent: '',
    viewport: { width: 0, height: 0 },
    isCapacitor: false,
    platform: '',
    readyState: '',
    errorCount: 0
  });

  const addLog = (level: LogEntry['level'], message: string, data?: any) => {
    const log: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data
    };
    setLogs(prev => [log, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  useEffect(() => {
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('info', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', args.join(' '));
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', args.join(' '));
      setAppStatus(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
    };

    // Capture initial app state
    setAppStatus({
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      isCapacitor: !!(window as any).Capacitor,
      platform: (window as any).Capacitor?.getPlatform() || 'unknown',
      readyState: document.readyState,
      errorCount: 0
    });

    // Add initial log
    addLog('info', 'Debug panel initialized');

    // Listen for errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', `Global error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', `Unhandled promise rejection: ${event.reason}`, event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Monitor viewport changes
    const handleResize = () => {
      setAppStatus(prev => ({
        ...prev,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      }));
    };

    window.addEventListener('resize', handleResize);

    // Monitor ready state changes
    const handleReadyStateChange = () => {
      setAppStatus(prev => ({ ...prev, readyState: document.readyState }));
      addLog('info', `Document ready state changed to: ${document.readyState}`);
    };

    document.addEventListener('readystatechange', handleReadyStateChange);

    return () => {
      // Restore original console methods
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;

      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('readystatechange', handleReadyStateChange);
    };
  }, []);

  // Add some test logs
  useEffect(() => {
    addLog('info', 'App component mounted');
    
    // Test if Capacitor is available
    if ((window as any).Capacitor) {
      addLog('info', 'Capacitor detected', (window as any).Capacitor);
    } else {
      addLog('warn', 'Capacitor not detected - running in browser');
    }

    // Test if we can access DOM
    if (document.body) {
      addLog('info', 'DOM body accessible');
    } else {
      addLog('error', 'DOM body not accessible');
    }
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-mono"
        style={{ fontFamily: 'monospace' }}
      >
        DEBUG
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 text-white p-4 overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Debug Panel - RijFlow</h2>
        <button
          onClick={() => setIsVisible(false)}
          className="bg-red-600 px-3 py-1 rounded"
        >
          Close
        </button>
      </div>

      {/* App Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">App Status</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Platform: <span className="text-yellow-400">{appStatus.platform}</span></div>
          <div>Capacitor: <span className={appStatus.isCapacitor ? 'text-green-400' : 'text-red-400'}>{appStatus.isCapacitor ? 'Yes' : 'No'}</span></div>
          <div>Ready State: <span className="text-blue-400">{appStatus.readyState}</span></div>
          <div>Viewport: <span className="text-green-400">{appStatus.viewport.width}x{appStatus.viewport.height}</span></div>
          <div>Errors: <span className="text-red-400">{appStatus.errorCount}</span></div>
        </div>
      </div>

      {/* User Agent */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">User Agent</h3>
        <div className="text-xs break-all bg-gray-900 p-2 rounded">
          {appStatus.userAgent}
        </div>
      </div>

      {/* Logs */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Console Logs</h3>
          <button
            onClick={() => setLogs([])}
            className="bg-gray-600 px-2 py-1 rounded text-sm"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-800 rounded p-2 max-h-96 overflow-auto">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`text-xs font-mono mb-1 p-1 rounded ${
                log.level === 'error' ? 'bg-red-900 text-red-200' :
                log.level === 'warn' ? 'bg-yellow-900 text-yellow-200' :
                'bg-gray-700 text-gray-200'
              }`}
            >
              <span className="text-gray-400">[{log.timestamp}]</span>
              <span className={`ml-2 ${
                log.level === 'error' ? 'text-red-300' :
                log.level === 'warn' ? 'text-yellow-300' :
                'text-green-300'
              }`}>
                {log.level.toUpperCase()}
              </span>
              <span className="ml-2">{log.message}</span>
              {log.data && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-blue-300">Data</summary>
                  <pre className="mt-1 text-xs bg-gray-900 p-2 rounded overflow-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Test Buttons */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Test Functions</h3>
        <div className="space-x-2">
          <button
            onClick={() => addLog('info', 'Test button clicked')}
            className="bg-blue-600 px-3 py-1 rounded text-sm"
          >
            Test Log
          </button>
          <button
            onClick={() => {
              try {
                throw new Error('Test error for debugging');
              } catch (error) {
                console.error('Test error:', error);
              }
            }}
            className="bg-red-600 px-3 py-1 rounded text-sm"
          >
            Test Error
          </button>
          <button
            onClick={() => {
              addLog('info', 'Testing DOM access', {
                bodyExists: !!document.body,
                bodyChildren: document.body?.children?.length,
                title: document.title
              });
            }}
            className="bg-green-600 px-3 py-1 rounded text-sm"
          >
            Test DOM
          </button>
        </div>
      </div>
    </div>
  );
} 