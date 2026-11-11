import React from 'react'

interface AppLogoProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  showTagline?: boolean
}

export default function AppLogo({
  className = '',
  size = 'md',
  variant = 'icon',
  showTagline = true,
}: AppLogoProps) {
  // Dimension mapping
  const sizeMap = {
    xs: { icon: 'w-7 h-7', text: 'text-sm', sub: 'text-[10px]' },
    sm: { icon: 'w-9 h-9', text: 'text-base', sub: 'text-[11px]' },
    md: { icon: 'w-12 h-12', text: 'text-xl', sub: 'text-xs' },
    lg: { icon: 'w-16 h-16', text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 'w-24 h-24', text: 'text-3xl', sub: 'text-sm' },
  }

  const currentSize = sizeMap[size]

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <img
          src="/public/logo-full.png"
          alt="FoodAI - Know What You're Eating"
          className="max-w-full h-auto drop-shadow-sm select-none"
          style={{ width: size === 'xl' ? '280px' : size === 'lg' ? '220px' : '180px' }}
          referrerPolicy="no-referrer"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/logo-full.svg'
          }}
        />
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/public/icon-192.png"
        alt="FoodAI Logo"
        className={`${currentSize.icon} rounded-2xl shadow-soft object-contain shrink-0 select-none`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = '/icon.svg'
        }}
      />
      <div>
        <div className="flex items-baseline gap-1 leading-none">
          <span className={`font-black text-gray-950 tracking-tight ${currentSize.text}`}>
            Food<span className="text-emerald-600">AI</span>
          </span>
        </div>
        {showTagline && (
          <p className={`text-emerald-700 font-bold tracking-tight mt-0.5 leading-none ${currentSize.sub}`}>
            Know What You're Eating
          </p>
        )}
      </div>
    </div>
  )
}
