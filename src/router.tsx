import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import BottomTabBar from './components/BottomTabBar'
import SafeAreaView from './components/SafeAreaView'
import { useAuth } from './contexts/AuthContext'

// Code-split page routes so the initial bundle stays small; each page loads on demand.
const Home = lazy(() => import('./pages/Home'))
const Scan = lazy(() => import('./pages/Scan'))
const ProductResults = lazy(() => import('./pages/ProductResults'))
const IngredientDetails = lazy(() => import('./pages/IngredientDetails'))
const Nutrition = lazy(() => import('./pages/Nutrition'))
const FoodDNA = lazy(() => import('./pages/FoodDNA'))
const ProductComparison = lazy(() => import('./pages/ProductComparison'))
const History = lazy(() => import('./pages/History'))
const Profile = lazy(() => import('./pages/Profile'))
const ProfilePreferences = lazy(() => import('./pages/ProfilePreferences'))
const DailyTracker = lazy(() => import('./pages/DailyTracker'))
const GroceryCart = lazy(() => import('./pages/GroceryCart'))
const CatalogExplorer = lazy(() => import('./pages/CatalogExplorer'))
const AINutritionAnalyzer = lazy(() => import('./pages/AINutritionAnalyzer'))
const FoodCameraSnap = lazy(() => import('./pages/FoodCameraSnap'))
const PlateAnalyzer = lazy(() => import('./pages/PlateAnalyzer'))
const VoiceLogPage = lazy(() => import('./pages/VoiceLogPage'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))

function PageSpinner() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl animate-pulse">
          🥗
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500 border-t-transparent animate-spin"></div>
      </div>
      <p className="text-xs font-semibold text-gray-500 animate-pulse">Loading FoodAI...</p>
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <SafeAreaView>
      <div className="px-5 py-16 text-center max-w-md mx-auto">
        <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-6">
          <div className="text-4xl mb-3">🔍</div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">{title}</h1>
          <p className="text-xs text-gray-500 mt-1">This item is not available.</p>
        </div>
      </div>
    </SafeAreaView>
  )
}

function DevDemoBanner() {
  const { isDemoMode } = useAuth()
  if (!isDemoMode) return null
  return (
    <div className="sticky top-0 z-50 w-full max-w-full bg-amber-400 text-amber-950 text-center text-xs font-bold py-1.5 px-3 shadow-sm truncate box-border">
      🧪 DEV DEMO MODE — login is bypassed locally, no real account in use
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signInDemo } = useAuth()
  const [showEscapeHatch, setShowEscapeHatch] = useState(false)

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowEscapeHatch(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (loading) {
    return (
      <SafeAreaView>
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="relative flex items-center justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl animate-pulse">
              🥗
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm font-semibold text-gray-700 animate-pulse">Connecting to FoodAI...</p>
          {showEscapeHatch && (
            <div className="mt-5 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl max-w-xs w-full shadow-sm">
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                Network connection is slower than usual.
              </p>
              <button
                type="button"
                onClick={() => signInDemo()}
                className="mt-3 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
              >
                ⚡ Continue in Fast Demo Mode
              </button>
            </div>
          )}
        </div>
      </SafeAreaView>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function IngredientParamWrapper() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <PlaceholderPage title="Ingredient Not Found" />
  return <IngredientDetails />
}

function NutritionParamWrapper() {
  const { scanId } = useParams<{ scanId: string }>()
  if (!scanId) return <PlaceholderPage title="Nutrition Not Found" />
  return <Nutrition />
}

function DnaParamWrapper() {
  const { scanId } = useParams<{ scanId: string }>()
  if (!scanId) return <PlaceholderPage title="Food DNA Not Found" />
  return <FoodDNA />
}

function ProductResultsParamWrapper() {
  const { scanId } = useParams<{ scanId: string }>()
  if (!scanId) return <PlaceholderPage title="Results Not Found" />
  return <ProductResults />
}

function AppLayout() {
  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden box-border">
      <DevDemoBanner />
      <main className="w-full max-w-full box-border animate-fade-in-up">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<ProtectedRoute><CatalogExplorer /></ProtectedRoute>} />
          <Route path="/ai-nutrition" element={<ProtectedRoute><AINutritionAnalyzer /></ProtectedRoute>} />
          <Route path="/camera-snap" element={<ProtectedRoute><FoodCameraSnap /></ProtectedRoute>} />
          <Route path="/plate" element={<ProtectedRoute><PlateAnalyzer /></ProtectedRoute>} />
          <Route path="/analyze-plate" element={<ProtectedRoute><PlateAnalyzer /></ProtectedRoute>} />
          <Route path="/voice-log" element={<ProtectedRoute><VoiceLogPage /></ProtectedRoute>} />
          <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
          <Route path="/tracker" element={<ProtectedRoute><DailyTracker /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><GroceryCart /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><ProductComparison /></ProtectedRoute>} />
          <Route path="/results/:scanId" element={<ProtectedRoute><ProductResultsParamWrapper /></ProtectedRoute>} />
          <Route path="/ingredient/:id" element={<ProtectedRoute><IngredientParamWrapper /></ProtectedRoute>} />
          <Route path="/nutrition/:scanId" element={<ProtectedRoute><NutritionParamWrapper /></ProtectedRoute>} />
          <Route path="/dna/:scanId" element={<ProtectedRoute><DnaParamWrapper /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/preferences" element={<ProtectedRoute><ProfilePreferences /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
