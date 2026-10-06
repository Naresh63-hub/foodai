import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message?: string
}

/**
 * Catches render-time errors anywhere in the tree below it and shows a friendly
 * fallback instead of a blank white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging without crashing the UI.
    console.error('Unhandled UI error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, message: undefined })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-5">
          <div className="max-w-md w-full rounded-3xl bg-white shadow-card border border-gray-100 p-6 text-center">
            <div className="text-4xl mb-3">😕</div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">
              Something went wrong
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              The page failed to load. Try returning to the home screen.
            </p>
            <button
              onClick={this.handleReload}
              className="mt-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 text-sm transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
