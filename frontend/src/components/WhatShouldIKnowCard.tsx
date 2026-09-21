import { SummaryInfo } from '../types/food'

interface WhatShouldIKnowCardProps {
  summaryInfo?: SummaryInfo
  customSummary?: string
  highlights?: string[]
}

export default function WhatShouldIKnowCard({
  summaryInfo,
  customSummary,
  highlights = [],
}: WhatShouldIKnowCardProps) {
  const summary = summaryInfo?.summary || customSummary || 'This product is primarily formulated from refined ingredients. Inspect detailed nutrient percentages below.'
  const keyHighlights = summaryInfo?.key_highlights || highlights
  const ageInsights = summaryInfo?.age_insights || []
  const scientificNote = summaryInfo?.scientific_note
  const disclaimer = summaryInfo?.disclaimer || 'This analysis is for nutritional awareness and does not replace medical advice.'

  return (
    <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200/80 p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">💡</span>
        <h2 className="text-lg font-black text-gray-900 tracking-tight">
          What Should I Know?
        </h2>
      </div>

      <p className="text-sm font-medium text-gray-800 leading-relaxed bg-white/70 rounded-2xl p-3.5 border border-amber-100 shadow-sm">
        "{summary}"
      </p>

      {keyHighlights.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {keyHighlights.map((h, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 text-amber-900 font-bold text-xs px-3 py-1 border border-amber-200"
            >
              <span>⚡</span> {h}
            </span>
          ))}
        </div>
      )}

      {ageInsights.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-amber-200/60">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
            👶 Age & Dietary Guidance
          </p>
          <div className="space-y-1.5">
            {ageInsights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                <span className="text-amber-500 font-bold">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {scientificNote && (
        <div className="mt-3.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
          <span className="font-bold">🔬 Regulatory vs Dietary: </span>
          {scientificNote}
        </div>
      )}

      <p className="mt-3 text-[10px] text-gray-400 italic text-center">
        {disclaimer}
      </p>
    </div>
  )
}
