import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import ProcessingBadge from '../components/ProcessingBadge'
import { deleteScan, getScanHistory } from '../api/food'
import { QUICK_SAMPLE_PRESETS } from '../constants'

export default function History() {
  const [scans, setScans] = useState<any[]>([])

  useEffect(() => {
    getScanHistory()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setScans(data)
        } else {
          setScans(
            QUICK_SAMPLE_PRESETS.map((p, idx) => ({
              id: idx + 1,
              barcode: p.barcode,
              product_name: p.name,
              brands: p.category,
              scanned_at: 'Sample Item',
              payload: {
                processing_level: p.processing,
                verdict: p.name,
              },
            }))
          )
        }
      })
      .catch(() => {
        setScans(
          QUICK_SAMPLE_PRESETS.map((p, idx) => ({
            id: idx + 1,
            barcode: p.barcode,
            product_name: p.name,
            brands: p.category,
            scanned_at: 'Sample Item',
            payload: {
              processing_level: p.processing,
              verdict: p.name,
            },
          }))
        )
      })
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await deleteScan(id)
      setScans(scans.filter((s) => s.id !== id))
    } catch {
      setScans(scans.filter((s) => s.id !== id))
    }
  }

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Scan History</h1>
        <p className="mt-1 text-xs text-gray-500">
          {scans.length} products scanned & analyzed
        </p>

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
                          {scan.brands} · {typeof scan.scanned_at === 'string' && scan.scanned_at.includes('T') ? new Date(scan.scanned_at).toLocaleDateString() : scan.scanned_at}
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
      </div>
    </SafeAreaView>
  )
}
