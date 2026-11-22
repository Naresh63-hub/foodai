import React from 'react'
import { MedicineAnalysisResult } from '../types/food'

interface MedicineInteractionCardProps {
  data: MedicineAnalysisResult
  onReset?: () => void
}

export default function MedicineInteractionCard({ data, onReset }: MedicineInteractionCardProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 mb-1.5">
              💊 {data.therapeutic_category || 'Pharmaceutical Medication'}
            </span>
            <h2 className="text-xl font-black text-gray-950 tracking-tight truncate">
              {data.medicine_name}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
                Salt: {data.active_salt}
              </span>
              {data.strength && (
                <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200">
                  {data.strength}
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0 font-bold border border-blue-100">
            Rx
          </div>
        </div>

        {/* Common Medical Uses */}
        {data.common_uses && (
          <div className="mt-3.5 pt-3 border-t border-gray-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
              Indications / General Purpose
            </span>
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              {data.common_uses}
            </p>
          </div>
        )}
      </div>

      {/* 🍽️ Food & Meal Timing Banner (CRITICAL FEATURE) */}
      <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🍽️</span>
          <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
            Meal Timing & Administration
          </h3>
        </div>
        <p className="text-sm font-black text-emerald-950 leading-relaxed">
          {data.meal_timing}
        </p>
      </div>

      {/* ⚠️ Food-Drug Conflicts & Interactions */}
      {data.food_drug_interactions && data.food_drug_interactions.length > 0 && (
        <div className="rounded-3xl bg-rose-50/80 border border-rose-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h3 className="text-xs font-extrabold text-rose-950 uppercase tracking-wider">
              Food & Beverage Conflicts ({data.food_drug_interactions.length})
            </h3>
          </div>
          <div className="space-y-2.5">
            {data.food_drug_interactions.map((item, idx) => (
              <div key={idx} className="p-3 bg-white rounded-2xl border border-rose-100 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-gray-950">{item.food_or_beverage}</span>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    {item.severity}
                  </span>
                </div>
                <p className="text-xs text-rose-900/90 font-medium mt-1 leading-relaxed">
                  {item.interaction}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generic Salt & Jan Aushadhi Affordable Alternative */}
      {data.generic_salt_name && (
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💰</span>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              Generic Jan Aushadhi Salt Equivalent
            </h3>
          </div>
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200/70">
            {data.generic_salt_name}
          </p>
          <p className="text-[11px] text-gray-500 font-medium mt-2">
            Pradhan Mantri Jan Aushadhi generic formulations contain identical active salts at up to 70-85% lower cost. Consult your pharmacist for generic substitution.
          </p>
        </div>
      )}

      {/* Side Effects & Safety Warning */}
      <div className="rounded-3xl bg-gray-50 border border-gray-200/80 p-5">
        <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
          Safety Profile & Common Side Effects
        </h3>
        {data.common_side_effects && data.common_side_effects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {data.common_side_effects.map((effect, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-xl"
              >
                • {effect}
              </span>
            ))}
          </div>
        )}
        {data.key_safety_warning && (
          <p className="text-xs font-bold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
            ⚠️ {data.key_safety_warning}
          </p>
        )}
      </div>

      {/* Regulatory Clinical Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center">
        <p className="text-[11px] text-amber-950 font-medium leading-relaxed">
          {data.disclaimer}
        </p>
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="w-full py-3.5 px-4 rounded-2xl bg-gray-900 hover:bg-black active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md"
        >
          ← Scan Another Medication
        </button>
      )}
    </div>
  )
}
