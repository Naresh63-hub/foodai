import { useState } from 'react'
import { Link } from 'react-router-dom'
import { INGREDIENT_CATEGORIES } from '../constants'

interface IngredientCardProps {
  id: string | number
  name: string
  category: string
  amount?: string | number | null
  disclosed?: boolean
  purpose?: string
  concern?: string
  simpleExplanation?: string
  regulatoryRefs?: Record<string, any>
}

export default function IngredientCard({
  id,
  name,
  category,
  amount,
  disclosed = true,
  purpose,
  concern,
  simpleExplanation,
  regulatoryRefs,
}: IngredientCardProps) {
  const [expanded, setExpanded] = useState(false)
  const cat = INGREDIENT_CATEGORIES[category] ?? INGREDIENT_CATEGORIES.other
  const isDisclosed = disclosed && amount !== undefined && amount !== null && amount !== 'Amount not disclosed'

  return (
    <div className="rounded-2xl bg-white shadow-card border border-gray-100 overflow-hidden hover:border-gray-200 transition-all">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer flex items-start justify-between gap-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{cat.icon}</span>
            <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cat.color || 'bg-gray-100 text-gray-700'}`}>
              {cat.label}
            </span>

            {isDisclosed ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                {amount}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-medium">
                Amount not disclosed
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label="Toggle details"
          className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/40 text-xs space-y-3 animate-fadeIn">
          {simpleExplanation && (
            <div>
              <p className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">Simple Explanation</p>
              <p className="text-gray-700 mt-0.5 leading-relaxed">{simpleExplanation}</p>
            </div>
          )}

          {purpose && (
            <div>
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Purpose in this food</p>
              <p className="text-gray-600 mt-0.5 leading-relaxed">{purpose}</p>
            </div>
          )}

          {concern && (
            <div>
              <p className="font-bold text-rose-700 uppercase tracking-wider text-[10px]">Health & Dietary Note</p>
              <p className="text-gray-600 mt-0.5 leading-relaxed">{concern}</p>
            </div>
          )}

          {regulatoryRefs && Object.keys(regulatoryRefs).length > 0 && (
            <div>
              <p className="font-bold text-purple-700 uppercase tracking-wider text-[10px]">Regulatory Status (FSSAI / JECFA)</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {regulatoryRefs.fssai && (
                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px] font-mono border border-purple-100">
                    FSSAI: {regulatoryRefs.fssai}
                  </span>
                )}
                {regulatoryRefs.who_jecfa && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-mono border border-blue-100">
                    WHO: {regulatoryRefs.who_jecfa}
                  </span>
                )}
                {regulatoryRefs.adi_mg_per_kg !== undefined && regulatoryRefs.adi_mg_per_kg !== null && (
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-100">
                    ADI: {regulatoryRefs.adi_mg_per_kg} mg/kg/day
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="pt-1 flex justify-end">
            <Link
              to={`/ingredient/${encodeURIComponent(String(id))}`}
              className="text-primary-600 hover:text-primary-700 font-bold text-xs inline-flex items-center gap-1"
            >
              View Full Scientific Profile →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
