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
  all_ingredients_breakdown: [
    {
      name: 'Glycerin',
      safety_rating: 'safe',
      function: 'Humectant & Skin Conditioner',
      comedogenic_score: 0,
      explanation: 'Skin-identical humectant; deeply hydrates barrier without irritation.',
    },
    {
      name: 'Tetrasodium EDTA',
      safety_rating: 'caution',
      function: 'Chelating Agent',
      comedogenic_score: 0,
      explanation: 'Binds heavy metal ions to stabilize formula.',
      regulatory_flags: ['Penetration Enhancer'],
    },
    {
      name: 'Sodium Laureth Sulfate',
      safety_rating: 'hazardous',
      function: 'Anionic Surfactant',
      comedogenic_score: 3,
      explanation: 'Harsh cleansing detergent prone to barrier stripping and 1,4-dioxane trace risk.',
      regulatory_flags: ['High Hazard', 'Pore Clogging'],
    },
  ],
  hazard_summary: {
    total_ingredients: 3,
    safe_count: 1,
    moderate_hazard_count: 1,
    high_hazard_count: 1,
  },
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
  pharmacological_profile: {
    mechanism_of_action: 'Inhibits central nervous system prostaglandin synthesis via COX enzyme modulation.',
    organ_impact: {
      liver: '90-95% hepatic metabolism via glucuronidation and sulfation. CYP2E1 pathway generates toxic NAPQI.',
      kidneys: 'Less than 5% excreted unchanged in urine. Safe at normal therapeutic dosages.',
      stomach: 'Weak peripheral COX inhibition; minimal direct gastric mucosal damage compared to NSAIDs.',
    },
  },
  excipients_and_additives: [
    {
      name: 'Microcrystalline Cellulose',
      category: 'Tablet Binder / Filler',
      concern: 'Inert plant fiber. Non-toxic and generally recognized safe (GRAS).',
    },
    {
      name: 'Titanium Dioxide (E171)',
      category: 'Film Coating Opacifier',
      concern: 'Banned in EU food applications due to potential DNA genotoxicity accumulation concerns; permitted in medicines.',
    },
  ],
  clinical_guidance: {
    why_used: 'First-line clinical therapy for acute pyrexia (fever) and mild-to-moderate somatic pain.',
    symptoms_treated: [
      'Elevated body temperature / Chills',
      'Throbbing tension or sinus headache',
      'Viral influenza & dengue body aches',
    ],
    clinical_drug_class: 'Non-Opioid Analgesic & Anilide Antipyretic',
    typical_dosage_instruction: 'Adults: 500mg to 650mg every 4 to 6 hours as needed. Never exceed 4,000mg in 24 hours.',
    contraindications: [
      'Severe active hepatic impairment or acute liver failure',
      'Chronic alcoholism (>3 drinks daily increases toxic metabolite risk)',
    ],
    when_to_see_doctor_urgently: [
      'Fever persisting above 103°F (>39.4°C) for more than 3 consecutive days',
      'Yellowing of skin or whites of eyes (jaundice)',
    ],
    missed_dose_advice: 'Take as soon as remembered if symptoms persist. Do not take a double dose.',
  },
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
  it('renders CareResultsCard with clean score, chemical breakdown, and clean swaps', () => {
    const handleReset = vi.fn()
    render(<CareResultsCard data={mockCareResult} onReset={handleReset} />)

    expect(screen.getByText('Dove Beauty Moisture Bar')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText(/Label Chemical Breakdown/i)).toBeInTheDocument()
    expect(screen.getAllByText('Tetrasodium EDTA')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Glycerin')[0]).toBeInTheDocument()
    expect(screen.getByText('Cetaphil Gentle Cleansing Bar')).toBeInTheDocument()

    // Test filter tabs
    const safeTab = screen.getByRole('button', { name: /Safe/i })
    fireEvent.click(safeTab)
    expect(screen.getAllByText('Glycerin')[0]).toBeInTheDocument()

    const scanAnotherBtn = screen.getByText('← Scan Another Care Product')
    fireEvent.click(scanAnotherBtn)
    expect(handleReset).toHaveBeenCalledTimes(1)
  })
})

