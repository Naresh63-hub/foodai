import { useParams, useLocation, Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { DNA_DIMENSIONS, INGREDIENT_CATEGORIES } from '../constants'
import { ProductAnalysisResult } from '../types/food'

export default function FoodDNA() {
  const { scanId } = useParams<{ scanId: string }>()
  const location = useLocation()
  const result: ProductAnalysisResult | undefined = (location.state as any)?.result

  const dna = result?.dna_breakdown || {
    refined_carb: 40,
    sugar: 25,
    oil: 20,
    additive: 10,
    salt_sodium: 5,
  }

  const p = result?.product

  // Compute 0-100 scores based on food properties
  const sugarVal = result?.nutrition.per_100g.sugars_g || 25
  const saltVal = result?.nutrition.per_100g.salt_g || 0.8
  const additivesCount = result?.additives_count || 2
  const processingLevel = result?.processing_level || 'highly_processed'

  const dnaScores: Record<string, number> = {
    additive_burden: Math.min(additivesCount * 25, 100),
    sugar_density: Math.min(Math.round(sugarVal * 2.2), 100),
    sodium_load: Math.min(Math.round(saltVal * 40), 100),
    processing_score: processingLevel === 'ultra_processed' ? 95 : processingLevel === 'highly_processed' ? 75 : processingLevel === 'processed' ? 45 : 10,
    whole_food_ratio: dna.whole_food || 0,
    fortification_quality: Math.min(Math.round(((result?.nutrition.per_100g.proteins_g || 0) + (result?.nutrition.per_100g.fiber_g || 0)) * 6), 100),
  }

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <Link to={-1 as any} className="text-xs font-bold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-4">
          ← Back to Product Results
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🧬</span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Food DNA Analysis</h1>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          {p?.product_name || `Scan ID: ${scanId || 'Current'}`} · Formulated constituent breakdown
        </p>

        {/* Categorical Distribution */}
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5 mb-5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-4">
            Ingredient Composition by Category
          </h2>

          <div className="space-y-3.5">
            {Object.entries(dna).map(([catKey, pct]) => {
              const meta = INGREDIENT_CATEGORIES[catKey] ?? INGREDIENT_CATEGORIES.other
              return (
                <div key={catKey}>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5">
                      <span>{meta.icon}</span>
                      {meta.label}
                    </span>
                    <span className="font-extrabold text-gray-900 tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 6 DNA Dimensions */}
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5 mb-5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-4">
            Safety & Processing Dimensions (0–100)
          </h2>

          <div className="space-y-4">
            {DNA_DIMENSIONS.map((d) => {
              const score = dnaScores[d.key] ?? 50
              const color =
                score >= 70
                  ? 'from-rose-500 to-rose-600'
                  : score >= 40
                  ? 'from-amber-500 to-amber-600'
                  : 'from-emerald-500 to-emerald-600'

              return (
                <div key={d.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{d.label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">{d.description}</p>
                    </div>
                    <span className="text-xs font-black tabular-nums text-gray-900">{score}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${color}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* DNA Summary card */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-200 p-4.5 text-xs text-purple-900 leading-relaxed shadow-sm">
          <p className="font-bold mb-1">🧬 Formulation Verdict</p>
          <p>
            This product derives its flavor and structural bulk primarily from refined carbs, oils, and added sugars, combined with functional texturizers. Whole food elements are minimal.
          </p>
        </div>
      </div>
    </SafeAreaView>
  )
}
