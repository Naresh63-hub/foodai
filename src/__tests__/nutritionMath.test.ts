import { describe, it, expect } from 'vitest'
import {
  getGramWeightForUnit,
  updateItemPortion,
  calculateMealNutritionSummary,
  createCustomFoodItem,
  PlateFoodItem,
} from '../utils/nutritionMath'

describe('nutritionMath utility', () => {
  it('correctly calculates gram equivalents for different units', () => {
    expect(getGramWeightForUnit('g', 150)).toBe(150)
    expect(getGramWeightForUnit('cup', 1)).toBe(200)
    expect(getGramWeightForUnit('bowl', 1.5)).toBe(375)
    expect(getGramWeightForUnit('tbsp', 2)).toBe(30)
    expect(getGramWeightForUnit('oz', 1)).toBe(28.4)
  })

  it('preserves custom single piece weight when scaling pieces', () => {
    const chapati: PlateFoodItem = {
      id: 'roti-1',
      food_name: 'Chapati',
      portion_g: 60,
      portion_unit: 'piece',
      serving_quantity: 2,
      calories_kcal: 160,
      proteins_g: 5.5,
      carbohydrates_g: 32,
      fat_g: 1.8,
      sugars_g: 0.4,
      fiber_g: 4.2,
      sodium_mg: 120,
      confidence_score: 0.95,
    }

    // 2 pieces = 60g -> 1 piece should be 30g
    const scaled = updateItemPortion(chapati, 3, 'piece')
    expect(scaled.portion_g).toBe(90)
    expect(scaled.serving_quantity).toBe(3)
    expect(scaled.calories_kcal).toBe(240)
  })

  it('deterministically scales portions without rounding drift', () => {
    const original: PlateFoodItem = {
      id: 'rice-1',
      food_name: 'Basmati Rice',
      portion_g: 100,
      portion_unit: 'g',
      serving_quantity: 100,
      calories_kcal: 130,
      proteins_g: 2.7,
      carbohydrates_g: 28.0,
      fat_g: 0.3,
      sugars_g: 0.1,
      fiber_g: 0.4,
      sodium_mg: 2.0,
      confidence_score: 0.98,
    }

    // Scale to 250g
    const scaledUp = updateItemPortion(original, 250, 'g')
    expect(scaledUp.portion_g).toBe(250)
    expect(scaledUp.calories_kcal).toBe(325)
    expect(scaledUp.proteins_g).toBe(6.8)

    // Scale back down to 100g
    const scaledDown = updateItemPortion(scaledUp, 100, 'g')
    expect(scaledDown.portion_g).toBe(100)
    expect(scaledDown.calories_kcal).toBe(130)
    expect(scaledDown.proteins_g).toBe(2.7)
    expect(scaledDown.carbohydrates_g).toBe(28.0)
  })

  it('never turns null or missing nutrient values into zero', () => {
    const itemWithMissingData: PlateFoodItem = {
      id: 'unknown-sauce',
      food_name: 'Mystery Chutney',
      portion_g: 50,
      portion_unit: 'g',
      serving_quantity: 50,
      calories_kcal: 45,
      proteins_g: 0.5,
      carbohydrates_g: 8.0,
      fat_g: 1.2,
      sugars_g: null, // Unknown
      fiber_g: null,  // Unknown
      sodium_mg: null, // Unknown
      confidence_score: 0.8,
    }

    const scaled = updateItemPortion(itemWithMissingData, 100, 'g')
    expect(scaled.sugars_g).toBeNull()
    expect(scaled.fiber_g).toBeNull()
    expect(scaled.sodium_mg).toBeNull()
  })

  it('calculates meal summary with explicit missing nutrient notices', () => {
    const items: PlateFoodItem[] = [
      {
        id: '1',
        food_name: 'Steamed Rice',
        portion_g: 150,
        portion_unit: 'g',
        serving_quantity: 150,
        calories_kcal: 195,
        proteins_g: 4.0,
        carbohydrates_g: 42.0,
        fat_g: 0.5,
        sugars_g: 0.2,
        fiber_g: 0.6,
        sodium_mg: 3.0,
        confidence_score: 0.95,
      },
      {
        id: '2',
        food_name: 'Unknown Mixed Curry',
        portion_g: 150,
        portion_unit: 'bowl',
        serving_quantity: 0.6,
        calories_kcal: 220,
        proteins_g: 8.0,
        carbohydrates_g: 12.0,
        fat_g: 15.0,
        sugars_g: null, // missing
        fiber_g: 2.0,
        sodium_mg: 380.0,
        confidence_score: 0.88,
      },
    ]

    const summary = calculateMealNutritionSummary(items)
    expect(summary.total_portion_g).toBe(300)
    expect(summary.calories_kcal).toBe(415)
    expect(summary.proteins_g).toBe(12.0)
    expect(summary.carbohydrates_g).toBe(54.0)
    expect(summary.fat_g).toBe(15.5)

    // Sugars is missing on 1 item -> should flag partial
    expect(summary.sugars_g.isComplete).toBe(false)
    expect(summary.sugars_g.hasMissing).toBe(true)
    expect(summary.sugars_g.missingCount).toBe(1)
    expect(summary.sugars_g.formatted).toContain('*')

    // Fiber is present on both items -> complete
    expect(summary.fiber_g.isComplete).toBe(true)
    expect(summary.fiber_g.hasMissing).toBe(false)
    expect(summary.fiber_g.value).toBe(2.6)
    expect(summary.fiber_g.formatted).toBe('2.6g')
  })

  it('creates custom food item with sensible category defaults', () => {
    const item = createCustomFoodItem('Boiled Chickpeas', 1, 'bowl', 'protein')
    expect(item.food_name).toBe('Boiled Chickpeas')
    expect(item.portion_g).toBe(250)
    expect(item.proteins_g).toBeGreaterThan(50)
    expect(item.data_source).toBe('manual_entry')
  })
})
