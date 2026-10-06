import { useCallback, useEffect, useState } from 'react'
import { getUserProfile, updateUserProfile } from '../api/food'
import { useAuth } from '../contexts/AuthContext'
import { AUTH_BYPASS } from '../config/authMode'

export interface Preferences {
  age: string
  weight: string
  conditions: string[]
}

const KEYS = {
  age: 'prefs_age',
  weight: 'prefs_weight',
  conditions: 'prefs_health_conditions',
}

export type SaveResult = 'server' | 'local' | 'offline'

function readLocal(): Preferences {
  let conditions: string[] = []
  try {
    conditions = JSON.parse(localStorage.getItem(KEYS.conditions) || '[]')
    if (!Array.isArray(conditions)) conditions = []
  } catch {
    conditions = []
  }
  return {
    age: localStorage.getItem(KEYS.age) ?? '',
    weight: localStorage.getItem(KEYS.weight) ?? '',
    conditions,
  }
}

function writeLocal(p: Preferences): void {
  localStorage.setItem(KEYS.age, p.age)
  localStorage.setItem(KEYS.weight, p.weight)
  localStorage.setItem(KEYS.conditions, JSON.stringify(p.conditions))
}

/**
 * Single source of truth for user health preferences.
 * - Authenticated (real Firebase user): the backend /api/users/profile/ is
 *   authoritative; localStorage is kept as a fast mirror / offline fallback.
 * - Anonymous or dev-bypass: behaves offline-only via localStorage.
 */
export function useUserPreferences() {
  const { user } = useAuth()
  const serverBacked = !!user && !AUTH_BYPASS

  const [values, setValues] = useState<Preferences>(() => readLocal())
  const [hydrating, setHydrating] = useState(serverBacked)

  useEffect(() => {
    if (!serverBacked) {
      setValues(readLocal())
      setHydrating(false)
      return
    }

    let active = true
    setHydrating(true)
    getUserProfile()
      .then((p) => {
        if (!active) return
        const next: Preferences = {
          age: p.age != null ? String(p.age) : '',
          weight: p.body_weight_kg != null ? String(p.body_weight_kg) : '',
          conditions: p.health_conditions ?? [],
        }
        setValues(next)
        writeLocal(next)
      })
      .catch(() => {
        // Server unreachable: fall back to the local mirror.
        if (active) setValues(readLocal())
      })
      .finally(() => {
        if (active) setHydrating(false)
      })

    return () => {
      active = false
    }
  }, [serverBacked, user?.uid])

  const save = useCallback(
    async (next: Preferences): Promise<SaveResult> => {
      // Always mirror to localStorage first so scans/other tabs see updates instantly.
      writeLocal(next)
      setValues(next)

      if (!serverBacked) return 'local'

      const payload = {
        age: next.age ? Number(next.age) : null,
        body_weight_kg: next.weight ? Number(next.weight) : null,
        health_conditions: next.conditions,
      }
      try {
        await updateUserProfile(payload)
        return 'server'
      } catch {
        return 'offline'
      }
    },
    [serverBacked],
  )

  return { values, hydrating, save, serverBacked }
}
