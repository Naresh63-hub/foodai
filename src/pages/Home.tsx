import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { QUICK_SAMPLE_PRESETS } from '../constants'
import { getScanHistory } from '../api/food'
import VoiceMealLoggerModal from '../components/VoiceMealLoggerModal'
import { SkeletonRecentScans } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import InstallAppModal from '../components/InstallAppModal'

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [loadingScans, setLoadingScans] = useState(true)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)

  useEffect(() => {
    setLoadingScans(true)
    getScanHistory()
      .then((res) => {
        if (Array.isArray(res)) {
          setRecentScans(res.slice(0, 4))
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingScans(false)
      })
  }, [])

  const handleQuickPreset = (barcode: string) => {
    navigate(`/results/${barcode}`)
  }

  return (
    <SafeAreaView>
      <div className="px-4 sm:px-5 py-6 pb-36 max-w-md mx-auto w-full box-border">
        {/* Hero Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <span>🥗</span>
              <span>AI Food Transparency</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowInstallModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 shadow-xs transition-all active:scale-95"
                title="Install FoodAI or Download Android APK"
              >
                <span>📱</span>
                <span>Get App</span>
              </button>

              {user ? (
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-bold text-gray-700 shadow-xs hover:border-emerald-300 transition-all active:scale-95"
                >
                  <span>👤</span>
                  <span className="max-w-[90px] truncate">
                    {user.displayName || user.email?.split('@')[0] || 'Profile'}
                  </span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold text-white shadow-xs transition-all active:scale-95"
                >
                  <span>🔑</span>
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-tight">
            Know What You're Eating
          </h1>
          <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
            Scan any barcode or food label to discover ingredients, exact weight percentages, and true processing level.
          </p>
        </div>

        {/* Primary Action Button */}
        <Link
          to="/scan"
          className="flex items-center justify-between w-full rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white p-5 shadow-soft transition-all duration-200"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
              📷
            </div>
            <div className="text-left min-w-0">
              <p className="font-extrabold text-lg leading-tight truncate">Scan a Product</p>
              <p className="text-xs text-white/80 font-medium truncate">Barcode or Label Photo OCR</p>
            </div>
          </div>
          <span className="text-xl shrink-0 ml-2">➔</span>
        </Link>

        {/* Gemini Vision Food Camera Card */}
        <Link
          to="/camera-snap"
          className="mt-3 flex items-center justify-between w-full rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 active:scale-[0.98] text-white p-5 shadow-soft transition-all duration-200"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
              📸
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-lg leading-tight truncate">Snap Food Photo</p>
                <span className="text-[10px] uppercase font-bold bg-white/25 px-2 py-0.5 rounded-full shrink-0">Vision AI</span>
              </div>
              <p className="text-xs text-white/85 font-medium truncate">Camera recognition & calorie estimation</p>
            </div>
          </div>
          <span className="text-xl shrink-0 ml-2">➔</span>
        </Link>

        {/* Gemini AI Nutrition Action Card */}
        <Link
          to="/ai-nutrition"
          className="mt-3 flex items-center justify-between w-full rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-emerald-700 hover:from-purple-800 hover:to-emerald-800 active:scale-[0.98] text-white p-5 shadow-soft transition-all duration-200"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
              ✨
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-lg leading-tight truncate">AI Food Nutrition</p>
                <span className="text-[10px] uppercase font-bold bg-white/25 px-2 py-0.5 rounded-full shrink-0">Gemini</span>
              </div>
              <p className="text-xs text-white/85 font-medium truncate">Analyze any food, meal, or custom recipe</p>
            </div>
          </div>
          <span className="text-xl shrink-0 ml-2">➔</span>
        </Link>

        {/* Web Speech API Voice Meal Log Card */}
        <button
          onClick={() => setIsVoiceModalOpen(true)}
          className="mt-3 flex items-center justify-between w-full rounded-3xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-700 hover:from-rose-700 hover:to-purple-800 active:scale-[0.98] text-white p-5 shadow-soft transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
              🎙️
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-lg leading-tight truncate">Voice Log Meal</p>
                <span className="text-[10px] uppercase font-bold bg-white/25 px-2 py-0.5 rounded-full shrink-0">Web Speech</span>
              </div>
              <p className="text-xs text-white/85 font-medium truncate">Speak hands-free to add meals & calories</p>
            </div>
          </div>
          <span className="text-xl shrink-0 ml-2">➔</span>
        </button>

        {/* Daily Intake Tracker Card */}
        <Link
          to="/tracker"
          className="mt-3 flex items-center justify-between w-full rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 hover:from-blue-800 hover:to-teal-800 active:scale-[0.98] text-white p-5 shadow-soft transition-all duration-200"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
              📋
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-lg leading-tight truncate">Daily Intake Tracker</p>
                <span className="text-[10px] uppercase font-bold bg-white/25 px-2 py-0.5 rounded-full shrink-0">WHO Safe Limits</span>
              </div>
              <p className="text-xs text-white/85 font-medium truncate">Sugar, salt, fat & additives budget</p>
            </div>
          </div>
          <span className="text-xl shrink-0 ml-2">➔</span>
        </Link>

        {/* 1-Tap Quick Demo Presets */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
              ⚡ Instant Demo Foods
            </h2>
            <span className="text-xs text-gray-400">Tap to analyze</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_SAMPLE_PRESETS.map((p) => (
              <button
                key={p.barcode}
                onClick={() => handleQuickPreset(p.barcode)}
                className="flex flex-col text-left p-3.5 rounded-2xl bg-white shadow-card border border-gray-100 hover:border-emerald-300 hover:shadow-soft transition-all active:scale-95 overflow-hidden"
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="text-2xl shrink-0">{p.icon}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 truncate max-w-[90px]">
                    {p.tag}
                  </span>
                </div>
                <p className="mt-2 text-xs font-black text-gray-900 truncate w-full">{p.name}</p>
                <p className="text-[11px] text-gray-500 font-medium truncate w-full">{p.category}</p>
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] w-full">
                  <span className="text-gray-400">Sugar wt%:</span>
                  <span className="font-bold text-pink-600">{p.sugarPct}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-2.5">
          <Link
            to="/explore"
            className="rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-2.5 sm:p-3.5 shadow-sm hover:border-purple-300 transition-all text-center flex flex-col items-center overflow-hidden min-w-0"
          >
            <span className="text-2xl shrink-0">🔍</span>
            <p className="mt-1 font-bold text-xs text-gray-900 truncate w-full">Explore</p>
            <p className="text-[10px] text-gray-500 truncate w-full">10k+ items</p>
          </Link>

          <Link
            to="/compare"
            className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-2.5 sm:p-3.5 shadow-sm hover:border-blue-300 transition-all text-center flex flex-col items-center overflow-hidden min-w-0"
          >
            <span className="text-2xl shrink-0">⚖️</span>
            <p className="mt-1 font-bold text-xs text-gray-900 truncate w-full">Compare</p>
            <p className="text-[10px] text-gray-500 truncate w-full">Duel items</p>
          </Link>

          <Link
            to="/profile/preferences"
            className="rounded-2xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-2.5 sm:p-3.5 shadow-sm hover:border-rose-300 transition-all text-center flex flex-col items-center overflow-hidden min-w-0"
          >
            <span className="text-2xl shrink-0">🩸</span>
            <p className="mt-1 font-bold text-xs text-gray-900 truncate w-full">Health Alerts</p>
            <p className="text-[10px] text-gray-500 truncate w-full">Custom risks</p>
          </Link>
        </div>

        {/* Scientific Fact of the Day - Food Science Tip */}
        <section
          aria-labelledby="food-science-tip-heading"
          className="mt-8 relative w-full rounded-2xl bg-amber-50/95 border border-amber-200/90 p-4 sm:p-5 text-xs text-amber-950 leading-relaxed shadow-xs overflow-hidden box-border"
        >
          <div className="flex items-center gap-2 font-black mb-1.5 text-amber-900">
            <span className="text-base shrink-0 select-none">🔬</span>
            <h2 id="food-science-tip-heading" className="uppercase tracking-wider text-[11px] font-extrabold text-amber-900 m-0 p-0">
              Food Science Tip
            </h2>
          </div>
          <p className="text-xs text-amber-900/95 leading-relaxed break-words">
            Ingredients are listed by weight, from highest to lowest. So an ingredient like sugar or oil appearing near the top means it's more abundant than those listed later — but position alone doesn't reveal the exact amount, and a top-3 spot can still be a modest share of the recipe.
          </p>
        </section>

        {/* Recent Scans Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
              Recent Scans
            </h2>
            <Link to="/history" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
              View all →
            </Link>
          </div>

          {loadingScans ? (
            <SkeletonRecentScans count={3} />
          ) : recentScans.length > 0 ? (
            <div className="space-y-2">
              {recentScans.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleQuickPreset(s.barcode || String(s.product_id))}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white shadow-card border border-gray-100 cursor-pointer hover:border-gray-200 overflow-hidden"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-2xl shrink-0">📦</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{s.product_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{s.brands || 'Product'}</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs font-bold shrink-0 ml-2">➔</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-6 text-center overflow-hidden">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-bold text-gray-600 mt-2">No recent scans</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Scan a barcode above or try a demo food preset!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Web Speech API Voice Meal Logger Modal */}
      <VoiceMealLoggerModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* PWA / Android APK Installation Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </SafeAreaView>
  )
}
