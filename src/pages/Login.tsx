import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import SafeAreaView from '../components/SafeAreaView'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle, signInDemo, sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch {
      // Error handled in AuthContext with user-friendly toast
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/')
    } catch {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handleDemoAccess = () => {
    signInDemo()
    navigate('/')
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast.info('Please enter your email address above to receive a reset link.')
      return
    }
    setResettingPassword(true)
    try {
      await sendPasswordReset(email)
    } catch {
      // Error handled in AuthContext
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <SafeAreaView>
      <div className="px-4 sm:px-6 py-8 pb-36 max-w-md mx-auto w-full box-border">
        <div className="text-center mb-6">
          <span className="text-4xl">🥗</span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-2">Welcome Back</h1>
          <p className="mt-1 text-xs text-gray-600">Sign in to continue to FoodAI</p>
        </div>

        {/* 1. Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-3.5 px-4 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        {/* 2. Instant Demo Access */}
        <button
          type="button"
          onClick={handleDemoAccess}
          className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-3 px-4 text-xs font-bold transition-all active:scale-[0.98]"
        >
          <span>⚡</span>
          <span>Explore in Instant Demo Mode (No Login)</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs font-medium">
            <span className="bg-gray-50 px-3 text-gray-400">or sign in with email & password</span>
          </div>
        </div>

        {/* 3. Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-xs font-bold text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resettingPassword}
                className="text-[11px] text-emerald-700 hover:underline font-bold"
              >
                {resettingPassword ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm shadow-soft transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="font-bold text-emerald-700 hover:underline"
          >
            Sign up
          </button>
        </p>

        {/* Domain Whitelist Tool */}
        <div className="mt-6 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-[11px] text-gray-600">
          <div className="flex items-center justify-between font-bold text-gray-700 mb-1">
            <span>Firebase: food-ai-433b7</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(window.location.hostname)
                  toast.success(`Copied "${window.location.hostname}" to clipboard!`)
                }
              }}
              className="text-[10px] text-emerald-700 hover:underline font-bold"
            >
              📋 Copy Domain
            </button>
          </div>
          <p className="text-gray-500 leading-snug">
            Current domain: <code className="bg-gray-200/70 px-1 py-0.5 rounded text-[10px] font-mono text-gray-800">{typeof window !== 'undefined' ? window.location.hostname : 'preview'}</code>.
            If Google popup is restricted, you are automatically logged into preview demo mode.
          </p>
        </div>
      </div>
    </SafeAreaView>
  )
}
