import {
  PROCESSING_LEVELS,
  PROCESSING_LABELS,
  type ProcessingLevel,
} from '../constants'

const bgClasses: Record<ProcessingLevel, string> = {
  minimally_processed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  processed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  highly_processed: 'bg-amber-100 text-amber-700 border-amber-200',
  ultra_processed: 'bg-rose-100 text-rose-700 border-rose-200',
}

interface ProcessingBadgeProps {
  level: ProcessingLevel
  size?: 'sm' | 'md' | 'lg'
}

export default function ProcessingBadge({
  level,
  size = 'md',
}: ProcessingBadgeProps) {
  const safeLevel = PROCESSING_LEVELS.includes(level) ? level : 'processed'
  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-5 py-2 text-base'
      : 'px-3 py-1 text-sm'

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-semibold border',
        bgClasses[safeLevel],
        sizeClasses,
      ].join(' ')}
    >
      {PROCESSING_LABELS[safeLevel]}
    </span>
  )
}
