import { NavLink, useLocation } from 'react-router-dom'

// Streamlined 5-tab bottom navigation with AI Food in the exact center
const tabs = [
  { to: '/', label: 'Home', emoji: '🏠' },
  { to: '/scan', label: 'Scan', emoji: '📷' },
  { to: '/ai-nutrition', label: 'AI Food', emoji: '✨', isCenter: true },
  { to: '/tracker', label: 'Progress', emoji: '📊' },
  { to: '/profile', label: 'Profile', emoji: '👤' },
]

export default function BottomTabBar() {
  const location = useLocation()
  const isAuthRoute =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register')

  if (isAuthRoute) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] pointer-events-auto">
      <div className="glass max-w-md mx-auto mb-3 rounded-3xl shadow-soft border border-white/60 backdrop-blur-lg bg-white/92 px-1">
        <div className="flex items-center justify-around px-1 py-1.5">
          {tabs.map((tab) => {
            if (tab.isCenter) {
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    [
                      'flex flex-1 flex-col items-center justify-center -mt-4 transition-all duration-200 group',
                      isActive ? 'scale-105' : 'hover:scale-102',
                    ].join(' ')
                  }
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 shadow-md flex items-center justify-center text-white border-2 border-white group-active:scale-95 transition-transform">
                    <span className="text-xl">✨</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-purple-900 mt-0.5 tracking-tight">
                    {tab.label}
                  </span>
                </NavLink>
              )
            }

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  [
                    'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-1.5 transition-all duration-200',
                    isActive
                      ? 'bg-emerald-100/80 text-emerald-800 font-extrabold scale-[1.02]'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 font-medium',
                  ].join(' ')
                }
              >
                <span className="text-lg leading-none">{tab.emoji}</span>
                <span className="text-[10px] leading-tight font-semibold mt-0.5">
                  {tab.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
