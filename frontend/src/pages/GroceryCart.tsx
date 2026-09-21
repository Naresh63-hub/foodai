import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import { toast } from 'sonner'
import { GroceryCartItem } from '../types/food'

export default function GroceryCart() {
  const [items, setItems] = useState<GroceryCartItem[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('foodai_grocery_cart')
      if (saved) {
        setItems(JSON.parse(saved))
      }
    } catch {
      setItems([])
    }
  }, [])

  const saveCart = (newItems: GroceryCartItem[]) => {
    setItems(newItems)
    localStorage.setItem('foodai_grocery_cart', JSON.stringify(newItems))
  }

  const handleRemove = (id: string) => {
    const updated = items.filter((i) => i.id !== id)
    saveCart(updated)
    toast.success('Removed from cart')
  }

  const handleClear = () => {
    if (confirm('Clear all items from your grocery cart?')) {
      saveCart([])
      toast.info('Grocery cart cleared')
    }
  }

  // Aggregated Analytics
  const totalItems = items.length
  const upfCount = items.filter((i) => i.processing_level === 'ultra_processed' || i.processing_level === 'highly_processed').length
  const upfPercent = totalItems > 0 ? Math.round((upfCount / totalItems) * 100) : 0
  const palmOilCount = items.filter((i) => i.has_palm_oil).length
  const totalAdditives = items.reduce((acc, cur) => acc + (cur.additives_count || 0), 0)

  // Cart Health Grade
  let cartGrade = 'A'
  let gradeColor = 'from-emerald-600 to-teal-700'
  let gradeText = 'Whole-Food Centric Basket'
  if (upfPercent > 60) {
    cartGrade = 'D'
    gradeColor = 'from-rose-600 to-red-800'
    gradeText = 'High Ultra-Processed Load'
  } else if (upfPercent > 35) {
    cartGrade = 'C'
    gradeColor = 'from-amber-500 to-orange-700'
    gradeText = 'Moderate Ultra-Processed Content'
  } else if (upfPercent > 10) {
    cartGrade = 'B'
    gradeColor = 'from-teal-600 to-cyan-700'
    gradeText = 'Balanced Whole-Food Basket'
  }

  // Find worst offender (highest sugar or highest additives)
  const worstItem = [...items].sort((a, b) => (b.sugars_100g || 0) - (a.sugars_100g || 0))[0]

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-1">
              <span>🛒</span>
              <span>Pre-Checkout Food Screener</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Grocery Basket</h1>
            <p className="text-xs text-gray-500">Screen multiple items before buying</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="text-[11px] font-bold text-gray-400 hover:text-rose-600 transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>

        {items.length > 0 ? (
          <>
            {/* CART HEALTH SCORECARD */}
            <div className={`rounded-3xl bg-gradient-to-br ${gradeColor} text-white p-5 shadow-soft mb-6 relative overflow-hidden`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/80 mb-1">
                    Cart Health Grade
                  </p>
                  <h2 className="text-lg font-black tracking-tight">{gradeText}</h2>
                  <p className="text-xs text-white/90 mt-1">
                    {upfPercent}% of basket items are ultra-processed
                  </p>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                  <span className="text-3xl font-black text-white">{cartGrade}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-white/75 font-semibold">Total Items</p>
                  <p className="text-base font-black">{totalItems}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/75 font-semibold">Palm Oil Items</p>
                  <p className="text-base font-black text-amber-200">{palmOilCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/75 font-semibold">Total Additives</p>
                  <p className="text-base font-black text-purple-200">{totalAdditives}</p>
                </div>
              </div>
            </div>

            {/* WORST OFFENDER & HEALTHIER SWAP */}
            {worstItem && worstItem.sugars_100g >= 15 && (
              <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">⚠️</span>
                  <p className="text-xs font-black text-rose-900 uppercase tracking-wider">
                    Highest Sugar Item in Cart
                  </p>
                </div>
                <p className="text-sm font-extrabold text-gray-900">{worstItem.product_name}</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Contains {worstItem.sugars_100g}g sugar / 100g.
                </p>

                {worstItem.healthier_swap && (
                  <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-start gap-2">
                    <span className="text-xs">🔄</span>
                    <p className="text-[11px] text-gray-700 font-medium">
                      <strong className="text-emerald-800">Healthier Swap: </strong>
                      {worstItem.healthier_swap}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CART ITEMS LIST */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900">
                  Cart Items ({items.length})
                </h2>
                <Link to="/scan" className="text-xs font-bold text-emerald-700 hover:underline">
                  + Scan More Items
                </Link>
              </div>

              <div className="space-y-2.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white shadow-card p-3.5 border border-gray-100 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-xs font-black text-gray-900 truncate">
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 flex-wrap">
                        <span className="capitalize text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          {item.processing_level.replace('_', ' ')}
                        </span>
                        <span>{item.sugars_100g}g sugar</span>
                        <span>·</span>
                        <span>{item.additives_count} additives</span>
                        {item.has_palm_oil && (
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                            Palm Oil
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemove(item.id)}
                      className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 flex items-center justify-center text-sm font-bold transition-colors shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/70 p-8 text-center mb-6">
            <span className="text-4xl">🛒</span>
            <p className="text-sm font-black text-gray-800 mt-2">Your Grocery Basket is Empty</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Scan items while shopping at the supermarket and tap <strong>"Add to Cart"</strong> to get an instant basket health rating before checkout!
            </p>
            <Link
              to="/scan"
              className="mt-4 inline-block rounded-2xl bg-emerald-600 text-white font-bold px-4 py-2 text-xs shadow-soft hover:bg-emerald-700 transition-all"
            >
              Scan Food Items
            </Link>
          </div>
        )}
      </div>
    </SafeAreaView>
  )
}