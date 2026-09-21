import { Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import Home from './pages/Home'
import Scan from './pages/Scan'
import ProductResults from './pages/ProductResults'
import IngredientDetails from './pages/IngredientDetails'
import Nutrition from './pages/Nutrition'
import FoodDNA from './pages/FoodDNA'
import ProductComparison from './pages/ProductComparison'
import History from './pages/History'
import Profile from './pages/Profile'
import ProfilePreferences from './pages/ProfilePreferences'
import DailyTracker from './pages/DailyTracker'
import GroceryCart from './pages/GroceryCart'
import CatalogExplorer from './pages/CatalogExplorer'
import BottomTabBar from './components/BottomTabBar'
import SafeAreaView from './components/SafeAreaView'

function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <SafeAreaView>
      <div className="px-6 py-8 pb-28">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
      </div>
    </SafeAreaView>
  )
}

const Login = () => <PlaceholderPage title="Login" subtitle="Welcome back to FoodAI." />
const Register = () => <PlaceholderPage title="Create Account" subtitle="Join FoodAI today." />

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
    <div className="relative min-h-screen">
      <Outlet />
      <BottomTabBar />
    </div>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<CatalogExplorer />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/tracker" element={<DailyTracker />} />
        <Route path="/cart" element={<GroceryCart />} />
        <Route path="/compare" element={<ProductComparison />} />
        <Route path="/results/:scanId" element={<ProductResultsParamWrapper />} />
        <Route path="/ingredient/:id" element={<IngredientParamWrapper />} />
        <Route path="/nutrition/:scanId" element={<NutritionParamWrapper />} />
        <Route path="/dna/:scanId" element={<DnaParamWrapper />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/preferences" element={<ProfilePreferences />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
