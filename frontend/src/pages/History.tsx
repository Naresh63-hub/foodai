import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import ProcessingBadge from '../components/ProcessingBadge'
import { deleteScan, getScanHistory } from '../api/food'

type Status = 'loading' | 'ready' | 'error'

export default function History() {
  const [scans, setScans] = useState<any[]>([])
  const [status, setStatus] = useState<Status>('loading')

  const load = useCallback(() => {
    setStatus('loading')
    getScanHistory()
      .then((data) => {
        setScans(Array.isArray(data) ? data : [])
        setStatus('ready')
      })
      .catch((error: any) => {
        setScans([])
        // A 401 means "not signed in" (e.g. dev-bypass sends no real token),
        // which is an empty history — not a connection failure.
        const status = error?.response?.status
        setStatus(status === 401 || status === 403 ? 'ready' : 'error')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setScans((prev) => prev.filter((s) => s.id !== id))
    try {
      await deleteScan(id)
    } catch {
      // Re-fetch on failure so the list reflects the server truth.
      load()
    }
  }

  const formatDate = (value: unknown) =>
    typeof value === 'string' && value.includes('T') ? new Date(value).toLocaleDateString() : value

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Scan History</h1>
        <p className="mt-1 text-xs text-gray-500">
          {status === 'ready' ? `${scans.length} products scanned & analyzed` : 'Your past scans'}
        </p>

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
