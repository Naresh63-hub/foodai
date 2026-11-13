import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import ProcessingBadge from '../components/ProcessingBadge'
import { deleteScan, getScanHistory } from '../api/food'
import { useAuth } from '../contexts/AuthContext'
import { getUserFoodScans, StoredFoodScan } from '../services/firestoreService'

type Status = 'loading' | 'ready' | 'error'

const SCANS_CACHE_KEY = 'foodai_recent_scans_cache'

function readCachedScans(): any[] {
  try {
    const raw = localStorage.getItem(SCANS_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function History() {
  const { user } = useAuth()
  const [scans, setScans] = useState<any[]>(() => readCachedScans())
  const [status, setStatus] = useState<Status>('ready')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async () => {
    const cached = readCachedScans()
    if (cached.length > 0) {
      setScans(cached)
    }

    setIsRefreshing(true)
    try {
      const [backendData, firestoreData] = await Promise.allSettled([
        getScanHistory(),
        user?.uid ? getUserFoodScans(user.uid) : Promise.resolve([]),
      ])

      const backendList =
        backendData.status === 'fulfilled' && Array.isArray(backendData.value)
          ? backendData.value
          : []

      const firestoreList: any[] =
        firestoreData.status === 'fulfilled' && Array.isArray(firestoreData.value)
          ? firestoreData.value.map((fs: StoredFoodScan) => ({
              id: fs.id,
              barcode: fs.id,
              product_name: fs.foodName,
              brands: fs.servingDescription || 'FoodAI Snap',
              scanned_at: fs.createdAt,
              payload: {
                product_name: fs.foodName,
                processing_level: fs.processingLevel || 'unprocessed',
                calories_kcal: fs.caloriesKcal || 0,
                health_score: fs.healthScore,
              },
            }))
          : []

      const scanMap = new Map<string, any>()
      for (const item of cached) {
        scanMap.set(String(item.id || item.barcode), item)
      }
      for (const item of firestoreList) {
        if (!scanMap.has(String(item.id || item.barcode))) {
          scanMap.set(String(item.id || item.barcode), item)
        }
      }
      for (const item of backendList) {
        scanMap.set(String(item.id || item.barcode), item)
      }

      const combined = Array.from(scanMap.values()).sort((a, b) => {
        const timeA = new Date(a.scanned_at || a.created_at || 0).getTime()
        const timeB = new Date(b.scanned_at || b.created_at || 0).getTime()
        return timeB - timeA
      })

      setScans(combined)
      setStatus('ready')
      try {
        localStorage.setItem(SCANS_CACHE_KEY, JSON.stringify(combined))
      } catch {}
    } catch {
      setStatus('ready')
    } finally {
      setIsRefreshing(false)
    }
  }, [user?.uid])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (e: React.MouseEvent, id: number | string) => {
    e.preventDefault()
    e.stopPropagation()
    setScans((prev) => prev.filter((s) => String(s.id) !== String(id) && String(s.barcode) !== String(id)))
    try {
      await deleteScan(id)
    } catch {
      load()
    }
  }

  const formatDate = (value: unknown) =>
    typeof value === 'string' && value.includes('T') ? new Date(value).toLocaleDateString() : value

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Scan History</h1>
            <p className="mt-1 text-xs text-gray-500">
              {scans.length} products scanned & analyzed
            </p>
          </div>
          {isRefreshing && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full animate-pulse border border-emerald-200">
              Syncing...
            </span>
          )}
        </div>

        {status === 'loading' && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-600"></div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-center">
            <p className="text-sm font-bold text-rose-800">We couldn't load your history.</p>
            <p className="text-xs text-rose-600 mt-1">Please check your connection and try again.</p>
            <button
              onClick={load}
              className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {status === 'ready' && scans.length === 0 && (
          <div className="mt-6 rounded-2xl bg-white border border-gray-100 shadow-card p-6 text-center">
            <div className="text-3xl mb-2">🔎</div>
            <p className="text-sm font-bold text-gray-900">No scans yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Scan a barcode or label and it will show up here.
            </p>
            <Link
              to="/scan"
              className="inline-block mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              Scan a product
            </Link>
          </div>
        )}

        {status === 'ready' && scans.length > 0 && (
          <div className="mt-5 space-y-2.5">
            {scans.map((scan) => {
              const level = scan.payload?.processing_level || 'processed'
              const barcode = scan.barcode || String(scan.id)
              return (
                <Link
                  key={scan.id}
                  to={`/results/${barcode}`}
                  state={{ result: scan.payload }}
                  className="block rounded-2xl bg-white shadow-card border border-gray-100 p-4 hover:border-emerald-300 hover:shadow-soft transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-xl flex-shrink-0 font-bold">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-gray-900 truncate">
                            {scan.product_name}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {scan.brands} · {formatDate(scan.scanned_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, scan.id)}
                          className="text-gray-300 hover:text-rose-500 text-xs p-1"
                          title="Delete scan"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-1.5">
                        <ProcessingBadge level={level} size="sm" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </SafeAreaView>
  )
}
