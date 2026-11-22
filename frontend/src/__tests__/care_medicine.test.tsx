import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CareResultsCard from '../components/CareResultsCard'
import MedicineInteractionCard from '../components/MedicineInteractionCard'
import SymptomTriageModal from '../components/SymptomTriageModal'
import Scan from '../pages/Scan'
import { CareAnalysisResult, MedicineAnalysisResult, SymptomGuideResult } from '../types/food'
import * as foodApi from '../api/food'

const mockCareResult: CareAnalysisResult = {
  product_name: 'Dove Beauty Moisture Bar',
  product_category: 'soap',
  clean_score: 85,
  hazard_level: 'Low',
  comedogenic_rating: 1,
  harmful_ingredients: [
    {
      name: 'Tetrasodium EDTA',
      hazard_severity: 'Low',
      category: 'Preservative / Chelator',
      concern: 'Chelating agent; may enhance skin penetration of other ingredients.',
    },
  ],
  beneficial_ingredients: [
    {
      name: 'Glycerin',
      benefit: 'Natural humectant that draws water into the stratum corneum.',
    },
  ],
  skin_compatibility: {
    sensitive_skin: true,
    dry_skin: true,
    oily_acne_prone: true,
    normal_skin: true,
  },
  clean_swaps: [
    {
      name: 'Cetaphil Gentle Cleansing Bar',
      category: 'Syndet Bar',
      why_better: 'Soap-free syndet formulation without harsh sulfates or chelating irritants.',
    },
  ],
  disclaimer: 'Personal care cosmetic analysis for educational guidance.',
}

const mockMedicineResult: MedicineAnalysisResult = {
  medicine_name: 'Dolo 650',
  active_salt: 'Paracetamol / Acetaminophen',
  strength: '650mg',
  therapeutic_category: 'Analgesic & Antipyretic',
  common_uses: 'Fever reduction and mild-to-moderate pain relief.',
  meal_timing: 'Can be taken with or after food to minimize gastric discomfort.',
  food_drug_interactions: [
    {
      food_or_beverage: 'Alcohol',
      severity: 'Dangerous',
      interaction: 'Concurrent alcohol significantly increases CYP2E1 hepatotoxicity risk.',
    },
  ],
  alcohol_contraindicated: true,
  generic_salt_name: 'Jan Aushadhi Paracetamol 650mg',
  common_side_effects: ['Nausea', 'Allergic rash', 'Upper right abdominal pain (overdose)'],
  key_safety_warning: 'Do not exceed 4,000mg total paracetamol in 24 hours.',
  disclaimer: 'Clinical information for reference only. Consult a registered physician.',
}

const mockSymptomResult: SymptomGuideResult = {
  triage_level: 'Mild',
  overview: 'Common viral upper respiratory syndrome symptoms.',
  questions_for_doctor: [
    'How high is my fever and how long should I monitor it?',
    'Are there specific signs of secondary bacterial infection to watch for?',
  ],
  home_comfort_measures: [
    'Drink at least 2.5L warm water/electrolytes daily.',
    'Adequate sleep and steam inhalation.',
  ],
  red_flag_warnings: [
    'Difficulty breathing or chest pain',
    'Persistent fever > 103°F not responding to medication',
  ],
  disclaimer: 'This triage checklist is to help prepare for your doctor visit. It is not a diagnosis.',
}

describe('Care & Cosmetics Component', () => {
  it('renders CareResultsCard with clean score, ingredients, and clean swaps', () => {
    const handleReset = vi.fn()
    render(<CareResultsCard data={mockCareResult} onReset={handleReset} />)

    expect(screen.getByText('Dove Beauty Moisture Bar')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('Tetrasodium EDTA')).toBeInTheDocument()
    expect(screen.getByText('Glycerin')).toBeInTheDocument()
    expect(screen.getByText('Cetaphil Gentle Cleansing Bar')).toBeInTheDocument()

    const scanAnotherBtn = screen.getByText('← Scan Another Care Product')
    fireEvent.click(scanAnotherBtn)
    expect(handleReset).toHaveBeenCalledTimes(1)
  })
})

describe('Medicine & Interactions Component', () => {
  it('renders MedicineInteractionCard with active salt, meal timing, and food-drug interaction', () => {
    const handleReset = vi.fn()
    render(<MedicineInteractionCard data={mockMedicineResult} onReset={handleReset} />)

    expect(screen.getByText('Dolo 650')).toBeInTheDocument()
    expect(screen.getByText(/Salt: Paracetamol \/ Acetaminophen/i)).toBeInTheDocument()
    expect(screen.getByText(/Can be taken with or after food/i)).toBeInTheDocument()
    expect(screen.getByText('Alcohol')).toBeInTheDocument()
    expect(screen.getByText('Jan Aushadhi Paracetamol 650mg')).toBeInTheDocument()

    const checkAnotherBtn = screen.getByText('← Scan Another Medication')
    fireEvent.click(checkAnotherBtn)
    expect(handleReset).toHaveBeenCalledTimes(1)
  })
})

describe('Symptom Triage Modal', () => {
  it('renders modal, accepts symptoms input, and displays doctor checklist', async () => {
    vi.spyOn(foodApi, 'getSymptomGuide').mockResolvedValue(mockSymptomResult)
    const handleClose = vi.fn()

    render(<SymptomTriageModal isOpen={true} onClose={handleClose} />)

    expect(screen.getByText(/Doctor Visit & Symptom Guide/i)).toBeInTheDocument()

    const textarea = screen.getByPlaceholderText(/Mild fever with dry cough/i)
    fireEvent.change(textarea, { target: { value: 'Mild headache and sore throat' } })

    const submitBtn = screen.getByText(/Generate Doctor Prep Guide/i)
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Common viral upper respiratory/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/How high is my fever and how long should I monitor it\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Difficulty breathing or chest pain/i)).toBeInTheDocument()
  })
})

describe('Scan Page Category Switcher', () => {
  it('allows switching between Food, Care & Soaps, and Medicine modes', () => {
    render(
      <BrowserRouter>
        <Scan />
      </BrowserRouter>
    )

    // Initially in Food mode
    expect(screen.getByText('Plate & Cooked Meal Scanner')).toBeInTheDocument()

    // Switch to Care & Soaps
    const careBtn = screen.getByRole('button', { name: /Care & Soaps/i })
    fireEvent.click(careBtn)
    expect(screen.getByText('Care & Cosmetics')).toBeInTheDocument()
    expect(screen.getByText('Analyze Clean Score & Hazards')).toBeInTheDocument()
    expect(screen.getByText('Dove Beauty Moisture Bar')).toBeInTheDocument()

    // Switch to Medicine
    const medBtn = screen.getByRole('button', { name: /Medicine/i })
    fireEvent.click(medBtn)
    expect(screen.getByText('Medicine & Interactions')).toBeInTheDocument()
    expect(screen.getByText('Check Food Conflicts & Meal Timing')).toBeInTheDocument()
    expect(screen.getByText(/Dolo 650/i)).toBeInTheDocument()
  })
})
