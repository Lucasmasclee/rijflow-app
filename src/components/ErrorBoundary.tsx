'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; errorInfo?: React.ErrorInfo }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error)
    console.error('Error info:', errorInfo)
    
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} errorInfo={this.state.errorInfo} />
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🚨</div>
              <h2 className="text-2xl font-bold text-gray-900">Er is iets misgegaan</h2>
              <p className="mt-2 text-sm text-gray-600">
                Er is een onverwachte fout opgetreden tijdens het registreren.
              </p>
            </div>

            <div className="card">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Foutmelding:</h3>
                  <pre className="mt-2 text-xs bg-red-50 p-3 rounded overflow-auto">
                    {this.state.error?.message || 'Onbekende fout'}
                  </pre>
                </div>

                {this.state.errorInfo && (
                  <div>
                    <h3 className="font-medium text-gray-900">Stack trace:</h3>
                    <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary w-full"
                >
                  Pagina herladen
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 