import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', emoji: '🏠' },
  { to: '/scan', label: 'Scan', emoji: '📷' },
  { to: '/tracker', label: 'Tracker', emoji: '📊' },
  { to: '/cart', label: 'Cart', emoji: '🛒' },
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
      <div className="glass max-w-md mx-auto mb-3 rounded-3xl shadow-soft border border-white/60 backdrop-blur-lg bg-white/85">
        <div className="flex items-center justify-around px-2 py-1.5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all duration-200',
                  isActive
                    ? 'bg-primary-100/70 text-primary-800 font-bold scale-[1.03]'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 font-medium',
                ].join(' ')
              }
            >
              <span className="text-xl leading-none">{tab.emoji}</span>
              <span className="text-[10px] leading-tight">
                {tab.label}
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
