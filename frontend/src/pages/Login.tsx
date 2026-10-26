import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleOneTap } from '../hooks/useGoogleOneTap'
import SafeAreaView from '../components/SafeAreaView'

export default function Login() {
  const navigate = useNavigate()
  const { user, signIn, signInWithGoogle, signInDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showConfigHelper, setShowConfigHelper] = useState(false)

  // Automatically prompt Google One Tap on mount
  useGoogleOneTap({ context: 'signin' })

  // If already authenticated, redirect to home immediately
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Please enter both email and password')
      return
    }

    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate('/')
    } catch {
      // Error is caught and converted to user-friendly toast in AuthContext
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
      // Error is handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handleDemoAccess = () => {
    signInDemo()
    navigate('/')
  }

  const handleForgotPassword = () => {
    const target = email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password'
    navigate(target)
  }

  return (
    <SafeAreaView>
      <div className="min-h-[85vh] flex flex-col justify-center px-4 sm:px-6 py-8 pb-32 max-w-md mx-auto w-full box-border">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="/icon-192.png"
              alt="FoodAI - Know What You're Eating"
              className="w-20 h-20 rounded-3xl shadow-soft object-contain border border-emerald-100 bg-white p-1 select-none"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Welcome Back
            </h1>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500 font-medium">
            Know What You're Eating • Scan, Analyze & Eat Better
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            FoodAI • Firebase Secured
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 sm:p-7 transition-all">
          {/* 1. Fast Google Sign-In with 1-Tap badge */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50/80 active:scale-[0.98] py-3.5 px-4 text-sm font-bold text-gray-800 shadow-xs transition-all disabled:opacity-50 relative group"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
            <span className="ml-auto text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              1-Tap
            </span>
          </button>

          {/* 2. Instant Demo Mode Pill */}
          <button
            type="button"
            onClick={handleDemoAccess}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border border-emerald-200/80 py-2.5 px-4 text-xs font-bold transition-all active:scale-[0.98]"
          >
            <span>⚡</span>
            <span>Explore Demo Mode (1-Tap Instant Access)</span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200/80" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 font-medium text-gray-400">
                or continue with email
              </span>
            </div>
          </div>

          {/* 3. Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white px-3.5 py-3 text-sm text-gray-900 shadow-2xs focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white px-3.5 py-3 pr-11 text-sm text-gray-900 shadow-2xs focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <span className="text-sm select-none" title="Hide password">👁️</span>
                  ) : (
                    <span className="text-sm select-none" title="Show password">🙈</span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-gray-300"
                />
                <span className="text-xs text-gray-600 font-medium">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] py-3.5 px-4 text-sm font-bold text-white shadow-soft transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="mt-6 text-center text-xs text-gray-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Sign Up Free
            </Link>
          </div>
        </div>

        {/* Footer info & Optional Firebase Helper */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowConfigHelper(!showConfigHelper)}
            className="text-[11px] text-gray-400 hover:text-gray-600 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <span>🔐 Firebase Project: food-ai-433b7</span>
            <span>{showConfigHelper ? '▴' : '▾'}</span>
          </button>

          {showConfigHelper && (
            <div className="mt-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-[11px] text-gray-600 text-left">
              <div className="flex items-center justify-between font-bold text-gray-700 mb-1">
                <span>Authorized Domain Helper</span>
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
                Host: <code className="bg-gray-200/70 px-1 py-0.5 rounded text-[10px] font-mono text-gray-800">{typeof window !== 'undefined' ? window.location.hostname : 'preview'}</code>.
                Make sure this domain is added under <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong> for Google Sign-In.
              </p>
            </div>
          )}
        </div>
      </div>
    </SafeAreaView>
  )
}
