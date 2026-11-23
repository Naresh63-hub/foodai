import React, { useState } from 'react'
import { MedicineAnalysisResult } from '../types/food'

interface MedicineInteractionCardProps {
  data: MedicineAnalysisResult
  onReset?: () => void
}

export default function MedicineInteractionCard({ data, onReset }: MedicineInteractionCardProps) {
  const [showAllExcipients, setShowAllExcipients] = useState(false)

  const excipients = data.excipients_and_additives || []
  const visibleExcipients = showAllExcipients ? excipients : excipients.slice(0, 4)

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
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0 font-bold border border-blue-100 shadow-xs">
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

      {/* 🔬 Biological Pharmacology & Organ Pathway (NEW) */}
      {data.pharmacological_profile && (
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔬</span>
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                Pharmacology & Organ Pathway
              </h3>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Metabolism
            </span>
          </div>

          {/* Mechanism of Action */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Mechanism of Action
            </span>
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
              {data.pharmacological_profile.mechanism_of_action}
            </p>
          </div>

          {/* 3 Organ Impact Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Liver */}
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">🫀</span>
                <span className="text-[11px] font-black text-amber-950 uppercase tracking-wide">
                  Liver Pathway
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                {data.pharmacological_profile.organ_impact.liver}
              </p>
            </div>

            {/* Kidneys */}
            <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200/70">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">🫘</span>
                <span className="text-[11px] font-black text-sky-950 uppercase tracking-wide">
                  Kidney Clearance
                </span>
              </div>
              <p className="text-[11px] text-sky-900/90 leading-relaxed font-medium">
                {data.pharmacological_profile.organ_impact.kidneys}
              </p>
            </div>

            {/* Stomach */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">🛡️</span>
                <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wide">
                  Stomach Lining
                </span>
              </div>
              <p className="text-[11px] text-emerald-900/90 leading-relaxed font-medium">
                {data.pharmacological_profile.organ_impact.stomach}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🧪 Inactive Excipients & Hidden Chemical Additives (NEW) */}
      {excipients.length > 0 && (
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧪</span>
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                Inactive Excipients & Additives ({excipients.length})
              </h3>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              Non-Active Binders & Dyes
            </span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Formulation excipients (coatings, binders, preservatives) do not provide therapeutic action but may trigger allergies or dietary restrictions.
          </p>

          <div className="space-y-2 pt-1">
            {visibleExcipients.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-gray-50 border border-gray-200/70 flex flex-col gap-1 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-gray-950">{item.name}</span>
                  <span className="text-[9px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200 shrink-0">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                  {item.concern}
                </p>
              </div>
            ))}
          </div>

          {excipients.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAllExcipients(!showAllExcipients)}
              className="w-full py-2 text-center text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              {showAllExcipients ? 'Show Less Excipients ▲' : `View All ${excipients.length} Excipients ▼`}
            </button>
          )}
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
          className="w-full py-3.5 px-4 rounded-2xl bg-gray-900 hover:bg-black active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          ← Scan Another Medication
        </button>
      )}
    </div>
  )
}
