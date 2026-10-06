import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * Base Skeleton element with shimmer sweep animation.
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading..."
      className={`relative overflow-hidden bg-gray-200/80 rounded-xl before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent ${className}`}
      {...props}
    />
  )
}

/**
 * Skeleton placeholder for Recent Scans and History list items.
 */
export function SkeletonScanItem() {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white shadow-card border border-gray-100 animate-pulse">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4 rounded-md" />
          <Skeleton className="h-2.5 w-1/2 rounded-md" />
        </div>
      </div>
      <Skeleton className="w-4 h-4 rounded-full shrink-0 ml-2" />
    </div>
  )
}

/**
 * Skeleton list for Recent Scans (e.g. on Home screen).
 */
export function SkeletonRecentScans({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-label="Loading recent scans">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonScanItem key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton placeholder for Catalog Explorer product cards.
 */
export function SkeletonProductCard() {
  return (
    <div className="rounded-2xl bg-white shadow-card p-4 border border-gray-100 animate-pulse space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-24 rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>
        <Skeleton className="w-5 h-5 rounded-md shrink-0" />
      </div>
      <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
    </div>
  )
}

/**
 * Skeleton list for Catalog Explorer.
 */
export function SkeletonProductList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading food catalog">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton placeholder for History page items.
 */
export function SkeletonHistoryList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5 mt-4" aria-label="Loading scan history">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white shadow-card border border-gray-100 animate-pulse"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-20 rounded-md" />
                <Skeleton className="h-2.5 w-14 rounded-md" />
              </div>
            </div>
          </div>
          <Skeleton className="w-14 h-6 rounded-full shrink-0 ml-2" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton placeholder for Comprehensive Product Results and AI Nutrition analysis.
 */
export function SkeletonNutritionOverview() {
  return (
    <div className="space-y-4 animate-pulse max-w-md mx-auto" aria-label="Loading food nutrition analysis">
      {/* Product Hero Banner */}
      <div className="p-5 rounded-3xl bg-white shadow-soft border border-gray-100 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-6 w-4/5 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
        </div>

        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
      </div>

      {/* 4 Nutrient Macro Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-2">
            <Skeleton className="h-2.5 w-12 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-2 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* FOPNL Alert Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4 rounded-md" />
          <Skeleton className="h-2.5 w-1/2 rounded-md" />
        </div>
      </div>

      {/* Ingredients List Card */}
      <div className="p-5 rounded-3xl bg-white shadow-soft border border-gray-100 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-36 rounded-md" />
                <Skeleton className="h-2.5 w-24 rounded-md" />
              </div>
              <Skeleton className="h-4 w-12 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
