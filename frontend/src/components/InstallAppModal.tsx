import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallAppModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    const ua = navigator.userAgent.toLowerCase()
    setIsAndroid(/android/.test(ua))

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  if (!isOpen) return null

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setIsInstalled(true)
      onClose()
    }
    setDeferredPrompt(null)
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(currentUrl)}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-0">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="FoodAI App Logo" className="w-10 h-10 rounded-xl shadow-xs" />
            <div>
              <h3 className="text-base font-black text-gray-900 leading-tight">Install FoodAI</h3>
              <p className="text-[11px] text-gray-500 font-medium">Android APK & Native PWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {isInstalled ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
              ✓
            </div>
            <h4 className="text-base font-bold text-gray-900">App Already Installed</h4>
            <p className="text-xs text-gray-500 mt-1">
              FoodAI is running in standalone mobile app mode on your device.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4 text-xs text-gray-600">
            {/* 1-Click Native Browser Install if available */}
            {deferredPrompt && (
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <p className="font-bold text-emerald-900 text-xs mb-1.5">⚡ Instant 1-Click Installation</p>
                <p className="text-emerald-800 text-[11px] leading-relaxed mb-3">
                  Your browser supports native installation. This adds FoodAI directly to your phone's app drawer with the official logo!
                </p>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-soft transition-all active:scale-[0.98]"
                >
                  Install FoodAI on Device
                </button>
              </div>
            )}

            {/* Android Chrome Install Instructions */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-xs">
                <span>🤖</span>
                <span>Option A: Direct Android Install (Chrome)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600">
                <li>Open this app in <strong>Google Chrome</strong> on your phone.</li>
                <li>Tap the <strong>three dots menu (⋮)</strong> at the top right.</li>
                <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Android automatically generates a native WebAPK with the official icon and launches full-screen.</li>
              </ol>
            </div>

            {/* Standalone APK Generator */}
            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-purple-900 text-xs">
                <span>📦</span>
                <span>Option B: Download Standalone .APK File</span>
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                To download a signed standalone <strong>.apk</strong> or <strong>.aab</strong> package for side-loading or Google Play Store:
              </p>
              <a
                href={pwaBuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-soft transition-all active:scale-[0.98]"
              >
                Open PWABuilder (Generate APK) ➔
              </a>
              <p className="text-[10px] text-purple-700 text-center">
                Uses official Google Bubblewrap & TWA (Trusted Web Activity) standards.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
