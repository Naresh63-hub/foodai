import { lazy, Suspense } from 'react'
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
const VoiceLogPage = lazy(() => import('./pages/VoiceLogPage'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))

function PageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-600"></div>
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
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <SafeAreaView>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
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
      <main className="w-full max-w-full box-border">
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
