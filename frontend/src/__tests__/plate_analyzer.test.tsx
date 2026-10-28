import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PlateAnalyzer from '../pages/PlateAnalyzer'
import * as foodApi from '../api/food'

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-123', email: 'test@foodai.app' },
    isDemoMode: false,
  }),
}))

// Mock UserPreferences
vi.mock('../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    values: { age: 30, weight_kg: 70, health_conditions: [] },
  }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('PlateAnalyzer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders initial capture screen with camera, upload and demo sample plates', () => {
    render(
      <BrowserRouter>
        <PlateAnalyzer />
      </BrowserRouter>,
    )

    expect(screen.getByText(/Analyze My Plate/i)).toBeInTheDocument()
    expect(screen.getByText(/Start Camera/i)).toBeInTheDocument()
    expect(screen.getByText(/Upload Photo/i)).toBeInTheDocument()
    expect(screen.getByText(/Traditional Indian Thali/i)).toBeInTheDocument()
    expect(screen.getByText(/Mediterranean Salmon Platter/i)).toBeInTheDocument()
  })

  it('selects a demo sample plate and enables plate analysis', async () => {
    render(
      <BrowserRouter>
        <PlateAnalyzer />
      </BrowserRouter>,
    )

    const thaliPreset = screen.getByText(/Traditional Indian Thali/i)
    fireEvent.click(thaliPreset)

    expect(screen.getByText(/Analyze Plate Items & Nutrition/i)).toBeInTheDocument()
  })

  it('analyzes plate and displays multi-item breakdown and combined nutrition totals', async () => {
    vi.spyOn(foodApi, 'analyzePlatePhoto').mockResolvedValueOnce({
      meal_name: 'Traditional Vegetarian Thali Plate',
      overall_confidence: 0.94,
      image_quality_assessment: 'Good lighting',
      uncertainty_notes: ['Overlapping sauce boundaries can introduce portion variance.'],
      total_portion_g: 610,
      total_calories_kcal: 861,
      total_proteins_g: 31.8,
      total_carbohydrates_g: 116.7,
      total_fat_g: 29.7,
      total_sugars_g: 7.9,
      total_fiber_g: 12.4,
      total_sodium_mg: 900,
      macro_ratios: { carbs_pct: 54, protein_pct: 15, fat_pct: 31 },
      items: [
        {
          id: 'it-1',
          food_name: 'Steamed Basmati Rice',
          portion_g: 180,
          portion_unit: 'g',
          serving_quantity: 180,
          calories_kcal: 234,
          proteins_g: 4.8,
          carbohydrates_g: 51.0,
          fat_g: 0.7,
          sugars_g: 0.1,
          fiber_g: 0.7,
          sodium_mg: 2,
          confidence_score: 0.96,
        },
        {
          id: 'it-2',
          food_name: 'Yellow Moong Dal Tadka',
          portion_g: 150,
          portion_unit: 'bowl',
          serving_quantity: 0.75,
          calories_kcal: 165,
          proteins_g: 9.2,
          carbohydrates_g: 21.0,
          fat_g: 5.0,
          sugars_g: 1.2,
          fiber_g: 4.5,
          sodium_mg: 340,
          confidence_score: 0.92,
        },
      ],
      data_source: 'test_mock',
    })

    render(
      <BrowserRouter>
        <PlateAnalyzer />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByText(/Traditional Indian Thali/i))
    fireEvent.click(screen.getByText(/Analyze Plate Items & Nutrition/i))

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Steamed Basmati Rice/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/Yellow Moong Dal Tadka/i)).toBeInTheDocument()
      expect(screen.getByText(/Total Plate Nutrition/i)).toBeInTheDocument()
    })
  })

  it('allows editing portion quantity and recalculates combined meal totals', async () => {
    vi.spyOn(foodApi, 'analyzePlatePhoto').mockResolvedValueOnce({
      meal_name: 'Healthy Lunch Plate',
      overall_confidence: 0.95,
      image_quality_assessment: 'Good',
      uncertainty_notes: [],
      total_portion_g: 100,
      total_calories_kcal: 130,
      total_proteins_g: 2.7,
      total_carbohydrates_g: 28.0,
      total_fat_g: 0.3,
      total_sugars_g: 0.1,
      total_fiber_g: 0.4,
      total_sodium_mg: 2,
      macro_ratios: { carbs_pct: 85, protein_pct: 10, fat_pct: 5 },
      items: [
        {
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
          sodium_mg: 2,
          confidence_score: 0.98,
        },
      ],
      data_source: 'test_mock',
    })

    render(
      <BrowserRouter>
        <PlateAnalyzer />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByText(/Traditional Indian Thali/i))
    fireEvent.click(screen.getByText(/Analyze Plate Items & Nutrition/i))

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Basmati Rice/i)).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText(/Quantity for Basmati Rice/i)
    fireEvent.change(qtyInput, { target: { value: '200' } })

    await waitFor(() => {
      // 100g = 130 kcal -> 200g should scale to 260 kcal
      expect(screen.getByText(/Save Meal to Food Diary \(260 kcal\)/i)).toBeInTheDocument()
    })
  })

  it('allows adding a custom food item to the plate', async () => {
    vi.spyOn(foodApi, 'analyzePlatePhoto').mockResolvedValueOnce({
      meal_name: 'Simple Plate',
      overall_confidence: 0.95,
      image_quality_assessment: 'Good',
      uncertainty_notes: [],
      total_portion_g: 100,
      total_calories_kcal: 100,
      total_proteins_g: 5,
      total_carbohydrates_g: 15,
      total_fat_g: 2,
      total_sugars_g: 1,
      total_fiber_g: 1,
      total_sodium_mg: 50,
      macro_ratios: { carbs_pct: 60, protein_pct: 20, fat_pct: 20 },
      items: [
        {
          id: 'it-1',
          food_name: 'Steamed Rice',
          portion_g: 100,
          portion_unit: 'g',
          serving_quantity: 100,
          calories_kcal: 130,
          proteins_g: 2.7,
          carbohydrates_g: 28.0,
          fat_g: 0.3,
          sugars_g: 0.1,
          fiber_g: 0.4,
          sodium_mg: 2,
          confidence_score: 0.95,
        },
      ],
      data_source: 'test_mock',
    })

    render(
      <BrowserRouter>
        <PlateAnalyzer />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByText(/Traditional Indian Thali/i))
    fireEvent.click(screen.getByText(/Analyze Plate Items & Nutrition/i))

    await waitFor(() => {
      expect(screen.getByText(/Add Missing Item/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Add Missing Item/i))
    const nameInput = screen.getByPlaceholderText(/e.g. Boiled Egg/i)
    fireEvent.change(nameInput, { target: { value: 'Boiled Egg' } })
    fireEvent.click(screen.getByRole('button', { name: /^Add Item$/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Boiled Egg/i)).toBeInTheDocument()
    })
  })

  it('saves the reviewed meal to history via saveDailyMealLog', async () => {
    const saveMealSpy = vi.spyOn(foodApi, 'saveDailyMealLog').mockResolvedValueOnce({ id: 'log-123' })
    vi.spyOn(foodApi, 'saveScanHistory').mockResolvedValueOnce({ id: 1 })

    vi.spyOn(foodApi, 'analyzePlatePhoto').mockResolvedValueOnce({
      meal_name: 'Dinner Plate',
      overall_confidence: 0.95,
      image_quality_assessment: 'Good',
      uncertainty_notes: [],
      total_portion_g: 150,
      total_calories_kcal: 200,
      total_proteins_g: 10,
      total_carbohydrates_g: 25,
      total_fat_g: 5,
      total_sugars_g: 2,
      total_fiber_g: 3,
      total_sodium_mg: 200,
      macro_ratios: { carbs_pct: 50, protein_pct: 25, fat_pct: 25 },
      items: [
        {
          id: 'it-1',
          food_name: 'Grilled Tofu',
          portion_g: 150,
          portion_unit: 'piece',
          serving_quantity: 1,
          calories_kcal: 200,
          proteins_g: 10,
          carbohydrates_g: 25,
          fat_g: 5,
          sugars_g: 2,
          fiber_g: 3,
          sodium_mg: 200,
          confidence_score: 0.95,
        },
      ],
      data_source: 'test_mock',
    })

    render(
      <BrowserRouter>
        <PlateAnalyzer />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByText(/Traditional Indian Thali/i))
    fireEvent.click(screen.getByText(/Analyze Plate Items & Nutrition/i))

    await waitFor(() => {
      expect(screen.getByText(/Save Meal to Food Diary/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Save Meal to Food Diary/i))

    await waitFor(() => {
      expect(saveMealSpy).toHaveBeenCalled()
      expect(screen.getByText(/Meal Saved to History!/i)).toBeInTheDocument()
    })
  })
})
