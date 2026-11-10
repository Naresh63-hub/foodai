import { APP_VERSION } from '../config/version'
import { AppReleaseInfo } from '../services/appUpdateService'

interface UpdateReleaseModalProps {
  isOpen: boolean
  onClose: (remindLater?: boolean) => void
  releaseInfo?: AppReleaseInfo | null
}

export default function UpdateReleaseModal({
  isOpen,
  onClose,
  releaseInfo,
}: UpdateReleaseModalProps) {
  if (!isOpen) return null

  const newVersion = releaseInfo?.version || '1.0.1'
  const releaseName = releaseInfo?.name || `FoodAI v${newVersion}`
  const releaseNotes =
    releaseInfo?.releaseNotes ||
    '• New official FoodAI adaptive launcher icon for Android devices.\n• Fast native Google 1-Tap sign-in with Credential Manager.\n• Improved nutritional scan accuracy and offline resilience.'
  const downloadUrl = releaseInfo?.apkDownloadUrl || 'https://github.com/Naresh63-hub/foodai/releases'

  const notesLines = releaseNotes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const handleDownload = () => {
    if (typeof window !== 'undefined') {
      window.open(downloadUrl, '_blank')
    }
    onClose(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header with App Logo & Rocket Badge */}
        <div className="text-center pb-4">
          <div className="relative inline-flex items-center justify-center mb-3">
            <img
              src="/icon-192.png"
              alt="FoodAI Logo"
              className="w-16 h-16 rounded-2xl shadow-soft object-contain border border-emerald-100 bg-white p-1"
            />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs shadow-md border-2 border-white animate-bounce">
              🚀
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200/80 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            NEW VERSION AVAILABLE
          </div>

          <h2
            id="update-modal-title"
            className="text-xl font-black text-gray-900 tracking-tight"
          >
            Update FoodAI
          </h2>

          {/* Version Transition Badge */}
          <div className="mt-2 inline-flex items-center gap-2 bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600">
            <span className="text-gray-400">Current: v{APP_VERSION}</span>
            <span className="text-emerald-500 font-extrabold">➔</span>
            <span className="text-emerald-700 font-extrabold bg-emerald-100/70 px-2 py-0.5 rounded-md">
              New: v{newVersion}
            </span>
          </div>
        </div>

        {/* Release Notes Card */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 my-3 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
              ✨ What's New
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {releaseName}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-gray-700 leading-relaxed">
            {notesLines.map((note, index) => {
              const cleaned = note.replace(/^[•\-*]\s*/, '')
              return (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>{cleaned}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Highlight Badges */}
        <div className="grid grid-cols-2 gap-2 my-4 text-[11px]">
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 flex items-center gap-2 font-semibold">
            <span>🎨</span>
            <span>Official App Icon</span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 flex items-center gap-2 font-semibold">
            <span>⚡</span>
            <span>1-Tap Google Sign-In</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black py-3.5 px-4 text-sm shadow-soft transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>📥</span>
            <span>Download & Install APK</span>
          </button>

          <button
            type="button"
            onClick={() => onClose(true)}
            className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
          >
            Remind Me Later
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-gray-400 font-medium">
          Official Release · SHA-256 Verified Android Package
        </p>
      </div>
    </div>
  )
}
