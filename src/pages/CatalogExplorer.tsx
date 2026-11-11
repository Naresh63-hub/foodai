import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { searchProducts, CatalogProductItem } from '../api/food'

const CATEGORIES = [
  { id: '', label: 'All Foods', icon: '🍽️' },
  { id: 'biscuit', label: 'Biscuits', icon: '🍪' },
  { id: 'noodle', label: 'Noodles & Meals', icon: '🍜' },
  { id: 'snack', label: 'Snacks & Namkeen', icon: '🥨' },
  { id: 'chocolate', label: 'Chocolates', icon: '🍫' },
  { id: 'beverage', label: 'Drinks & Juices', icon: '🧃' },
  { id: 'dairy', label: 'Dairy & Spreads', icon: '🥛' },
  { id: 'whole', label: 'Whole Foods', icon: '🥗' },
]

const BRANDS = ['All Brands', 'Britannia', 'Parle', 'Amul', 'Nestle', "Haldiram's", 'PepsiCo', 'ITC']

export default function CatalogExplorer() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('All Brands')
  const [palmOilFree, setPalmOilFree] = useState(false)
  const [lowSugar, setLowSugar] = useState(false)
  const [lowSalt, setLowSalt] = useState(false)
  const [products, setProducts] = useState<CatalogProductItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCatalog = () => {
    setLoading(true)
    searchProducts({
      q: query.trim() || undefined,
      brand: selectedBrand !== 'All Brands' ? selectedBrand : undefined,
      category: selectedCategory || undefined,
      palm_oil_free: palmOilFree,
      low_sugar: lowSugar,
      low_salt: lowSalt,
    })
      .then((res) => {
        setProducts(res)
      })
      .catch(() => {
        setProducts([])
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog()
    }, 200)
    return () => clearTimeout(timer)
  }, [query, selectedCategory, selectedBrand, palmOilFree, lowSugar, lowSalt])

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-1.5">
            <span>🔎</span>
            <span>Food Intelligence Database</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Explore Food Catalog</h1>
          <p className="text-xs text-gray-500">Search and screen packaged & whole food items</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, brand or barcode..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pl-11 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent shadow-card"
          />
          <span className="absolute left-3.5 top-3.5 text-gray-400 text-base">🔍</span>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={[
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-soft scale-[1.02]'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 shadow-xs',
                ].join(' ')}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Health Preference Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setPalmOilFree((prev) => !prev)}
            className={[
              'text-[11px] font-bold px-3 py-1 rounded-full border transition-all',
              palmOilFree
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 shadow-xs',
            ].join(' ')}
          >
            🌴 Palm-Oil Free
          </button>
          <button
            onClick={() => setLowSugar((prev) => !prev)}
            className={[
              'text-[11px] font-bold px-3 py-1 rounded-full border transition-all',
              lowSugar
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 shadow-xs',
            ].join(' ')}
          >
            🍬 Low Sugar (&lt;5g)
          </button>
          <button
            onClick={() => setLowSalt((prev) => !prev)}
            className={[
              'text-[11px] font-bold px-3 py-1 rounded-full border transition-all',
              lowSalt
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 shadow-xs',
            ].join(' ')}
          >
            🧂 Low Salt (&lt;0.5g)
          </button>
        </div>

        {/* Brand Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {BRANDS.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBrand(b)}
              className={[
                'shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors',
                selectedBrand === b
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black uppercase tracking-wider text-gray-700">
            {loading ? 'Searching Database...' : `Matching Foods (${products.length})`}
          </p>
          <span className="text-[11px] text-gray-400">Tap item to analyze</span>
        </div>

        {/* Product Cards List */}
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((item) => (
              <div
                key={item.id || item.barcode}
                onClick={() => navigate(`/results/${item.barcode}`)}
                className="rounded-2xl bg-white shadow-card p-4 border border-gray-100 hover:border-emerald-300 hover:shadow-soft transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {item.brands || 'Packaged Product'}
                    </span>
                    <h3 className="text-sm font-black text-gray-900 group-hover:text-emerald-700 transition-colors mt-0.5 line-clamp-1">
                      {item.product_name}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all">
                    ➔
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] flex-wrap gap-y-1">
                  <div className="flex items-center gap-2">
                    <span>
                      <strong className="text-pink-600">{item.sugars_100g}g</strong> sugar
                    </span>
                    <span>·</span>
                    <span>
                      <strong className="text-sky-600">{item.salt_100g}g</strong> salt
                    </span>
                    <span>·</span>
                    <span>
                      <strong className="text-amber-600">{item.fat_100g}g</strong> fat
                    </span>
                  </div>

                  {item.has_palm_oil ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Palm Oil
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Palm-Free
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/70 p-8 text-center">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-black text-gray-800 mt-2">No Matching Products Found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Try adjusting your filters, searching for a brand like "Britannia" or "Amul", or scanning a new barcode!
            </p>
            <Link
              to="/scan"
              className="mt-4 inline-block rounded-2xl bg-emerald-600 text-white font-bold px-4 py-2 text-xs shadow-soft hover:bg-emerald-700 transition-all"
            >
              Scan Any Barcode
            </Link>
          </div>
        )}
      </div>
    </SafeAreaView>
  )
}