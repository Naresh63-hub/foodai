import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { toast } from 'sonner'
import { useUserPreferences } from '../hooks/useUserPreferences'
import {
  AVAILABLE_CONDITIONS,
  GENDER_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  DIETARY_PREFERENCE_OPTIONS,
  HEALTH_GOAL_OPTIONS,
  calculateBMI,
  getBMICategory,
  estimateDailyCalories,
} from '../utils/healthMetrics'

export default function ProfilePreferences() {
  const navigate = useNavigate()
  const { values, hydrating, save } = useUserPreferences()

  const [name, setName] = useState<string>(values.name ?? '')
  const [age, setAge] = useState<string>(values.age ?? '')
  const [weight, setWeight] = useState<string>(values.weight ?? '')
  const [height, setHeight] = useState<string>(values.height ?? '')
  const [gender, setGender] = useState<string>(values.gender ?? '')
  const [activityLevel, setActivityLevel] = useState<string>(values.activityLevel ?? '')
  const [dietaryPreference, setDietaryPreference] = useState<string>(values.dietaryPreference ?? '')
  const [healthGoal, setHealthGoal] = useState<string>(values.healthGoal ?? '')
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<string>(values.dailyCalorieGoal ?? '')
  const [allergiesNotes, setAllergiesNotes] = useState<string>(values.allergiesNotes ?? '')
  const [selectedConditions, setSelectedConditions] = useState<string[]>(values.conditions ?? [])
  const [saving, setSaving] = useState(false)

  // Re-seed the editable draft whenever the committed values change
  // (e.g. once server hydration completes).
  useEffect(() => {
    setName(values.name ?? '')
    setAge(values.age ?? '')
    setWeight(values.weight ?? '')
    setHeight(values.height ?? '')
    setGender(values.gender ?? '')
    setActivityLevel(values.activityLevel ?? '')
    setDietaryPreference(values.dietaryPreference ?? '')
    setHealthGoal(values.healthGoal ?? '')
    setDailyCalorieGoal(values.dailyCalorieGoal ?? '')
    setAllergiesNotes(values.allergiesNotes ?? '')
    setSelectedConditions(values.conditions ?? [])
  }, [values])

  const toggleCondition = (id: string) => {
    setSelectedConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const isConditionsEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false
    const setA = new Set(a)
    return b.every((item) => setA.has(item))
  }

  const isDirty =
    name !== (values.name ?? '') ||
    age !== (values.age ?? '') ||
    weight !== (values.weight ?? '') ||
    height !== (values.height ?? '') ||
    gender !== (values.gender ?? '') ||
    activityLevel !== (values.activityLevel ?? '') ||
    dietaryPreference !== (values.dietaryPreference ?? '') ||
    healthGoal !== (values.healthGoal ?? '') ||
    dailyCalorieGoal !== (values.dailyCalorieGoal ?? '') ||
    allergiesNotes !== (values.allergiesNotes ?? '') ||
    !isConditionsEqual(selectedConditions, values.conditions ?? [])

  const bmi = calculateBMI(weight, height)
  const bmiInfo = bmi !== null ? getBMICategory(bmi) : null
  const estimatedCalories = estimateDailyCalories({
    age,
    weight,
    height,
    gender,
    activityLevel,
    healthGoal,
  })

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!isDirty) {
      toast.info('No changes to save')
      return
    }
    setSaving(true)
    const result = await save({
      name,
      age,
      weight,
      height,
      gender,
      activityLevel,
      dietaryPreference,
      healthGoal,
      dailyCalorieGoal,
      allergiesNotes,
      conditions: selectedConditions,
    })
    setSaving(false)
    if (result === 'server') {
      toast.success('Health profile saved to your account')
    } else if (result === 'local') {
      toast.success('Health preferences saved')
    } else {
      toast.success('Saved offline — will sync when you sign in')
    }
    setTimeout(() => navigate('/profile'), 500)
  }

  if (hydrating) {
    return (
      <SafeAreaView>
        <div className="flex h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-600"></div>
        </div>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView>
      <form onSubmit={handleSave} className="px-5 py-6 pb-28 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/profile"
            className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors"
            aria-label="Back to profile"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Health Profile & Settings</h1>
            <p className="text-xs text-gray-500">Personal details, biometrics & nutrition alerts</p>
          </div>
        </div>

        {isDirty && (
          <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <p className="text-xs font-bold text-amber-800">
              You have unsaved changes. Tap Save below to apply your updates.
            </p>
          </div>
        )}

        {/* PERSONAL DETAILS & BIOMETRICS */}
        <div className="space-y-4 mb-6">
          <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
            Personal Details & Body Metrics
          </h2>

          <div className="rounded-2xl bg-white shadow-card p-4 border border-gray-100 space-y-4">
            <div>
              <label htmlFor="full-name" className="block text-xs font-bold text-gray-800 mb-1.5">
                👤 Full Name
              </label>
              <input
                id="full-name"
                type="text"
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="age" className="block text-xs font-bold text-gray-800 mb-1.5">
                  🎂 Age (Years)
                </label>
                <input
                  id="age"
                  type="number"
                  min={0}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="weight" className="block text-xs font-bold text-gray-800 mb-1.5">
                  ⚖️ Weight (kg)
                </label>
                <input
                  id="weight"
                  type="number"
                  min={1}
                  max={500}
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 68.5"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="height" className="block text-xs font-bold text-gray-800 mb-1.5">
                  📏 Height (cm)
                </label>
                <input
                  id="height"
                  type="number"
                  min={30}
                  max={300}
                  step="0.5"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 172"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-xs font-bold text-gray-800 mb-1.5">
                  🧬 Biological Sex
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(bmi !== null || estimatedCalories !== null) && (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3 flex flex-wrap items-center justify-between gap-2">
                {bmi !== null && bmiInfo && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">BMI: {bmi}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${bmiInfo.badgeClass}`}>
                      {bmiInfo.label}
                    </span>
                  </div>
                )}
                {estimatedCalories !== null && (
                  <span className="text-xs font-bold text-emerald-800">
                    🔥 Est. {estimatedCalories} kcal/day
                  </span>
                )}
              </div>
            )}

            <p className="text-[10px] text-gray-500">
              Age (&lt;12 yrs enables child dye safety), weight, and height tailor Acceptable Daily Intake (ADI) limits and calorie targets.
            </p>
          </div>
        </div>

        {/* LIFESTYLE, DIET & HEALTH GOALS */}
        <div className="space-y-4 mb-6">
          <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
            Diet, Activity & Health Goals
          </h2>

          <div className="rounded-2xl bg-white shadow-card p-4 border border-gray-100 space-y-4">
            <div>
              <label htmlFor="dietary-preference" className="block text-xs font-bold text-gray-800 mb-1.5">
                🥗 Dietary Preference
              </label>
              <select
                id="dietary-preference"
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
              >
                {DIETARY_PREFERENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="health-goal" className="block text-xs font-bold text-gray-800 mb-1.5">
                🎯 Primary Health Goal
              </label>
              <select
                id="health-goal"
                value={healthGoal}
                onChange={(e) => setHealthGoal(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
              >
                {HEALTH_GOAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="activity-level" className="block text-xs font-bold text-gray-800 mb-1.5">
                🏃 Activity Level
              </label>
              <select
                id="activity-level"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
              >
                {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="daily-calorie-goal" className="block text-xs font-bold text-gray-800 mb-1.5">
                🔥 Daily Calorie Target (kcal, Optional)
              </label>
              <input
                id="daily-calorie-goal"
                type="number"
                min={500}
                max={10000}
                step={10}
                value={dailyCalorieGoal}
                onChange={(e) => setDailyCalorieGoal(e.target.value)}
                placeholder={estimatedCalories ? `Auto-estimated: ${estimatedCalories} kcal` : 'e.g. 2000'}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* HEALTH CONDITIONS SELECTOR */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                My Health Conditions
              </h2>
              <p className="text-xs text-gray-500">
                Select your conditions to get instant alerts on every scan
              </p>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
              {selectedConditions.length} Active
            </span>
          </div>

          <div className="space-y-2.5">
            {AVAILABLE_CONDITIONS.map((cond) => {
              const isSelected = selectedConditions.includes(cond.id)
              return (
                <button
                  type="button"
                  key={cond.id}
                  onClick={() => toggleCondition(cond.id)}
                  className={[
                    'w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3',
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-400'
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-card',
                  ].join(' ')}
                >
                  <span className="text-2xl pt-0.5">{cond.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={[
                        'text-sm font-bold',
                        isSelected ? 'text-emerald-950' : 'text-gray-900'
                      ].join(' ')}>
                        {cond.title}
                      </p>
                      <div className={[
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs font-black transition-colors',
                        isSelected ? 'bg-emerald-600 text-white' : 'border-2 border-gray-300 bg-white'
                      ].join(' ')}>
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      {cond.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ALLERGIES & HEALTH NOTES */}
        <div className="space-y-2 mb-6">
          <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
            Additional Allergies & Health Notes
          </h2>
          <div className="rounded-2xl bg-white shadow-card p-4 border border-gray-100">
            <label htmlFor="allergies-notes" className="block text-xs font-bold text-gray-800 mb-1.5">
              📝 Custom Allergies, Intolerances or Notes
            </label>
            <textarea
              id="allergies-notes"
              rows={3}
              maxLength={1000}
              value={allergiesNotes}
              onChange={(e) => setAllergiesNotes(e.target.value)}
              placeholder="e.g. Avoid artificial sweeteners, sesame seeds, or sulfites..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/profile"
            className="rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 text-center text-sm transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !isDirty}
            className={[
              'rounded-2xl font-bold py-3.5 transition-all text-white text-sm shadow-soft',
              saving || !isDirty
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]',
            ].join(' ')}
          >
            {saving ? 'Saving…' : 'Save Health Profile'}
          </button>
        </div>
      </form>
    </SafeAreaView>
  )
}
