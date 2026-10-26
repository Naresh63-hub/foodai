import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../hooks/useUserPreferences'
import InstallAppModal from '../components/InstallAppModal'

const CONDITION_NAMES: Record<string, { title: string; icon: string }> = {
  diabetes: { title: 'Diabetes / Pre-diabetes', icon: '🩸' },
  hypertension: { title: 'Hypertension / High BP', icon: '🫀' },
  heart_disease: { title: 'High Cholesterol / Heart Health', icon: '🧈' },
  child_mode: { title: 'Child Mode (<12 yrs)', icon: '👶' },
  celiac: { title: 'Celiac / Gluten Sensitivity', icon: '🌾' },
  lactose: { title: 'Lactose Intolerance', icon: '🥛' },
  nut_allergy: { title: 'Nut & Peanut Allergy', icon: '🥜' },
  soy_allergy: { title: 'Soy Allergy', icon: '🌱' },
  kidney_disease: { title: 'Kidney / Renal Health', icon: '🫘' },
  fatty_liver: { title: 'Fatty Liver / NAFLD', icon: '🩺' },
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { values } = useUserPreferences()
  const [showInstallModal, setShowInstallModal] = useState(false)
  const email = user?.email ?? 'Not signed in'
  const { age, weight } = values
  const conditions = values.conditions

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-36 max-w-md mx-auto">
        {/* Profile & Settings Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl font-black shadow-soft relative shrink-0">
              {email.charAt(0).toUpperCase()}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center text-[10px] border border-gray-200">
                ⚙️
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">
                  Profile & Settings
                </h1>
              </div>
              <p className="text-xs text-gray-500 font-medium truncate">{email}</p>
            </div>
          </div>
          <Link
            to="/profile/preferences"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shrink-0 active:scale-95"
            title="Configure Dietary Preferences & Settings"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
        </div>

        {/* ACTIVE HEALTH CONDITIONS CARD */}
        <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-emerald-950 text-white p-5 shadow-soft mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-300">
                Active Health Alerts
              </h2>
            </div>
            <Link
              to="/profile/preferences"
              className="text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-full hover:bg-emerald-500/30 transition-colors"
            >
              Configure ›
            </Link>
          </div>

          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => {
                const info = CONDITION_NAMES[c] || { title: c, icon: '⚠️' }
                return (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                  >
                    <span>{info.icon}</span>
                    <span>{info.title}</span>
                  </span>
                )
              })}
            </div>
          ) : (
            <div className="py-2 text-emerald-200/80 text-xs">
              <p>No health conditions set yet.</p>
              <Link
                to="/profile/preferences"
                className="inline-block mt-2 font-bold text-emerald-300 underline"
              >
                + Add Diabetes, High BP, or Allergies
              </Link>
            </div>
          )}
        </div>

        {/* DIETARY PREFERENCES & HEALTH SETTINGS */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <span>⚙️</span>
              <span>Personal Dietary Settings</span>
            </h2>
            <Link
              to="/profile/preferences"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              Edit all →
            </Link>
          </div>
          <div className="rounded-2xl bg-white shadow-card border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            <Link
              to="/profile/preferences"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🩸</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Health Conditions</p>
                  <p className="text-xs text-gray-500">
                    {conditions.length > 0
                      ? `${conditions.length} condition(s) configured`
                      : 'Tap to configure conditions'}
                  </p>
                </div>
              </div>
              <span className="text-gray-400 text-base font-bold">›</span>
            </Link>

            <Link
              to="/profile/preferences"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎂</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Age & Child Safety Mode</p>
                  <p className="text-xs text-gray-500">
                    {age ? `${age} years` : 'Not set · Optional'}
                  </p>
                </div>
              </div>
              <span className="text-gray-400 text-base font-bold">›</span>
            </Link>

            <Link
              to="/profile/preferences"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚖️</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Body Weight</p>
                  <p className="text-xs text-gray-500">
                    {weight ? `${weight} kg` : 'Not set · Optional'}
                  </p>
                </div>
              </div>
              <span className="text-gray-400 text-base font-bold">›</span>
            </Link>
          </div>
        </div>

        {/* APP & ACCOUNT SETTINGS */}
        <div className="mb-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2 px-1 flex items-center gap-1.5">
            <span>📱</span>
            <span>App & Account Settings</span>
          </h2>
          <div className="rounded-2xl bg-white shadow-card border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📲</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Install FoodAI App</p>
                  <p className="text-xs text-gray-500">Android APK & Home Screen PWA</p>
                </div>
              </div>
              <span className="text-gray-400 text-base font-bold">›</span>
            </button>

            <Link
              to="/forgot-password"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔐</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Account Security</p>
                  <p className="text-xs text-gray-500">Reset password or update credentials</p>
                </div>
              </div>
              <span className="text-gray-400 text-base font-bold">›</span>
            </Link>
          </div>
        </div>

        {/* LOG OUT BUTTON */}
        <div>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3.5 border border-rose-200 transition-colors flex items-center justify-center gap-2 text-sm active:scale-98"
          >
            <span className="text-base">🚪</span>
            Log out
          </button>
        </div>

        <div className="mt-8 text-center text-[10px] text-gray-400 font-medium">
          FoodAI Personal Food Intelligence · FSSAI & WHO/JECFA Compliant
        </div>
      </div>

      {/* Install Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </SafeAreaView>
  )
}
