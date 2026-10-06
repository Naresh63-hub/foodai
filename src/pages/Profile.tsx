import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { getUserFoodScans, StoredFoodScan } from '../services/firestoreService'

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
  const email = user?.email ?? 'Not signed in'
  const { age, weight } = values
  const conditions = values.conditions

  const [cloudScans, setCloudScans] = useState<StoredFoodScan[]>([])
  const [loadingScans, setLoadingScans] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      setLoadingScans(true)
      getUserFoodScans(user.uid)
        .then((res) => {
          if (Array.isArray(res)) setCloudScans(res)
        })
        .catch(() => {})
        .finally(() => setLoadingScans(false))
    }
  }, [user?.uid])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <SafeAreaView>
      <div className="px-4 sm:px-5 py-6 pb-36 max-w-md mx-auto w-full box-border">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl font-black shadow-soft">
            {email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Health Profile</h1>
            <p className="text-xs text-gray-500 font-medium">{email}</p>
          </div>
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

        {/* PREFERENCES LIST */}
        <div className="rounded-2xl bg-white shadow-card border border-gray-100 divide-y divide-gray-100 overflow-hidden mb-6">
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
                <p className="text-sm font-bold text-gray-900">Age</p>
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

        {/* CLOUD FOOD SCANS (FIRESTORE PERSISTENCE) */}
        <div className="mb-6 p-4 rounded-3xl bg-white shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">☁️</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-800">
                Firestore Saved Food Scans ({cloudScans.length})
              </h2>
            </div>
            <Link to="/camera-snap" className="text-xs font-bold text-emerald-700 hover:underline">
              + New Snap
            </Link>
          </div>

          {loadingScans ? (
            <p className="text-xs text-gray-400 py-3 text-center">Loading saved scans...</p>
          ) : cloudScans.length > 0 ? (
            <div className="space-y-2">
              {cloudScans.slice(0, 5).map((scan) => (
                <div
                  key={scan.id}
                  className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-black text-gray-900">{scan.foodName}</p>
                    <p className="text-[10px] text-gray-500">
                      {scan.servingDescription} • {new Date(scan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-700 block">
                      {scan.caloriesKcal} kcal
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      Score: {scan.healthScore}/100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-xs">
              <p>No food photo scans saved yet.</p>
              <Link
                to="/camera-snap"
                className="inline-block mt-1 text-emerald-700 font-bold hover:underline"
              >
                Snap your first food photo with Gemini ➔
              </Link>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3.5 border border-rose-200 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span className="text-base">🚪</span>
            Log out
          </button>
        </div>

        <div className="mt-8 text-center text-[10px] text-gray-400 font-medium">
          FoodAI Personal Food Intelligence · FSSAI & WHO/JECFA Compliant
        </div>
      </div>
    </SafeAreaView>
  )
}