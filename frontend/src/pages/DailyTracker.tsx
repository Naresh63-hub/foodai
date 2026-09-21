import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { toast } from 'sonner'
import { DailyFoodLogItem } from '../types/food'

const WHO_LIMITS = {
  sugars_g: 25.0, // WHO recommended max free sugar for adults
  salt_g: 5.0,    // WHO max salt intake (2000mg sodium)
  fat_g: 20.0,    // Max saturated fat threshold
}

export default function DailyTracker() {
  const todayKey = `foodai_daily_log_${new Date().toISOString().split('T')[0]}`
  const [logs, setLogs] = useState<DailyFoodLogItem[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(todayKey)
      if (saved) {
        setLogs(JSON.parse(saved))
      }
    } catch {
      setLogs([])
    }
  }, [todayKey])

  const saveLogs = (newLogs: DailyFoodLogItem[]) => {
    setLogs(newLogs)
    localStorage.setItem(todayKey, JSON.stringify(newLogs))
  }

  const handleDelete = (id: string) => {
    const updated = logs.filter((item) => item.id !== id)
    saveLogs(updated)
    toast.success('Food log removed')
  }

  const handleClearAll = () => {
    if (confirm('Clear all logged foods for today?')) {
      saveLogs([])
      toast.info('Daily tracker cleared')
    }
  }

  // Calculate Daily Totals
  const totalSugar = logs.reduce((acc, cur) => acc + (cur.sugars_g || 0), 0)
  const totalSalt = logs.reduce((acc, cur) => acc + (cur.salt_g || 0), 0)
  const totalFat = logs.reduce((acc, cur) => acc + (cur.fat_g || 0), 0)
  const totalAdditives = logs.reduce((acc, cur) => acc + (cur.additives_count || 0), 0)

  const sugarPct = Math.min(Math.round((totalSugar / WHO_LIMITS.sugars_g) * 100), 200)
  const saltPct = Math.min(Math.round((totalSalt / WHO_LIMITS.salt_g) * 100), 200)
  const fatPct = Math.min(Math.round((totalFat / WHO_LIMITS.fat_g) * 100), 200)

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-1">
              <span>📊</span>
              <span>Daily Chemical & Nutrition Ledger</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Today's Food Intake</h1>
            <p className="text-xs text-gray-500">Track cumulative free sugars, salt & additives</p>
          </div>
          {logs.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[11px] font-bold text-gray-400 hover:text-rose-600 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* WHO SAFE BUDGET RINGS / METRICS */}
        <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-teal-950 to-gray-900 text-white p-5 shadow-soft mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              WHO Daily Safe Budget
            </span>
            <span className="text-[11px] text-emerald-200/80 font-semibold">24h Cumulative</span>
          </div>

          <div className="space-y-3.5">
            {/* Sugar Progress */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <span>🍬</span> Added Sugar ({totalSugar.toFixed(1)}g / {WHO_LIMITS.sugars_g}g)
                </span>
                <span className={sugarPct > 100 ? 'text-rose-400' : 'text-emerald-300'}>
                  {sugarPct}% {sugarPct > 100 ? '⚠️ EXCEEDED' : 'used'}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className={[
                    'h-full rounded-full transition-all duration-500',
                    sugarPct > 100 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-emerald-400 to-teal-400'
                  ].join(' ')}
                  style={{ width: `${Math.min(sugarPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Salt / Sodium Progress */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <span>🧂</span> Salt ({totalSalt.toFixed(2)}g / {WHO_LIMITS.salt_g}g)
                </span>
                <span className={saltPct > 100 ? 'text-rose-400' : 'text-sky-300'}>
                  {saltPct}% {saltPct > 100 ? '⚠️ EXCEEDED' : 'used'}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className={[
                    'h-full rounded-full transition-all duration-500',
                    saltPct > 100 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-sky-400 to-blue-500'
                  ].join(' ')}
                  style={{ width: `${Math.min(saltPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Saturated Fat Progress */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <span>🧈</span> Sat. Fat ({totalFat.toFixed(1)}g / {WHO_LIMITS.fat_g}g)
                </span>
                <span className={fatPct > 100 ? 'text-rose-400' : 'text-amber-300'}>
                  {fatPct}% {fatPct > 100 ? '⚠️ EXCEEDED' : 'used'}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className={[
                    'h-full rounded-full transition-all duration-500',
                    fatPct > 100 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-amber-400 to-orange-400'
                  ].join(' ')}
                  style={{ width: `${Math.min(fatPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-emerald-200/90 font-medium">Additives Ingested Today:</span>
            <span className="font-black text-white bg-white/15 px-2.5 py-0.5 rounded-full">
              {totalAdditives} detected
            </span>
          </div>
        </div>

        {/* LOGGED FOODS LIST */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900">
              Logged Foods Today ({logs.length})
            </h2>
            <Link to="/scan" className="text-xs font-bold text-emerald-700 hover:underline">
              + Scan & Log More
            </Link>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-2.5">
              {logs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white shadow-card p-3.5 border border-gray-100 flex items-center justify-between hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">📦</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-900 truncate">
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                        <span>{item.portion_g}g serving</span>
                        <span>·</span>
                        <span className="font-bold text-pink-600">{item.sugars_g}g sugar</span>
                        <span>·</span>
                        <span className="font-bold text-sky-600">{item.salt_g}g salt</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 flex items-center justify-center text-sm font-bold transition-colors shrink-0 ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/70 p-8 text-center">
              <span className="text-4xl">🥗</span>
              <p className="text-sm font-black text-gray-800 mt-2">No Foods Logged Yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Scan a food product or browse demo foods and tap <strong>"+ Log to Daily Tracker"</strong> to monitor your daily sugar, salt and additive load.
              </p>
              <Link
                to="/scan"
                className="mt-4 inline-block rounded-2xl bg-emerald-600 text-white font-bold px-4 py-2 text-xs shadow-soft hover:bg-emerald-700 transition-all"
              >
                Scan a Product Now
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-4 text-xs text-emerald-950 flex items-start gap-2.5">
          <span className="text-base pt-0.5">💡</span>
          <div>
            <p className="font-bold text-emerald-900 mb-0.5">WHO Guideline Benchmark:</p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Consuming less than 5% of total daily energy from free sugars (~25g for an average adult) provides significant protective metabolic and dental benefits.
            </p>
          </div>
        </div>
      </div>
    </SafeAreaView>
  )
}