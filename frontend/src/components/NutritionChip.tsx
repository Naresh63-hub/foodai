interface NutritionChipProps {
  icon: string
  label: string
  value: string
  percent?: number | string | null
  unit?: string
  accent?: 'primary' | 'accent' | 'rose' | 'sky' | 'amber' | 'emerald'
}

const accentColors: Record<string, { text: string; bg: string; bar: string }> = {
  primary: { text: 'text-pink-600', bg: 'bg-pink-50', bar: 'bg-pink-500' },
  accent: { text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' },
  rose: { text: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-500' },
  sky: { text: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
  amber: { text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' },
  emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
}

export default function NutritionChip({
  icon,
  label,
  value,
  percent,
  accent = 'primary',
}: NutritionChipProps) {
  const theme = accentColors[accent] || accentColors.primary
  const numPct = typeof percent === 'number' ? percent : typeof percent === 'string' ? parseFloat(percent) : null

  return (
    <div className="rounded-2xl bg-white shadow-card p-3.5 border border-gray-100 hover:border-gray-200 transition-all">
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xl leading-none">{icon}</span>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide truncate">{label}</span>
        </div>
        {numPct !== null && !isNaN(numPct) && (
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${theme.bg} ${theme.text}`}>
            {numPct}% wt
          </span>
        )}
      </div>

      <div className="mt-1">
        <p className="text-sm font-extrabold text-gray-900 tracking-tight">
          {value}
        </p>
      </div>

      {numPct !== null && !isNaN(numPct) && (
        <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${theme.bar} transition-all duration-500`}
            style={{ width: `${Math.min(numPct, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
