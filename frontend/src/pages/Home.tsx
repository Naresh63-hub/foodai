import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { QUICK_SAMPLE_PRESETS } from '../constants'
import { getScanHistory } from '../api/food'

export default function Home() {
  const navigate = useNavigate()
  const [recentScans, setRecentScans] = useState<any[]>([])

  useEffect(() => {
    getScanHistory()
      .then((res) => {
        if (Array.isArray(res)) {
          setRecentScans(res.slice(0, 4))
        }
      })
      .catch(() => {})
  }, [])

  const handleQuickPreset = (barcode: string) => {
    navigate(`/results/${barcode}`)
  }

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        {/* Hero Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <span>🥗</span>
            <span>AI Food Transparency & Safety</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-tight">
            Know What You're Eating
          </h1>
          <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
            Scan any barcode or food label to discover ingredients, exact weight percentages, and true processing level.
          </p>
        </div>

        {/* Primary Action Button */}
        <Link
          to="/scan"
          className="flex items-center justify-between w-full rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white p-5 shadow-soft transition-all duration-200"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
              📷
            </div>
            <div className="text-left">
              <p className="font-extrabold text-lg leading-tight">Scan a Product</p>
              <p className="text-xs text-white/80 font-medium">Barcode or Label Photo OCR</p>
            </div>
          </div>
          <span className="text-xl">➔</span>
        </Link>

        {/* 1-Tap Quick Demo Presets */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
              ⚡ Instant Demo Foods
            </h2>
            <span className="text-xs text-gray-400">Tap to analyze</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_SAMPLE_PRESETS.map((p) => (
              <button
                key={p.barcode}
                onClick={() => handleQuickPreset(p.barcode)}
                className="flex flex-col text-left p-3.5 rounded-2xl bg-white shadow-card border border-gray-100 hover:border-emerald-300 hover:shadow-soft transition-all active:scale-95"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {p.tag}
                  </span>
                </div>
                <p className="mt-2 text-xs font-black text-gray-900 line-clamp-1">{p.name}</p>
                <p className="text-[11px] text-gray-500 font-medium">{p.category}</p>
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Sugar wt%:</span>
                  <span className="font-bold text-pink-600">{p.sugarPct}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-8 grid grid-cols-3 gap-2.5">
          <Link
            to="/explore"
            className="rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-3.5 shadow-sm hover:border-purple-300 transition-all text-center flex flex-col items-center"
          >
            <span className="text-2xl">🔍</span>
            <p className="mt-1 font-bold text-xs text-gray-900">Explore</p>
            <p className="text-[10px] text-gray-500">Search 10k+ items</p>
          </Link>

          <Link
            to="/compare"
            className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-3.5 shadow-sm hover:border-blue-300 transition-all text-center flex flex-col items-center"
          >
            <span className="text-2xl">⚖️</span>
            <p className="mt-1 font-bold text-xs text-gray-900">Compare</p>
            <p className="text-[10px] text-gray-500">Side-by-side duel</p>
          </Link>

          <Link
            to="/profile/preferences"
            className="rounded-2xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-3.5 shadow-sm hover:border-rose-300 transition-all text-center flex flex-col items-center"
          >
            <span className="text-2xl">🩸</span>
            <p className="mt-1 font-bold text-xs text-gray-900">Health Alerts</p>
            <p className="text-[10px] text-gray-500">Personalize risks</p>
          </Link>
        </div>

        {/* Scientific Fact of the Day */}
        <div className="mt-8 rounded-3xl bg-amber-50/70 border border-amber-200/80 p-4.5 text-xs text-amber-900 leading-relaxed">
          <div className="flex items-center gap-2 font-bold mb-1 text-amber-800">
            <span>🔬</span>
            <span>Food Science Tip</span>
          </div>
          <p>
            Ingredients on food packages are listed in descending order of weight. If sugar or oil is in the top 3 ingredients, it makes up a major share of the formulation.
          </p>
        </div>

        {/* Recent Scans Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700">
              Recent Scans
            </h2>
            <Link to="/history" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
              View all →
            </Link>
          </div>

          {recentScans.length > 0 ? (
            <div className="space-y-2">
              {recentScans.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleQuickPreset(s.barcode || String(s.product_id))}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white shadow-card border border-gray-100 cursor-pointer hover:border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{s.product_name}</p>
                      <p className="text-[10px] text-gray-400">{s.brands || 'Product'}</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs font-bold">➔</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-6 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-bold text-gray-600 mt-2">No recent scans</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Scan a barcode above or try a demo food preset!
              </p>
            </div>
          )}
        </div>
      </div>
    </SafeAreaView>
  )
}