describe('Medicine & Interactions Component', () => {
  it('renders MedicineInteractionCard with pharmacology profile, organ pathways, and excipients', () => {
    const handleReset = vi.fn()
    render(<MedicineInteractionCard data={mockMedicineResult} onReset={handleReset} />)

    expect(screen.getByText('Dolo 650')).toBeInTheDocument()
    expect(screen.getByText(/Salt: Paracetamol \/ Acetaminophen/i)).toBeInTheDocument()
    expect(screen.getByText(/Can be taken with or after food/i)).toBeInTheDocument()
    expect(screen.getByText('Alcohol')).toBeInTheDocument()
    expect(screen.getByText('Jan Aushadhi Paracetamol 650mg')).toBeInTheDocument()

    // Test new pharmacology & organ impact section
    expect(screen.getByText(/Pharmacology & Organ Pathway/i)).toBeInTheDocument()
    expect(screen.getByText(/Liver Pathway/i)).toBeInTheDocument()
    expect(screen.getByText(/Kidney Clearance/i)).toBeInTheDocument()
    expect(screen.getByText(/Stomach Lining/i)).toBeInTheDocument()

    // Test inactive excipients & additives
    expect(screen.getByText(/Inactive Excipients & Additives/i)).toBeInTheDocument()
    expect(screen.getByText('Titanium Dioxide (E171)')).toBeInTheDocument()
    expect(screen.getByText('Microcrystalline Cellulose')).toBeInTheDocument()

    // Test why used, symptoms treated & clinical guidance
    expect(screen.getByText(/Why This Medicine Is Used & Symptoms/i)).toBeInTheDocument()
    expect(screen.getByText(/First-line clinical therapy for acute pyrexia/i)).toBeInTheDocument()
    expect(screen.getByText('Elevated body temperature / Chills')).toBeInTheDocument()
    expect(screen.getByText('Viral influenza & dengue body aches')).toBeInTheDocument()
    expect(screen.getByText(/Medical Standards & Safety Guidance/i)).toBeInTheDocument()
    expect(screen.getByText('Non-Opioid Analgesic & Anilide Antipyretic')).toBeInTheDocument()
    expect(screen.getByText(/Adults: 500mg to 650mg every 4 to 6 hours/i)).toBeInTheDocument()
    expect(screen.getByText(/Severe active hepatic impairment/i)).toBeInTheDocument()
    expect(screen.getByText(/Fever persisting above 103°F/i)).toBeInTheDocument()
    expect(screen.getByText(/Take as soon as remembered if symptoms persist/i)).toBeInTheDocument()

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
  it('allows switching between Food, Care & Soaps, and Medicine modes with sub-tabs', () => {
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

    // Barcode sub-tab in Care mode
    expect(screen.getByText(/Enter Care Product Barcode/i)).toBeInTheDocument()
    expect(screen.getByText(/Curated Barcode Presets/i)).toBeInTheDocument()

    // Switch to Manual tab in Care mode
    const careManualBtn = screen.getByRole('button', { name: /Manual \/ INCI/i })
    fireEvent.click(careManualBtn)
    expect(screen.getByText('Analyze Clean Score & Hazards')).toBeInTheDocument()
    expect(screen.getByText('Dove Beauty Moisture Bar')).toBeInTheDocument()

    // Switch to Medicine mode
    const medBtn = screen.getByRole('button', { name: /Medicine/i })
    fireEvent.click(medBtn)
    expect(screen.getByText('Medicine & Interactions')).toBeInTheDocument()

    // Strip Photo OCR sub-tab in Medicine mode
    expect(screen.getByText(/Scan Tablet Strip or Syrup Packaging/i)).toBeInTheDocument()

    // Switch to Barcode sub-tab in Medicine mode
    const medBarcodeBtn = screen.getByRole('button', { name: /Barcode/i })
    fireEvent.click(medBarcodeBtn)
    expect(screen.getByText(/Enter Medicine Barcode Number/i)).toBeInTheDocument()

    // Switch to Search / Salt sub-tab in Medicine mode
    const medSearchBtn = screen.getByRole('button', { name: /Search \/ Salt/i })
    fireEvent.click(medSearchBtn)
    expect(screen.getByText('Check Food Conflicts & Meal Timing')).toBeInTheDocument()
    expect(screen.getByText(/Dolo 650/i)).toBeInTheDocument()
  })
})
