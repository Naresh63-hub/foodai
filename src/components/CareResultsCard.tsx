import React, { useState } from 'react'
import { CareAnalysisResult, CareIngredientDetail } from '../types/food'

interface CareResultsCardProps {
  data: CareAnalysisResult
  onReset?: () => void
}

export default function CareResultsCard({ data, onReset }: CareResultsCardProps) {
  const [filter, setFilter] = useState<'all' | 'hazardous' | 'caution' | 'safe'>('all')
  const [expandedChemical, setExpandedChemical] = useState<string | null>(null)

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-rose-600 bg-rose-50 border-rose-200'
  }

  const getSeverityBadge = (severity?: string) => {
    switch ((severity || '').toLowerCase()) {
      case 'high':
      case 'hazardous':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'moderate':
      case 'caution':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  }

  const allIngredients = data.all_ingredients_breakdown || []
  const filteredIngredients = allIngredients.filter((ing) => {
    if (filter === 'all') return true
    return ing.safety_rating === filter
  })

  const safeCount = data.hazard_summary?.safe_count ?? allIngredients.filter((i) => i.safety_rating === 'safe').length
  const cautionCount =
    data.hazard_summary?.moderate_hazard_count ?? allIngredients.filter((i) => i.safety_rating === 'caution').length
  const hazardousCount =
    data.hazard_summary?.high_hazard_count ?? allIngredients.filter((i) => i.safety_rating === 'hazardous').length

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
              data.clean_score
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

        {/* Chemical Count Summary Row */}
        {allIngredients.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-gray-500">Label Chemicals ({allIngredients.length}):</span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                🟢 {safeCount} Safe
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                🟡 {cautionCount} Caution
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                🔴 {hazardousCount} High
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FULL CHEMICAL INGREDIENTS BREAKDOWN (LIKE FOOD DNA) */}
      {allIngredients.length > 0 && (
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧪</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                  Label Chemical Breakdown
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">
                  Tap any chemical to see its function & skin impact
                </p>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex rounded-xl bg-gray-100 p-1 gap-1 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                filter === 'all' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500'
              }`}
            >
              All ({allIngredients.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('hazardous')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                filter === 'hazardous' ? 'bg-white text-rose-700 shadow-xs font-black' : 'text-gray-500'
              }`}
            >
              🔴 High ({hazardousCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('caution')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                filter === 'caution' ? 'bg-white text-amber-700 shadow-xs font-black' : 'text-gray-500'
              }`}
            >
              🟡 Caution ({cautionCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('safe')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                filter === 'safe' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'text-gray-500'
              }`}
            >
              🟢 Safe ({safeCount})
            </button>
          </div>

          {/* Chemical List */}
          <div className="space-y-2 pt-1 max-h-96 overflow-y-auto pr-0.5">
            {filteredIngredients.map((ing, idx) => {
              const isExpanded = expandedChemical === ing.name
              return (
                <div
                  key={idx}
                  onClick={() => setExpandedChemical(isExpanded ? null : ing.name)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    ing.safety_rating === 'hazardous'
                      ? 'bg-rose-50/50 border-rose-200/80 hover:bg-rose-50'
                      : ing.safety_rating === 'caution'
                      ? 'bg-amber-50/40 border-amber-200/70 hover:bg-amber-50/70'
                      : 'bg-gray-50/70 border-gray-200/80 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-gray-950">{ing.name}</span>
                        {ing.comedogenic_score >= 3 && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                            Clog: {ing.comedogenic_score}/5
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">
                        {ing.function}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                          ing.safety_rating
                        )}`}
                      >
                        {ing.safety_rating === 'hazardous'
                          ? 'High Hazard'
                          : ing.safety_rating === 'caution'
                          ? 'Caution'
                          : 'Safe'}
                      </span>
                      <span className="text-xs text-gray-400 font-bold ml-1">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Explanation */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200/60 text-xs space-y-1.5 animate-fadeIn">
                      <p className="text-gray-700 font-medium leading-relaxed">
                        {ing.explanation}
                      </p>
                      {ing.regulatory_flags && ing.regulatory_flags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {ing.regulatory_flags.map((flag, fIdx) => (
                            <span
                              key={fIdx}
                              className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600"
                            >
                              🏷️ {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                      item.hazard_severity
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
