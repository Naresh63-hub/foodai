import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { toast } from 'sonner'
import axios from '../api/client'

interface ConditionOption {
  id: string
  title: string
  icon: string
  description: string
  category: 'metabolic' | 'cardio' | 'allergy' | 'special'
}

const AVAILABLE_CONDITIONS: ConditionOption[] = [
  {
    id: 'diabetes',
    title: 'Diabetes / Pre-diabetes',
    icon: '🩸',
    description: 'Warns on high simple sugars, maltodextrin, high GI syrups & fast carbs.',
    category: 'metabolic',
  },
  {
    id: 'hypertension',
    title: 'Hypertension / High BP',
    icon: '🫀',
    description: 'Flags high sodium (>1.25g salt/100g), MSG, sodium benzoate & baking soda.',
    category: 'cardio',
  },
  {
    id: 'heart_disease',
    title: 'High Cholesterol / Heart Health',
    icon: '🧈',
    description: 'Alerts on refined palm oil, hydrogenated fats, trans fats & saturated lipids.',
    category: 'cardio',
  },
  {
    id: 'child_mode',
    title: 'Child Mode (<12 yrs)',
    icon: '👶',
    description: 'Strict checks for synthetic azo dyes (Tartrazine, Sunset Yellow) & excess sugar.',
    category: 'special',
  },
  {
    id: 'celiac',
    title: 'Celiac / Gluten Sensitivity',
    icon: '🌾',
    description: 'Strict alerts for wheat, maida, atta, barley, rye, malt & gluten grains.',
    category: 'allergy',
  },
  {
    id: 'lactose',
    title: 'Lactose Intolerance',
    icon: '🥛',
    description: 'Detects milk solids, whey protein, casein, butterfat & dairy derivatives.',
    category: 'allergy',
  },
  {
    id: 'nut_allergy',
    title: 'Nut & Peanut Allergy',
    icon: '🥜',
    description: 'Severe allergy warning for peanuts, cashews, almonds & tree nuts.',
    category: 'allergy',
  },
  {
    id: 'soy_allergy',
    title: 'Soy Allergy',
    icon: '🌱',
    description: 'Flags soy protein, soya lecithin (INS 322) & soybean derivatives.',
    category: 'allergy',
  },
  {
    id: 'kidney_disease',
    title: 'Kidney / Renal Health',
    icon: '🫘',
    description: 'Warns on inorganic phosphate & potassium additives causing filtration strain.',
    category: 'metabolic',
  },
  {
    id: 'fatty_liver',
    title: 'Fatty Liver / NAFLD',
    icon: '🩺',
    description: 'Monitors high-fructose corn syrup, liquid sugars & hepatic fat drivers.',
    category: 'metabolic',
  },
]

export default function ProfilePreferences() {
  const navigate = useNavigate()
  const [age, setAge] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  
  const [initialAge, setInitialAge] = useState<string>('')
  const [initialWeight, setInitialWeight] = useState<string>('')
  const [initialConditions, setInitialConditions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const savedAge = localStorage.getItem('prefs_age') ?? ''
    const savedWeight = localStorage.getItem('prefs_weight') ?? ''
    const savedConditionsStr = localStorage.getItem('prefs_health_conditions') ?? '[]'
    
    let parsedConditions: string[] = []
    try {
      parsedConditions = JSON.parse(savedConditionsStr)
    } catch {
      parsedConditions = []
    }

    setAge(savedAge)
    setWeight(savedWeight)
    setSelectedConditions(parsedConditions)

    setInitialAge(savedAge)
    setInitialWeight(savedWeight)
    setInitialConditions(parsedConditions)
  }, [])

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
    age !== initialAge ||
    weight !== initialWeight ||
    !isConditionsEqual(selectedConditions, initialConditions)

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!isDirty) {
      toast.info('No changes to save')
      return
    }
    setSaving(true)
    const payload = {
      age: age ? Number(age) : null,
      body_weight_kg: weight ? Number(weight) : null,
      health_conditions: selectedConditions,
    }

    try {
      await axios.put('/users/profile/', payload)
      localStorage.setItem('prefs_age', age)
      localStorage.setItem('prefs_weight', weight)
      localStorage.setItem('prefs_health_conditions', JSON.stringify(selectedConditions))
      setInitialAge(age)
      setInitialWeight(weight)
      setInitialConditions(selectedConditions)
      toast.success('Health preferences saved successfully!')
      setTimeout(() => navigate('/profile'), 600)
    } catch {
      localStorage.setItem('prefs_age', age)
      localStorage.setItem('prefs_weight', weight)
      localStorage.setItem('prefs_health_conditions', JSON.stringify(selectedConditions))
      setInitialAge(age)
      setInitialWeight(weight)
      setInitialConditions(selectedConditions)
      toast.success('Health preferences saved (offline mode)')
      setTimeout(() => navigate('/profile'), 600)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView>
      <form onSubmit={handleSave} className="px-5 py-6 pb-28 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/profile"
            className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Health Profile & Alerts</h1>
            <p className="text-xs text-gray-500">Personalized warnings before you eat</p>
          </div>
        </div>

        {isDirty && (
          <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <p className="text-xs font-bold text-amber-800">
              You have unsaved changes. Tap Save below to activate these warnings.
            </p>
          </div>
        )}

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

        {/* AGE & BODY WEIGHT */}
        <div className="space-y-4 mb-6">
          <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
            Biometrics (Optional)
          </h2>

          <div className="rounded-2xl bg-white shadow-card p-4 border border-gray-100">
            <label htmlFor="age" className="block text-xs font-bold text-gray-800 mb-1.5">
              🎂 Age (Years)
            </label>
            <input
              id="age"
              type="number"
              min={0}
              max={130}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 28"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
            />
            <p className="text-[10px] text-gray-500 mt-1.5">
              Age under 12 automatically enables strict child safety rules for synthetic food dyes.
            </p>
          </div>

          <div className="rounded-2xl bg-white shadow-card p-4 border border-gray-100">
            <label htmlFor="weight" className="block text-xs font-bold text-gray-800 mb-1.5">
              ⚖️ Body Weight (kg)
            </label>
            <input
              id="weight"
              type="number"
              min={0}
              max={500}
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 68.5"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
            />
            <p className="text-[10px] text-gray-500 mt-1.5">
              Calculates your personal Acceptable Daily Intake (ADI mg/day) limits for food additives.
            </p>
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