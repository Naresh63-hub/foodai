import { useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { ProductAnalysisResult } from '../types/food'

type Tab = 'per100g' | 'perServing' | 'percent'

const tabs: { key: Tab; label: string }[] = [
  { key: 'per100g', label: 'per 100g' },
  { key: 'perServing', label: 'per serving' },
  { key: 'percent', label: '% by weight' },
]

export default function Nutrition() {
  const { scanId } = useParams<{ scanId: string }>()
  const location = useLocation()
  const result: ProductAnalysisResult | undefined = (location.state as any)?.result
  const [tab, setTab] = useState<Tab>('per100g')

  const n = result?.nutrition
  const p = result?.product

  const per100g = n?.per_100g || {
    sugars_g: 25.0,
    salt_g: 0.8,
    fat_g: 18.0,
    proteins_g: 5.5,
    fiber_g: 2.0,
  }

  const perServing = n?.per_serving || {
    sugars_g: 7.5,
    salt_g: 0.24,
    fat_g: 5.4,
    proteins_g: 1.65,
    fiber_g: 0.6,
  }

  const pct = n?.pct_by_weight || {
    sugars_pct: 25.0,
    salt_pct: 0.8,
    fat_pct: 18.0,
    proteins_pct: 5.5,
    fiber_pct: 2.0,
  }

  const nutritionRows = [
    { label: 'Sugars (Total)', icon: '🍬', per100g: `${per100g.sugars_g ?? '—'} g`, perServing: `${perServing.sugars_g ?? '—'} g`, percent: `${pct.sugars_pct ?? '—'}%`, highlight: true, color: 'text-pink-600' },
    { label: 'Salt / Sodium', icon: '🧂', per100g: `${per100g.salt_g ?? '—'} g`, perServing: `${perServing.salt_g ?? '—'} g`, percent: `${pct.salt_pct ?? '—'}%`, highlight: true, color: 'text-blue-600' },
    { label: 'Total Fat', icon: '🧈', per100g: `${per100g.fat_g ?? '—'} g`, perServing: `${perServing.fat_g ?? '—'} g`, percent: `${pct.fat_pct ?? '—'}%`, highlight: false, color: 'text-amber-600' },
    { label: 'Protein', icon: '💪', per100g: `${per100g.proteins_g ?? '—'} g`, perServing: `${perServing.proteins_g ?? '—'} g`, percent: `${pct.proteins_pct ?? '—'}%`, highlight: false, color: 'text-emerald-600' },
    { label: 'Dietary Fiber', icon: '🌾', per100g: `${per100g.fiber_g ?? '—'} g`, perServing: `${perServing.fiber_g ?? '—'} g`, percent: `${pct.fiber_pct ?? '—'}%`, highlight: false, color: 'text-teal-600' },
  ]

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <Link to={-1 as any} className="text-xs font-bold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4">
          ← Back to Product Results
        </Link>

        <div className="mb-5">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Nutrition Breakdown
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            {p?.product_name || `Scan ID: ${scanId || 'Default'}`} · Serving = {p?.serving_size || '30 g'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="rounded-2xl bg-gray-100 p-1 flex gap-1 mb-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.key ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Nutrition Table */}
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Nutrient</span>
            <span>{tab === 'per100g' ? 'Per 100g' : tab === 'perServing' ? 'Per Serving' : '% of Product Weight'}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {nutritionRows.map((row) => {
              const val = tab === 'per100g' ? row.per100g : tab === 'perServing' ? row.perServing : row.percent
              return (
                <div key={row.label} className="p-4 flex items-center justify-between hover:bg-gray-50/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{row.icon}</span>
                    <span className="text-sm font-bold text-gray-800">{row.label}</span>
                  </div>
                  <span className={`text-sm font-extrabold tabular-nums ${row.color}`}>
                    {val}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mathematical Explanation Note */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-200 p-4.5 text-xs text-blue-900 leading-relaxed shadow-sm">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <span>📐</span>
            <span>Mathematical Guarantee</span>
          </div>
          <p>
            Values per 100g represent direct physical mass fractions. For instance, 25g sugar in 100g of food corresponds exactly to <strong>25% sugar by total product weight</strong>.
          </p>
        </div>
      </div>
    </SafeAreaView>
  )
}
