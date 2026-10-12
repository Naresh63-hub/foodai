import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getWeeklyCaloricProgress,
  WeeklyCalorieDay,
  saveFoodScanToFirestore,
} from '../services/firestoreService'
import { toast } from 'sonner'

export default function WeeklyCalorieProgress() {
  const { user } = useAuth()
  const [data, setData] = useState<WeeklyCalorieDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<WeeklyCalorieDay | null>(null)
  const [chartMode, setChartMode] = useState<'calories' | 'macros'>('calories')
  const [dailyTarget, setDailyTarget] = useState(2000)

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await getWeeklyCaloricProgress(user?.uid, dailyTarget)
      setData(result)
      // Default selected day to Today (last item)
      if (result.length > 0) {
        setSelectedDay(result[result.length - 1])
      }
    } catch (err) {
      console.error('Failed to load weekly progress from Firestore:', err)
      toast.error('Could not load weekly calorie data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.uid, dailyTarget])

  // Aggregate 7-Day Stats
  const totalCalories = data.reduce((sum, d) => sum + d.calories, 0)
  const avgCalories = data.length > 0 ? Math.round(totalCalories / data.length) : 0
  const daysWithinTarget = data.filter(
    (d) => Math.abs(d.calories - d.targetCalories) <= 250
  ).length
  const consistencyPct = data.length > 0 ? Math.round((daysWithinTarget / data.length) * 100) : 0

  // Macro Totals
  const totalCarbs = data.reduce((sum, d) => sum + d.carbsG, 0)
  const totalProtein = data.reduce((sum, d) => sum + d.proteinG, 0)
  const totalFat = data.reduce((sum, d) => sum + d.fatG, 0)

  // Quick 1-tap test meal logger to demonstrate live Firestore sync
  const handleQuickAddMeal = async (mealName: string, cal: number) => {
    if (!user?.uid) {
      toast.info('Signed in as demo user — meal logged locally')
    }
    const today = new Date().toISOString().split('T')[0]
    const localKey = `foodai_daily_log_${today}`
    const newMeal = {
      id: `quick_${Date.now()}`,
      timestamp: new Date().toISOString(),
      product_name: mealName,
      portion_g: 200,
      sugars_g: Math.round(cal * 0.05),
      salt_g: 1.2,
      fat_g: Math.round((cal * 0.25) / 9),
      additives_count: 0,
      processing_level: 'minimally_processed',
    }

    try {
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]')
      existing.unshift(newMeal)
      localStorage.setItem(localKey, JSON.stringify(existing))

      if (user?.uid) {
        await saveFoodScanToFirestore({
          id: `scan_${Date.now()}`,
          userId: user.uid,
          foodName: mealName,
          caloriesKcal: cal,
          servingDescription: '1 serving (~200g)',
          servingWeightG: 200,
          macros: {
            carbohydrates_g: Math.round((cal * 0.45) / 4),
            proteins_g: Math.round((cal * 0.3) / 4),
            fat_g: Math.round((cal * 0.25) / 9),
            fiber_g: 4,
            sugars_g: 6,
            sodium_mg: 450,
          },
          healthScore: 88,
          processingLevel: 'Minimally Processed',
          glycemicImpact: 'Moderate',
          ingredients: [{ name: mealName, amount_estimate: '200g', category: 'Whole Foods', visual_cue: 'Fresh plate' }],
          createdAt: new Date().toISOString(),
        })
      }
      toast.success(`Logged ${mealName} (${cal} kcal) to Firestore!`)
      loadData()
    } catch {
      toast.error('Failed to log meal')
    }
  }

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dayData: WeeklyCalorieDay = payload[0].payload
      const diff = dayData.calories - dayData.targetCalories
      return (
        <div className="rounded-2xl bg-gray-900/95 backdrop-blur-md p-3 text-white text-xs shadow-xl border border-gray-700 max-w-[200px]">
          <div className="flex items-center justify-between border-b border-gray-700/80 pb-1.5 mb-1.5">
            <span className="font-extrabold text-emerald-400">{dayData.dayLabel}</span>
            <span className="text-[10px] text-gray-400">{dayData.date}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-300">Intake:</span>
              <span className="font-black text-sm text-white">{dayData.calories} kcal</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400">Target:</span>
              <span className="font-bold text-gray-300">{dayData.targetCalories} kcal</span>
            </div>
            <div className="flex justify-between text-[10px] pt-0.5">
              <span className="text-gray-400">Variance:</span>
              <span
                className={`font-bold ${
                  diff > 100 ? 'text-amber-400' : diff < -200 ? 'text-blue-400' : 'text-emerald-400'
                }`}
              >
                {diff > 0 ? `+${diff}` : diff} kcal
              </span>
            </div>
            {dayData.mealsCount > 0 && (
              <div className="pt-1.5 border-t border-gray-700/80 text-[10px] text-gray-400">
                <span>{dayData.mealsCount} meal(s) logged</span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-5">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
            7-Day Avg
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-gray-900">{avgCalories}</span>
            <span className="text-[10px] font-bold text-gray-400">kcal</span>
          </div>
          <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
            {avgCalories <= dailyTarget ? '✓ Within target' : '⚠️ Above goal'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
            Goal Target
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-emerald-800">{dailyTarget}</span>
            <span className="text-[10px] font-bold text-emerald-600">kcal</span>
          </div>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Daily ceiling</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
            Consistency
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-teal-800">{consistencyPct}%</span>
          </div>
          <p className="text-[10px] text-teal-700 font-bold mt-0.5">
            {daysWithinTarget}/7 days on track
          </p>
        </div>
      </div>

      {/* RECHARTS MAIN CONTAINER CARD */}
      <div className="p-5 rounded-3xl bg-white shadow-soft border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">📊</span>
              <h2 className="text-sm font-black text-gray-900 tracking-tight">
                7-Day Caloric Intake
              </h2>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Aggregated from Firestore meals & scans
            </p>
          </div>

          {/* Toggle Calories vs Macros */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 text-[10px] font-bold">
            <button
              onClick={() => setChartMode('calories')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartMode === 'calories'
                  ? 'bg-white text-gray-900 shadow-sm font-extrabold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Calories
            </button>
            <button
              onClick={() => setChartMode('macros')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartMode === 'macros'
                  ? 'bg-white text-gray-900 shadow-sm font-extrabold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Macros
            </button>
          </div>
        </div>

        {/* RECHARTS VISUALIZATION */}
        <div className="h-60 w-full overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading caloric trend from Firestore...</span>
              </div>
            </div>
          ) : chartMode === 'calories' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedDay(e.activePayload[0].payload)
                  }
                }}
                margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="dayOfWeek"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  domain={[0, (dataMax: number) => Math.max(dataMax + 300, 2400)]}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={dailyTarget}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Goal: ${dailyTarget}`,
                    position: 'top',
                    fill: '#ef4444',
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                />
                <Bar
                  dataKey="calories"
                  radius={[8, 8, 2, 2]}
                  cursor="pointer"
                  animationDuration={800}
                >
                  {data.map((entry, index) => {
                    const isSelected = selectedDay?.date === entry.date
                    const isToday = index === data.length - 1
                    // Dynamic color based on intake vs target
                    let fill = '#10b981' // emerald-500
                    if (entry.calories > entry.targetCalories + 200) {
                      fill = '#f59e0b' // amber-500
                    } else if (entry.calories === 0) {
                      fill = '#e2e8f0'
                    }
                    if (isToday) {
                      fill = '#059669' // emerald-600
                    }
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fill}
                        stroke={isSelected ? '#0f172a' : 'transparent'}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            /* STACKED MACRONUTRIENT AREA CHART */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="dayOfWeek"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(val) => `${val}g`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value}g`,
                    name === 'carbsG' ? 'Carbs' : name === 'proteinG' ? 'Protein' : 'Fat',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="carbsG"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                  name="Carbs"
                />
                <Area
                  type="monotone"
                  dataKey="proteinG"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Protein"
                />
                <Area
                  type="monotone"
                  dataKey="fatG"
                  stackId="1"
                  stroke="#f43f5e"
                  fill="#f43f5e"
                  fillOpacity={0.6}
                  name="Fat"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] pt-3 border-t border-gray-100 text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>On Target</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Above Target</span>
            </span>
          </div>
          <span className="text-[10px] text-gray-400">Tap any bar for day details</span>
        </div>
      </div>

      {/* SELECTED DAY DETAIL DRAWER */}
      {selectedDay && (
        <div className="p-4 rounded-3xl bg-white shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <div>
                <h3 className="text-xs font-black text-gray-900">
                  {selectedDay.dayLabel} Breakdown
                </h3>
                <p className="text-[10px] text-gray-500">
                  {selectedDay.mealsCount} meal(s) • Total {selectedDay.calories} kcal
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                selectedDay.calories <= selectedDay.targetCalories
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {selectedDay.calories <= selectedDay.targetCalories ? '✓ Under Goal' : '+ Over Goal'}
            </span>
          </div>

          {/* Meals list for the selected day */}
          {selectedDay.meals && selectedDay.meals.length > 0 ? (
            <div className="space-y-2 mb-3">
              {selectedDay.meals.map((meal, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">
                      {meal.source === 'camera_snap' ? '📸' : '🥗'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">
                        {meal.name}
                      </p>
                      <p className="text-[10px] text-gray-400">{meal.time}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-700">{meal.calories} kcal</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">
              No individual meals cataloged for this day.
            </div>
          )}

          {/* Day Macro Energy Split */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
            <div>
              <span className="text-amber-700 font-extrabold block">
                {selectedDay.carbsG}g
              </span>
              <span className="text-gray-500">Carbs</span>
            </div>
            <div>
              <span className="text-emerald-700 font-extrabold block">
                {selectedDay.proteinG}g
              </span>
              <span className="text-gray-500">Protein</span>
            </div>
            <div>
              <span className="text-rose-700 font-extrabold block">
                {selectedDay.fatG}g
              </span>
              <span className="text-gray-500">Fat</span>
            </div>
          </div>
        </div>
      )}

      {/* QUICK LOGGING ACTIONS & SHORTCUTS */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span>
            <span>Quick Log Meal to Firestore:</span>
          </p>
          <Link
            to="/camera-snap"
            className="text-[10px] font-extrabold text-emerald-800 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200 hover:bg-white"
          >
            Open Camera 📸
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleQuickAddMeal('Grilled Chicken Salad', 380)}
            className="p-2.5 rounded-2xl bg-white hover:bg-emerald-50 active:scale-95 border border-emerald-100 text-left shadow-xs transition-all"
          >
            <span className="text-lg">🥗</span>
            <p className="text-[11px] font-bold text-gray-900 mt-1 leading-tight">Chicken Salad</p>
            <p className="text-[10px] font-extrabold text-emerald-700">380 kcal</p>
          </button>

          <button
            onClick={() => handleQuickAddMeal('Steamed Brown Rice & Dal', 420)}
            className="p-2.5 rounded-2xl bg-white hover:bg-emerald-50 active:scale-95 border border-emerald-100 text-left shadow-xs transition-all"
          >
            <span className="text-lg">🍛</span>
            <p className="text-[11px] font-bold text-gray-900 mt-1 leading-tight">Rice & Dal</p>
            <p className="text-[10px] font-extrabold text-emerald-700">420 kcal</p>
          </button>

          <button
            onClick={() => handleQuickAddMeal('Berry Protein Shake', 260)}
            className="p-2.5 rounded-2xl bg-white hover:bg-emerald-50 active:scale-95 border border-emerald-100 text-left shadow-xs transition-all"
          >
            <span className="text-lg">🥤</span>
            <p className="text-[11px] font-bold text-gray-900 mt-1 leading-tight">Protein Shake</p>
            <p className="text-[10px] font-extrabold text-emerald-700">260 kcal</p>
          </button>
        </div>
      </div>
    </div>
  )
}
