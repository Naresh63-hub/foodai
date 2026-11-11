import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getWeeklyCaloricProgress } from '../services/firestoreService'

// Mock firebase firestore getDocs
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    getDocs: vi.fn().mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: 'mock_scan_1',
            userId: 'user_123',
            foodName: 'Avocado Toast',
            caloriesKcal: 350,
            servingDescription: '1 slice',
            servingWeightG: 120,
            macros: {
              carbohydrates_g: 30,
              proteins_g: 10,
              fat_g: 18,
            },
            healthScore: 90,
            createdAt: new Date().toISOString(),
          }),
        },
      ],
    }),
  }
})

describe('getWeeklyCaloricProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns exactly 7 days of caloric records ending with Today', async () => {
    const days = await getWeeklyCaloricProgress('user_123', 2100)
    expect(days).toHaveLength(7)
    expect(days[6].dayLabel).toBe('Today')
    expect(days[0].targetCalories).toBe(2100)
  })

  it('aggregates calories from food scans for today', async () => {
    const days = await getWeeklyCaloricProgress('user_123', 2000)
    const todayData = days[6]
    expect(todayData.calories).toBeGreaterThanOrEqual(350)
    expect(todayData.meals.some((m) => m.name === 'Avocado Toast')).toBe(true)
  })

  it('integrates local storage daily logs into the corresponding date bucket', async () => {
    const today = new Date().toISOString().split('T')[0]
    const localKey = `foodai_daily_log_${today}`
    localStorage.setItem(
      localKey,
      JSON.stringify([
        {
          id: 'log_local_1',
          timestamp: new Date().toISOString(),
          product_name: 'Organic Greek Yogurt',
          portion_g: 150,
          sugars_g: 5,
          salt_g: 0.1,
          fat_g: 4,
          additives_count: 0,
        },
      ])
    )

    const days = await getWeeklyCaloricProgress('user_123', 2000)
    const todayData = days[6]
    expect(todayData.meals.some((m) => m.name === 'Organic Greek Yogurt')).toBe(true)
  })
})
