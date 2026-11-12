import { useCallback, useEffect, useState } from 'react'
import { getUserProfile, updateUserProfile } from '../api/food'
import { useAuth } from '../contexts/AuthContext'
import { AUTH_BYPASS } from '../config/authMode'

export interface Preferences {
  name: string
  age: string
  weight: string
  height: string
  gender: string
  activityLevel: string
  dietaryPreference: string
  healthGoal: string
  dailyCalorieGoal: string
  allergiesNotes: string
  conditions: string[]
}

const KEYS = {
  name: 'prefs_full_name',
  age: 'prefs_age',
  weight: 'prefs_weight',
  height: 'prefs_height',
  gender: 'prefs_gender',
  activityLevel: 'prefs_activity_level',
  dietaryPreference: 'prefs_dietary_preference',
  healthGoal: 'prefs_health_goal',
  dailyCalorieGoal: 'prefs_daily_calorie_goal',
  allergiesNotes: 'prefs_allergies_notes',
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
    name: localStorage.getItem(KEYS.name) ?? '',
    age: localStorage.getItem(KEYS.age) ?? '',
    weight: localStorage.getItem(KEYS.weight) ?? '',
    height: localStorage.getItem(KEYS.height) ?? '',
    gender: localStorage.getItem(KEYS.gender) ?? '',
    activityLevel: localStorage.getItem(KEYS.activityLevel) ?? '',
    dietaryPreference: localStorage.getItem(KEYS.dietaryPreference) ?? '',
    healthGoal: localStorage.getItem(KEYS.healthGoal) ?? '',
    dailyCalorieGoal: localStorage.getItem(KEYS.dailyCalorieGoal) ?? '',
    allergiesNotes: localStorage.getItem(KEYS.allergiesNotes) ?? '',
    conditions,
  }
}

function writeLocal(p: Preferences): void {
  localStorage.setItem(KEYS.name, p.name)
  localStorage.setItem(KEYS.age, p.age)
  localStorage.setItem(KEYS.weight, p.weight)
  localStorage.setItem(KEYS.height, p.height)
  localStorage.setItem(KEYS.gender, p.gender)
  localStorage.setItem(KEYS.activityLevel, p.activityLevel)
  localStorage.setItem(KEYS.dietaryPreference, p.dietaryPreference)
  localStorage.setItem(KEYS.healthGoal, p.healthGoal)
  localStorage.setItem(KEYS.dailyCalorieGoal, p.dailyCalorieGoal)
  localStorage.setItem(KEYS.allergiesNotes, p.allergiesNotes)
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
  // Render cached local values immediately (stale-while-revalidate) instead of blocking UI on network
  const [hydrating] = useState(false)

  useEffect(() => {
    if (!serverBacked) {
      setValues(readLocal())
      return
    }

    let active = true
    getUserProfile()
      .then((p) => {
        if (!active) return
        const next: Preferences = {
          name: p.full_name ?? '',
          age: p.age != null ? String(p.age) : '',
          weight: p.body_weight_kg != null ? String(p.body_weight_kg) : '',
          height: p.height_cm != null ? String(p.height_cm) : '',
          gender: p.gender ?? '',
          activityLevel: p.activity_level ?? '',
          dietaryPreference: p.dietary_preference ?? '',
          healthGoal: p.health_goal ?? '',
          dailyCalorieGoal: p.daily_calorie_goal != null ? String(p.daily_calorie_goal) : '',
          allergiesNotes: p.allergies_notes ?? '',
          conditions: p.health_conditions ?? [],
        }
        setValues(next)
        writeLocal(next)
      })
      .catch(() => {
        // Server unreachable: keep local mirror active without blocking
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
        full_name: next.name.trim(),
        age: next.age ? Number(next.age) : null,
        body_weight_kg: next.weight ? Number(next.weight) : null,
        height_cm: next.height ? Number(next.height) : null,
        gender: next.gender,
        activity_level: next.activityLevel,
        dietary_preference: next.dietaryPreference,
        health_goal: next.healthGoal,
        daily_calorie_goal: next.dailyCalorieGoal ? Number(next.dailyCalorieGoal) : null,
        allergies_notes: next.allergiesNotes.trim(),
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
