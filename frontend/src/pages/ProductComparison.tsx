import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import SafeAreaView from '../components/SafeAreaView'
import ProcessingBadge from '../components/ProcessingBadge'
import { compareProducts } from '../api/food'
import { ComparisonResult } from '../types/food'
import { QUICK_SAMPLE_PRESETS } from '../constants'

export default function ProductComparison() {
  const location = useLocation()
  const initialBarcode = (location.state as any)?.initialBarcode || QUICK_SAMPLE_PRESETS[0].barcode
  const [barcode1, setBarcode1] = useState(initialBarcode)
  const [barcode2, setBarcode2] = useState(QUICK_SAMPLE_PRESETS[2].barcode)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCompare = async () => {
    if (!barcode1 || !barcode2) {
      toast.error('Please select two products to compare')
      return
    }
    if (barcode1 === barcode2) {
      toast.error('Please select two different products to compare')
      return
    }
    setLoading(true)
    try {
      const res = await compareProducts(barcode1, barcode2)
      setResult(res)
      toast.success('Comparison calculated!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to compare products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleCompare()
  }, [])

  const p1 = result?.product_1
  const p2 = result?.product_2
  const comp = result?.comparison

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200 mb-2">
            <span>⚖️</span>
            <span>Side-by-Side Product Duel</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Compare Foods</h1>
          <p className="text-xs text-gray-500 mt-1">
            Compare nutrients, sugar weight %, and additive counts between two products.
          </p>
        </div>

        {/* Product Selectors */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="rounded-2xl bg-white p-3 shadow-card border border-gray-100">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Product 1
            </label>
            <select
              value={barcode1}
              onChange={(e) => setBarcode1(e.target.value)}
              className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {QUICK_SAMPLE_PRESETS.map((p) => (
                <option key={p.barcode} value={p.barcode}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-white p-3 shadow-card border border-gray-100">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Product 2
            </label>
            <select
              value={barcode2}
              onChange={(e) => setBarcode2(e.target.value)}
              className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {QUICK_SAMPLE_PRESETS.map((p) => (
                <option key={p.barcode} value={p.barcode}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading}
          className="w-full rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 text-xs uppercase tracking-wider shadow-sm transition-all mb-6 disabled:opacity-50"
        >
          {loading ? 'Comparing...' : 'Run Side-by-Side Comparison'}
        </button>

        {result && (
          <div className="space-y-4 animate-fadeIn">
            {/* Healthier Pick Winner Card */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏆</span>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-200">
                  Healthier Formulation
                </span>
              </div>
              <h2 className="text-xl font-black text-white leading-snug">
                {comp?.better_choice_product_name}
              </h2>
              <p className="mt-2 text-xs text-emerald-100 leading-relaxed font-medium bg-white/10 rounded-xl p-3 border border-white/20">
                "{comp?.rationale}"
              </p>
            </div>

            {/* Side-by-Side Duel Comparison Matrix */}
            <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-5">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100 text-center">
                <div>
                  <p className="text-xs font-black text-gray-900 line-clamp-1">{p1?.product.product_name}</p>
                  <div className="mt-1">
                    <ProcessingBadge level={p1?.processing_level as any} size="sm" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900 line-clamp-1">{p2?.product.product_name}</p>
                  <div className="mt-1">
                    <ProcessingBadge level={p2?.processing_level as any} size="sm" />
                  </div>
                </div>
              </div>

              {/* Metrics Table */}
              <div className="mt-4 space-y-3 text-xs">
                {/* Sugar */}
                <div className="p-2.5 rounded-xl bg-gray-50 flex items-center justify-between">
                  <div className="w-1/3 text-center font-bold text-pink-600">
                    {p1?.nutrition.per_100g.sugars_g ?? 0}g ({p1?.nutrition.pct_by_weight.sugars_pct ?? 0}%)
                  </div>
                  <div className="w-1/3 text-center font-extrabold text-gray-500 uppercase text-[10px]">
                    🍬 Sugars
                  </div>
                  <div className="w-1/3 text-center font-bold text-pink-600">
                    {p2?.nutrition.per_100g.sugars_g ?? 0}g ({p2?.nutrition.pct_by_weight.sugars_pct ?? 0}%)
                  </div>
                </div>

                {/* Salt */}
                <div className="p-2.5 rounded-xl bg-gray-50 flex items-center justify-between">
                  <div className="w-1/3 text-center font-bold text-blue-600">
                    {p1?.nutrition.per_100g.salt_g ?? 0}g
                  </div>
                  <div className="w-1/3 text-center font-extrabold text-gray-500 uppercase text-[10px]">
                    🧂 Salt
                  </div>
                  <div className="w-1/3 text-center font-bold text-blue-600">
                    {p2?.nutrition.per_100g.salt_g ?? 0}g
                  </div>
                </div>

                {/* Fat */}
                <div className="p-2.5 rounded-xl bg-gray-50 flex items-center justify-between">
                  <div className="w-1/3 text-center font-bold text-amber-600">
                    {p1?.nutrition.per_100g.fat_g ?? 0}g
                  </div>
                  <div className="w-1/3 text-center font-extrabold text-gray-500 uppercase text-[10px]">
                    🧈 Total Fat
                  </div>
                  <div className="w-1/3 text-center font-bold text-amber-600">
                    {p2?.nutrition.per_100g.fat_g ?? 0}g
                  </div>
                </div>

                {/* Protein */}
                <div className="p-2.5 rounded-xl bg-gray-50 flex items-center justify-between">
                  <div className="w-1/3 text-center font-bold text-emerald-600">
                    {p1?.nutrition.per_100g.proteins_g ?? 0}g
                  </div>
                  <div className="w-1/3 text-center font-extrabold text-gray-500 uppercase text-[10px]">
                    💪 Protein
                  </div>
                  <div className="w-1/3 text-center font-bold text-emerald-600">
                    {p2?.nutrition.per_100g.proteins_g ?? 0}g
                  </div>
                </div>

                {/* Additives Count */}
                <div className="p-2.5 rounded-xl bg-purple-50/70 flex items-center justify-between">
                  <div className="w-1/3 text-center font-bold text-purple-900">
                    {p1?.additives_count || 0}
                  </div>
                  <div className="w-1/3 text-center font-extrabold text-purple-700 uppercase text-[10px]">
                    🧪 Additives
                  </div>
                  <div className="w-1/3 text-center font-bold text-purple-900">
                    {p2?.additives_count || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SafeAreaView>
  )
}
