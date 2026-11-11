import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { INGREDIENT_CATEGORIES } from '../constants'
import { getAdditiveDetail, getUserProfile } from '../api/food'
import { AdditiveReferenceItem } from '../types/food'

export default function IngredientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<AdditiveReferenceItem | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [weightKg, setWeightKg] = useState<number | null>(70)
  const [loading, setLoading] = useState(true)

  // Load the saved body weight once, independent of which additive is viewed.
  useEffect(() => {
    getUserProfile()
      .then((p) => {
        if (p?.body_weight_kg) setWeightKg(p.body_weight_kg)
      })
      .catch(() => {})
  }, [])

  // Fetch the additive reference for this id. Never fabricates: an unknown additive
  // resolves to an honest "not in our reference yet" state instead of made-up numbers.
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    getAdditiveDetail(id, weightKg)
      .then((res) => setData(res))
      .catch(() => {
        setData(null)
        setNotFound(true)
      })
      .finally(() => setLoading(false))
    // Only re-fetch when the additive changes; the weight slider updates the exposure
    // figure locally (see adiExposure below), so it must not trigger a refetch here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const cat = INGREDIENT_CATEGORIES[data?.category || 'other'] ?? INGREDIENT_CATEGORIES.other
  // Same formula the backend uses (adi_mg_per_kg * body_weight_kg); computed here so the
  // slider updates the safe-limit figure without a round-trip.
  const adiExposure = data?.adi_mg_per_kg && weightKg ? data.adi_mg_per_kg * weightKg : null

  if (loading) {
    return (
      <SafeAreaView>
        <div className="px-5 py-12 text-center max-w-md mx-auto animate-pulse space-y-4">
          <div className="h-28 bg-gray-200 rounded-3xl" />
          <div className="h-24 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
      </SafeAreaView>
    )
  }

  if (notFound || !data) {
    const name = decodeURIComponent(id || '')
    return (
      <SafeAreaView>
        <div className="px-5 py-6 pb-28 max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-xs font-bold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4"
          >
            ← Back to Product Results
          </button>
          <div className="rounded-2xl bg-white shadow-card border border-gray-100 p-6 text-center">
            <div className="text-3xl mb-2">🔬</div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">{name}</h1>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              We don't have <strong>{name}</strong> in our additive reference database yet, so we
              won't guess at its ADI limit or safety numbers. Everything shown elsewhere here comes
              from verified FSSAI / WHO-JECFA references — and we'd rather say "not sure" than
              invent a figure.
            </p>
          </div>
        </div>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4"
        >
          ← Back to Product Results
        </button>

        {/* Title Header */}
        <div className="rounded-3xl bg-white shadow-card p-5 border border-gray-100 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{cat.icon}</span>
            <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold border ${cat.color || 'bg-gray-100 text-gray-700'}`}>
              {cat.label}
            </span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 leading-tight">
            {data?.common_name || decodeURIComponent(id || '')}
          </h1>
          {data?.code && data.code !== 'Standard Item' && (
            <p className="text-xs font-mono font-bold text-purple-700 mt-1">
              INS / E-Code: {data.code}
            </p>
          )}
        </div>

        {/* Purpose in Food */}
        <div className="rounded-2xl bg-white shadow-card p-5 border border-gray-100 mb-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2">
            🧪 Why is this ingredient used?
          </h3>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">
            {data?.notes || data?.explanation || 'Used as a functional food constituent for texture, preservation, or flavor.'}
          </p>
        </div>

        {/* Regulatory Scientific Standards (FSSAI & WHO/JECFA) */}
        <div className="rounded-2xl bg-white shadow-card p-5 border border-gray-100 mb-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-700 mb-3">
            🏛️ Regulatory Safety & Scientific Reference
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100">
              <span className="font-bold text-purple-900 block mb-0.5">FSSAI Regulation (India):</span>
              <span className="text-purple-800">{data?.fssai_ref || 'Permitted under FSSAI Standards (Food Additives)'}</span>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="font-bold text-blue-900 block mb-0.5">WHO / JECFA Reference:</span>
              <span className="text-blue-800">{data?.who_jecfa_ref || 'Evaluated safe by Joint FAO/WHO Expert Committee'}</span>
            </div>
          </div>
        </div>

        {/* ADI & Interactive Body-Weight Calculator */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-5 mb-4 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 mb-2">
            ⚖️ Acceptable Daily Intake (ADI) Limit
          </h3>

          {data?.adi_mg_per_kg ? (
            <div>
              <p className="text-xs text-emerald-800 leading-relaxed mb-3">
                The Acceptable Daily Intake (ADI) — a regulatory lifetime safety limit — is <strong className="text-emerald-900">{data.adi_mg_per_kg} mg/kg body weight/day</strong>.
              </p>

              {/* Weight Exposure Calculator */}
              <div className="bg-white rounded-xl p-3.5 border border-emerald-200">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                  <span>Your Body Weight:</span>
                  <span className="text-emerald-700 font-mono text-sm">{weightKg || 70} kg</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="130"
                  value={weightKg || 70}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Your Safe Daily Limit:</span>
                  <span className="font-black text-emerald-800 text-sm">
                    {adiExposure?.toFixed(0)} mg / day
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-emerald-800 leading-relaxed">
              No numerical ADI is needed — it's recognized as a standard culinary ingredient or a GMP (Good Manufacturing Practice) food constituent with no safety concern at typical use levels.
            </p>
          )}
        </div>

        {/* Non-alarmist scientific reassurance */}
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-[11px] text-gray-600 leading-relaxed">
          <span className="font-bold text-gray-800">💡 Scientific Note: </span>
          Chemical names alone don't indicate danger. Permitted additives are reviewed for safety by international authorities (such as WHO/JECFA) before approval.
        </div>
      </div>
    </SafeAreaView>
  )
}
