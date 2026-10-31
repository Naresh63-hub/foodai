import client from '../api/client'
import { DailyFoodLogItem } from '../types/food'

/**
 * Flushes any pending offline meal logs stored in localStorage to the Django backend.
 * Safely stops if network or server is unresponsive.
 */
export async function flushOfflineMealLogs(): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { synced: 0, failed: 0 }
  }

  let totalSynced = 0
  let totalFailed = 0

  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('foodai_daily_log_')) {
        keys.push(k)
      }
    }

    for (const key of keys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      let items: DailyFoodLogItem[] = []
      try {
        items = JSON.parse(raw)
      } catch {
        continue
      }

      let updated = false
      for (const item of items) {
        // Items created locally have local- prefix or status: saved_locally
        const isLocalOnly =
          item.id?.startsWith('local-') ||
          (item as any).status === 'saved_locally'

        if (isLocalOnly) {
          try {
            const dateKey = key.replace('foodai_daily_log_', '')
            const res = await client.post('/daily-logs/', {
              product_name: item.product_name,
              portion_g: item.portion_g,
              calories_kcal: (item as any).calories_kcal || 0,
              carbohydrates_g: (item as any).carbohydrates_g || 0,
              proteins_g: (item as any).proteins_g || 0,
              fat_g: item.fat_g || 0,
              sugars_g: item.sugars_g || 0,
              salt_g: item.salt_g || 0,
              additives_count: item.additives_count || 0,
              processing_level: item.processing_level || 'minimally_processed',
              date_key: dateKey,
            })
            if (res.data?.id) {
              item.id = String(res.data.id)
              delete (item as any).status
              updated = true
              totalSynced++
            }
          } catch (err) {
            totalFailed++
            console.debug('Offline sync retry deferred:', err)
            break // Backend might still be sleeping, avoid hammer
          }
        }
      }

      if (updated) {
        try {
          localStorage.setItem(key, JSON.stringify(items))
        } catch {}
      }
    }
  } catch (e) {
    console.debug('Error in flushOfflineMealLogs:', e)
  }

  return { synced: totalSynced, failed: totalFailed }
}

/**
 * Counts how many meal items are currently queued locally and waiting for server sync.
 */
export function countPendingOfflineLogs(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0
  let count = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('foodai_daily_log_')) {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const items = JSON.parse(raw)
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.id?.startsWith('local-') || (item as any).status === 'saved_locally') {
              count++
            }
          }
        }
      }
    }
  } catch {}
  return count
}
