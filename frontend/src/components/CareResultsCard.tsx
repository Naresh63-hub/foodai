import React from 'react'
import { CareAnalysisResult } from '../types/food'

interface CareResultsCardProps {
  data: CareAnalysisResult
  onReset?: () => void
}

export default function CareResultsCard({ data, onReset }: CareResultsCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-rose-600 bg-rose-50 border-rose-200'
  }

  const getSeverityBadge = (severity?: string) => {
    switch ((severity || '').toLowerCase()) {
      case 'high':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Top Header Card with Clean Score */}
      <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80 mb-1.5">
              🧴 {data.product_category || 'Personal Care & Cosmetics'}
            </span>
            <h2 className="text-xl font-black text-gray-950 tracking-tight truncate">
              {data.product_name}
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Cosmetic Ingredient & Toxicity Analysis
            </p>
          </div>

          {/* Clean Score Circle */}
          <div
            className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border shrink-0 font-black shadow-xs ${getScoreColor(
              data.clean_score,
            )}`}
          >
            <span className="text-2xl leading-none">{data.clean_score}</span>
            <span className="text-[9px] font-extrabold uppercase tracking-wider mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Hazard Level Banner */}
        <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
          <span className="text-gray-500">Toxicity Assessment:</span>
          <span
            className={`px-3 py-1 rounded-full border ${
              data.clean_score >= 80
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : data.clean_score >= 50
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {data.hazard_level}
          </span>
        </div>

        {/* Comedogenic Rating & Skin Type Compatibility */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Pore Clogging (0-5)</span>
            <span className="font-extrabold text-gray-900 mt-0.5 block">
              Scale {data.comedogenic_rating} / 5 ·{' '}
              {data.comedogenic_rating <= 1
                ? 'Non-Comedogenic'
                : data.comedogenic_rating <= 2
                ? 'Low Clog Risk'
                : 'Pore Clogging'}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Sensitive Skin Safe</span>
            <span className="font-extrabold text-gray-900 mt-0.5 block">
              {data.skin_compatibility?.sensitive_skin ? '✅ Yes (Gentle)' : '⚠️ Caution (Sensitizers)'}
            </span>
          </div>
        </div>
      </div>

      {/* Harmful / Irritant Ingredients Alert */}
      {data.harmful_ingredients && data.harmful_ingredients.length > 0 && (
        <div className="rounded-3xl bg-rose-50/70 border border-rose-200/80 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚠️</span>
            <h3 className="text-sm font-extrabold text-rose-950 uppercase tracking-wider">
              Flagged Ingredients ({data.harmful_ingredients.length})
            </h3>
          </div>
          <div className="space-y-2.5">
            {data.harmful_ingredients.map((item, idx) => (
              <div key={idx} className="p-3 bg-white rounded-2xl border border-rose-100 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-gray-900">{item.name}</span>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                      item.hazard_severity,
                    )}`}
                  >
                    {item.hazard_severity} Risk
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{item.category}</p>
                <p className="text-xs text-rose-900/90 font-medium mt-1 leading-relaxed">
                  {item.concern}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Beneficial Actives */}
      {data.beneficial_ingredients && data.beneficial_ingredients.length > 0 && (
        <div className="rounded-3xl bg-emerald-50/70 border border-emerald-200/80 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✨</span>
            <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider">
              Beneficial Skin Actives
            </h3>
          </div>
          <div className="space-y-2">
            {data.beneficial_ingredients.map((item, idx) => (
              <div key={idx} className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-xs">
                <span className="text-xs font-black text-gray-900 block">{item.name}</span>
                <p className="text-xs text-emerald-950/90 font-medium mt-0.5 leading-relaxed">
                  {item.benefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clean Alternatives / Swaps */}
      {data.clean_swaps && data.clean_swaps.length > 0 && (
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🌱</span>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              Cleaner Non-Toxic Alternatives
            </h3>
          </div>
          <div className="space-y-2.5">
            {data.clean_swaps.map((swap, idx) => (
              <div key={idx} className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-200/80">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  {swap.category}
                </span>
                <p className="text-xs font-black text-gray-950 mt-0.5">{swap.name}</p>
                <p className="text-xs text-gray-600 font-medium mt-1">{swap.why_better}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regulatory & Safety Disclaimer */}
      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/70 text-center">
        <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
          {data.disclaimer}
        </p>
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="w-full py-3.5 px-4 rounded-2xl bg-gray-900 hover:bg-black active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md"
        >
          ← Scan Another Care Product
        </button>
      )}
    </div>
  )
}
