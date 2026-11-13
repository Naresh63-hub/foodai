import { useState, useEffect, useMemo, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SafeAreaView from '../components/SafeAreaView'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../hooks/useUserPreferences'
import InstallAppModal from '../components/InstallAppModal'
import UpdateReleaseModal from '../components/UpdateReleaseModal'
import { useAppUpdate } from '../hooks/useAppUpdate'
import {
  CONDITION_MAP,
  GENDER_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  DIETARY_PREFERENCE_OPTIONS,
  HEALTH_GOAL_OPTIONS,
  getOptionLabel,
  calculateBMI,
  getBMICategory,
  estimateDailyCalories,
} from '../utils/healthMetrics'

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { values, save } = useUserPreferences()
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingQuickEdit, setSavingQuickEdit] = useState(false)

  const {
    currentVersion,
    isChecking,
    hasUpdate,
    releaseInfo,
    isModalOpen,
    closeModal,
    checkForUpdates,
  } = useAppUpdate(false)

  const email = user?.email ?? 'Not signed in'
  const savedName = values.name ?? ''
  const age = values.age ?? ''
  const weight = values.weight ?? ''
  const height = values.height ?? ''
  const gender = values.gender ?? ''
  const activityLevel = values.activityLevel ?? ''
  const dietaryPreference = values.dietaryPreference ?? ''
  const healthGoal = values.healthGoal ?? ''
  const dailyCalorieGoal = values.dailyCalorieGoal ?? ''
  const allergiesNotes = values.allergiesNotes ?? ''
  const conditions = values.conditions ?? []

  const displayName =
    savedName.trim() ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Food Explorer')

  const avatarLetter = displayName.charAt(0).toUpperCase() || 'F'

  // Inline quick-edit draft state
  const [draftName, setDraftName] = useState(savedName)
  const [draftAge, setDraftAge] = useState(age)
  const [draftWeight, setDraftWeight] = useState(weight)
  const [draftHeight, setDraftHeight] = useState(height)
  const [draftGender, setDraftGender] = useState(gender)
  const [draftActivity, setDraftActivity] = useState(activityLevel)
  const [draftDiet, setDraftDiet] = useState(dietaryPreference)
  const [draftGoal, setDraftGoal] = useState(healthGoal)
  const [draftCalorieGoal, setDraftCalorieGoal] = useState(dailyCalorieGoal)
  const [draftAllergiesNotes, setDraftAllergiesNotes] = useState(allergiesNotes)

  useEffect(() => {
    setDraftName(savedName)
    setDraftAge(age)
    setDraftWeight(weight)
    setDraftHeight(height)
    setDraftGender(gender)
    setDraftActivity(activityLevel)
    setDraftDiet(dietaryPreference)
    setDraftGoal(healthGoal)
    setDraftCalorieGoal(dailyCalorieGoal)
    setDraftAllergiesNotes(allergiesNotes)
  }, [
    savedName,
    age,
    weight,
    height,
    gender,
    activityLevel,
    dietaryPreference,
    healthGoal,
    dailyCalorieGoal,
    allergiesNotes,
  ])

  const bmi = useMemo(() => calculateBMI(weight, height), [weight, height])
  const bmiInfo = useMemo(() => (bmi !== null ? getBMICategory(bmi) : null), [bmi])
  const estimatedCalories = useMemo(
    () =>
      estimateDailyCalories({
        age,
        weight,
        height,
        gender,
        activityLevel,
        healthGoal,
      }),
    [age, weight, height, gender, activityLevel, healthGoal]
  )
  const activeCalorieTarget = dailyCalorieGoal || (estimatedCalories ? String(estimatedCalories) : '')

  const handleQuickSave = async (e: FormEvent) => {
    e.preventDefault()
    setSavingQuickEdit(true)
    const result = await save({
      name: draftName,
      age: draftAge,
      weight: draftWeight,
      height: draftHeight,
      gender: draftGender,
      activityLevel: draftActivity,
      dietaryPreference: draftDiet,
      healthGoal: draftGoal,
      dailyCalorieGoal: draftCalorieGoal,
      allergiesNotes: draftAllergiesNotes,
      conditions,
    })
    setSavingQuickEdit(false)
    setEditingProfile(false)
    if (result === 'server') {
      toast.success('Profile & health details saved')
    } else if (result === 'local') {
      toast.success('Profile & health preferences saved')
    } else {
      toast.success('Saved offline — will sync when online')
    }
  }

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
              {avatarLetter}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center text-[10px] border border-gray-200">
                ⚙️
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">
                {displayName}
              </h1>
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

        {/* HEALTH & BODY SNAPSHOT CARD (with inline Edit Profile) */}
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🩺</span>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Personal & Health Snapshot
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setEditingProfile((prev) => !prev)}
              className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
            >
              {editingProfile ? 'Close' : '✏️ Edit Profile'}
            </button>
          </div>

          {!editingProfile ? (
            <>
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Age</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    {age ? `${age} yrs` : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Weight</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    {weight ? `${weight} kg` : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Height</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    {height ? `${height} cm` : '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {bmi !== null && bmiInfo ? (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border ${bmiInfo.badgeClass}`}>
                    <span>BMI {bmi}</span>
                    <span>· {bmiInfo.label}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">
                    Add weight & height for BMI
                  </span>
                )}

                {activeCalorieTarget && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-orange-50 text-orange-800 border border-orange-200">
                    🔥 {activeCalorieTarget} kcal/day
                  </span>
                )}

                {dietaryPreference && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    🥗 {getOptionLabel(DIETARY_PREFERENCE_OPTIONS, dietaryPreference)}
                  </span>
                )}

                {healthGoal && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    🎯 {getOptionLabel(HEALTH_GOAL_OPTIONS, healthGoal)}
                  </span>
                )}
              </div>

              {allergiesNotes && (
                <p className="mt-3 text-[11px] text-gray-600 bg-amber-50/70 border border-amber-200/70 rounded-xl px-3 py-2">
                  <span className="font-bold text-amber-900">Notes: </span>
                  {allergiesNotes}
                </p>
              )}
            </>
          ) : (
            <form onSubmit={handleQuickSave} className="space-y-3">
              <div>
                <label htmlFor="profile-name-input" className="block text-[11px] font-bold text-gray-700 mb-1">
                  👤 Full Name
                </label>
                <input
                  id="profile-name-input"
                  type="text"
                  maxLength={120}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="profile-age-input" className="block text-[11px] font-bold text-gray-700 mb-1">
                    🎂 Age
                  </label>
                  <input
                    id="profile-age-input"
                    type="number"
                    min={0}
                    max={120}
                    value={draftAge}
                    onChange={(e) => setDraftAge(e.target.value)}
                    placeholder="yrs"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="profile-weight-input" className="block text-[11px] font-bold text-gray-700 mb-1">
                    ⚖️ Weight (kg)
                  </label>
                  <input
                    id="profile-weight-input"
                    type="number"
                    min={1}
                    max={500}
                    step="0.1"
                    value={draftWeight}
                    onChange={(e) => setDraftWeight(e.target.value)}
                    placeholder="kg"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="profile-height-input" className="block text-[11px] font-bold text-gray-700 mb-1">
                    📏 Height (cm)
                  </label>
                  <input
                    id="profile-height-input"
                    type="number"
                    min={30}
                    max={300}
                    step="0.5"
                    value={draftHeight}
                    onChange={(e) => setDraftHeight(e.target.value)}
                    placeholder="cm"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="profile-gender-select" className="block text-[11px] font-bold text-gray-700 mb-1">
                    🧬 Sex
                  </label>
                  <select
                    id="profile-gender-select"
                    value={draftGender}
                    onChange={(e) => setDraftGender(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  >
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="profile-diet-select" className="block text-[11px] font-bold text-gray-700 mb-1">
                    🥗 Diet
                  </label>
                  <select
                    id="profile-diet-select"
                    value={draftDiet}
                    onChange={(e) => setDraftDiet(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  >
                    {DIETARY_PREFERENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="profile-goal-select" className="block text-[11px] font-bold text-gray-700 mb-1">
                    🎯 Health Goal
                  </label>
                  <select
                    id="profile-goal-select"
                    value={draftGoal}
                    onChange={(e) => setDraftGoal(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  >
                    {HEALTH_GOAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="profile-activity-select" className="block text-[11px] font-bold text-gray-700 mb-1">
                    🏃 Activity
                  </label>
                  <select
                    id="profile-activity-select"
                    value={draftActivity}
                    onChange={(e) => setDraftActivity(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  >
                    {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="profile-calories-input" className="block text-[11px] font-bold text-gray-700 mb-1">
                    🔥 Calorie Goal (kcal)
                  </label>
                  <input
                    id="profile-calories-input"
                    type="number"
                    min={500}
                    max={10000}
                    step={10}
                    value={draftCalorieGoal}
                    onChange={(e) => setDraftCalorieGoal(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="profile-notes-input" className="block text-[11px] font-bold text-gray-700 mb-1">
                    📝 Allergy Notes
                  </label>
                  <input
                    id="profile-notes-input"
                    type="text"
                    maxLength={1000}
                    value={draftAllergiesNotes}
                    onChange={(e) => setDraftAllergiesNotes(e.target.value)}
                    placeholder="e.g. Sesame, dyes"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuickEdit}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs transition-colors disabled:opacity-60"
                >
                  {savingQuickEdit ? 'Saving…' : 'Save Details'}
                </button>
              </div>
            </form>
          )}
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
                const info = CONDITION_MAP[c] || { title: c, icon: '⚠️' }
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
                <span className="text-2xl">👤</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Full Name</p>
                  <p className="text-xs text-gray-500">
                    {savedName.trim() ? savedName : 'Not set · Tap to add your name'}
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
                  <p className="text-sm font-bold text-gray-900">Body Weight & Height</p>
                  <p className="text-xs text-gray-500">
                    {weight || height
                      ? `${weight ? `${weight} kg` : '—'} · ${height ? `${height} cm` : '—'}${bmi !== null ? ` (BMI ${bmi})` : ''}`
                      : 'Not set · Optional'}
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
                <span className="text-2xl">🥗</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Diet, Activity & Goals</p>
                  <p className="text-xs text-gray-500">
                    {getOptionLabel(DIETARY_PREFERENCE_OPTIONS, dietaryPreference)} · {getOptionLabel(HEALTH_GOAL_OPTIONS, healthGoal)}
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
              onClick={() => checkForUpdates(true)}
              disabled={isChecking}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">Check for App Updates</p>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      v{currentVersion}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {isChecking
                      ? 'Checking GitHub Releases...'
                      : hasUpdate
                      ? 'New version available! Tap to install ➔'
                      : 'App is up to date · Tap to re-check'}
                  </p>
                </div>
              </div>
              <span className="text-emerald-700 text-xs font-bold px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/80 transition-colors">
                {isChecking ? '...' : hasUpdate ? 'Update 🚀' : 'Check'}
              </span>
            </button>

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

      {/* App Update Release Modal */}
      <UpdateReleaseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        releaseInfo={releaseInfo}
      />
    </SafeAreaView>
  )
}
