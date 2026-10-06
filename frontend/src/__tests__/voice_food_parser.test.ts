import { describe, it, expect } from 'vitest'
import { parseVoiceFoodCommand, estimateCaloriesQuick } from '../services/voiceFoodParser'

describe('Voice Food Command Parser', () => {
  it('parses a breakfast voice command with items and portion', () => {
    const speech = 'Please log 2 boiled eggs and black coffee for breakfast'
    const result = parseVoiceFoodCommand(speech)

    expect(result.mealType).toBe('breakfast')
    expect(result.cleanedFoodQuery.toLowerCase()).toContain('2 boiled eggs and black coffee')
    expect(result.portionEstimate?.toLowerCase()).toContain('2 boiled eggs')
  })

  it('extracts stated calories from spoken voice commands', () => {
    const speech = 'I ate 450 calories of chicken biryani for lunch'
    const result = parseVoiceFoodCommand(speech)

    expect(result.mealType).toBe('lunch')
    expect(result.statedCalories).toBe(450)
    expect(result.cleanedFoodQuery.toLowerCase()).toContain('chicken biryani')
  })

  it('handles conversational phrases like "I had" and "as a snack"', () => {
    const speech = 'I just had a bowl of greek yogurt with berries as a snack'
    const result = parseVoiceFoodCommand(speech)

    expect(result.mealType).toBe('snack')
    expect(result.cleanedFoodQuery.toLowerCase()).toContain('bowl of greek yogurt with berries')
    expect(result.portionEstimate?.toLowerCase()).toContain('bowl')
  })

  it('handles dinner voice commands cleanly', () => {
    const speech = 'Log grilled salmon with quinoa and broccoli for dinner'
    const result = parseVoiceFoodCommand(speech)

    expect(result.mealType).toBe('dinner')
    expect(result.cleanedFoodQuery.toLowerCase()).toContain('grilled salmon with quinoa and broccoli')
  })

  it('estimates quick calories for common food voice inputs as fallback', () => {
    const eggEstimate = estimateCaloriesQuick('2 boiled eggs')
    expect(eggEstimate.calories).toBeGreaterThan(100)
    expect(eggEstimate.proteinG).toBeGreaterThan(10)

    const biryaniEstimate = estimateCaloriesQuick('Chicken Biryani')
    expect(biryaniEstimate.calories).toBeGreaterThan(400)

    const coffeeEstimate = estimateCaloriesQuick('Black Coffee')
    expect(coffeeEstimate.calories).toBeLessThan(100)
  })
})
