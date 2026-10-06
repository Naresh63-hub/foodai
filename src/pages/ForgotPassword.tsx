import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import SafeAreaView from '../components/SafeAreaView'

export default function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [lastSentEmail, setLastSentEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      await sendPasswordReset(email.trim())
      setLastSentEmail(email.trim())
      setSentSuccess(true)
    } catch {
      // Friendly error message already toasted by AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!lastSentEmail) return
    setLoading(true)
    try {
      await sendPasswordReset(lastSentEmail)
    } catch {
      // Friendly error handled
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView>
      <div className="px-4 sm:px-6 py-8 pb-36 max-w-md mx-auto w-full box-border">
        {/* Top Back Link */}
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <span>←</span>
            <span>Back to Sign In</span>
          </Link>
        </div>

        {!sentSuccess ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center text-2xl mx-auto shadow-xs">
                🔑
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-3">
                Reset Password
              </h1>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed px-2">
                Enter your email address and we'll send you a secure link to reset your account password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="name@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm shadow-soft transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Password Reset Email</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-gray-500">
              Remember your password?{' '}
              <Link to="/login" className="font-bold text-emerald-700 hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl mx-auto mb-4 shadow-soft">
              ✉️
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Check Your Inbox</h2>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              We have sent a password reset link to:
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 px-3 inline-block">
              {lastSentEmail}
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-left text-xs text-gray-600 space-y-2">
              <p className="font-bold text-gray-800">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600">
                <li>Click the link inside the email to set a new password.</li>
                <li>The link is generated by Firebase Authentication and expires for security.</li>
                <li>Be sure to check your spam or promotions folder if you don't see it within a minute.</li>
              </ul>
            </div>

            <div className="mt-6 space-y-2.5">
              <Link
                to="/login"
                className="block w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm shadow-soft transition-all active:scale-[0.98]"
              >
                Return to Sign In
              </Link>

              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="w-full text-xs font-bold text-gray-500 hover:text-emerald-700 py-2 transition-colors disabled:opacity-50"
              >
                {loading ? 'Resending...' : "Didn't receive email? Click to resend"}
              </button>
            </div>
          </div>
        )}

        {/* Domain Whitelist Info Helper */}
        <div className="mt-8 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-[11px] text-gray-600">
          <div className="flex items-center justify-between font-bold text-gray-700 mb-1">
            <span>Firebase Auth: sendPasswordResetEmail</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Active</span>
          </div>
          <p className="text-gray-500 leading-snug">
            Emails are dispatched directly through your configured Firebase project{' '}
            <code className="bg-gray-200/70 px-1 py-0.5 rounded text-[10px] font-mono text-gray-800">food-ai-433b7</code>.
          </p>
        </div>
      </div>
    </SafeAreaView>
  )
}
