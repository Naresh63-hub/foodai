import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Profile from '../pages/Profile'
import ProfilePreferences from '../pages/ProfilePreferences'
import { calculateBMI, getBMICategory, estimateDailyCalories } from '../utils/healthMetrics'

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

const mockSave = vi.fn()
let mockValues = {
  name: 'Aarav Sharma',
  age: '28',
  weight: '70',
  height: '175',
  gender: 'male',
  activityLevel: 'moderate',
  dietaryPreference: 'vegetarian',
  healthGoal: 'maintain',
  dailyCalorieGoal: '2200',
  allergiesNotes: 'No artificial dyes',
  conditions: ['diabetes', 'pcos'],
}

vi.mock('../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    values: mockValues,
    hydrating: false,
    save: mockSave,
    serverBacked: true,
  }),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'aarav@example.com', displayName: 'Aarav' },
    signOut: vi.fn(),
  }),
}))

vi.mock('../hooks/useAppUpdate', () => ({
  useAppUpdate: () => ({
    currentVersion: '1.0.0',
    isChecking: false,
    hasUpdate: false,
    releaseInfo: null,
    isModalOpen: false,
    closeModal: vi.fn(),
    checkForUpdates: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Health Metrics Utilities', () => {
  it('calculates BMI and clinical category accurately', () => {
    const bmi = calculateBMI(70, 175)
    expect(bmi).toBe(22.9)
    expect(getBMICategory(22.9).label).toBe('Healthy')
    expect(getBMICategory(17.5).label).toBe('Underweight')
    expect(getBMICategory(27.0).label).toBe('Overweight')
    expect(getBMICategory(32.0).label).toBe('Obese')
    expect(calculateBMI('', 175)).toBeNull()
    expect(calculateBMI(70, 0)).toBeNull()
  })

  it('estimates daily calories using Mifflin-St Jeor', () => {
    const kcal = estimateDailyCalories({
      age: 28,
      weight: 70,
      height: 175,
      gender: 'male',
      activityLevel: 'moderate',
      healthGoal: 'maintain',
    })
    expect(kcal).toBe(2570)
    expect(estimateDailyCalories({ age: '', weight: 70, height: 175 })).toBeNull()
  })
})

describe('Profile Page (/profile)', () => {
  beforeEach(() => {
    mockSave.mockReset().mockResolvedValue('server')
    mockValues = {
      name: 'Aarav Sharma',
      age: '28',
      weight: '70',
      height: '175',
      gender: 'male',
      activityLevel: 'moderate',
      dietaryPreference: 'vegetarian',
      healthGoal: 'maintain',
      dailyCalorieGoal: '2200',
      allergiesNotes: 'No artificial dyes',
      conditions: ['diabetes', 'pcos'],
    }
  })

  it('displays user name, age, weight, height, BMI, and health attributes', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Aarav Sharma' })).toBeInTheDocument()
    expect(screen.getByText('28 yrs')).toBeInTheDocument()
    expect(screen.getByText('70 kg')).toBeInTheDocument()
    expect(screen.getByText('175 cm')).toBeInTheDocument()
    expect(screen.getAllByText(/BMI 22\.9/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/2200 kcal\/day/i)).toBeInTheDocument()
    expect(screen.getByText(/No artificial dyes/i)).toBeInTheDocument()
    expect(screen.getByText('PCOS / Hormonal Balance')).toBeInTheDocument()
  })

  it('supports inline editing and saving profile and health details directly on /profile', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }))

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Priya Verma' } })
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: '31' } })
    fireEvent.change(screen.getByLabelText(/Weight \(kg\)/i), { target: { value: '62' } })
    fireEvent.change(screen.getByLabelText(/Height \(cm\)/i), { target: { value: '165' } })
    fireEvent.change(screen.getByLabelText(/Sex/i), { target: { value: 'female' } })
    fireEvent.change(screen.getByLabelText(/Diet/i), { target: { value: 'vegan' } })

    fireEvent.click(screen.getByRole('button', { name: /Save Details/i }))

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Priya Verma',
          age: '31',
          weight: '62',
          height: '165',
          gender: 'female',
          dietaryPreference: 'vegan',
        })
      )
    })
  })
})

describe('ProfilePreferences Page (/profile/preferences)', () => {
  beforeEach(() => {
    mockSave.mockReset().mockResolvedValue('server')
  })

  it('renders and saves full name, age, weight, height, and all health fields', async () => {
    render(
      <MemoryRouter>
        <ProfilePreferences />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Rohan Mehta' } })
    fireEvent.change(screen.getByLabelText(/Age \(Years\)/i), { target: { value: '35' } })
    fireEvent.change(screen.getByLabelText(/Weight \(kg\)/i), { target: { value: '78' } })
    fireEvent.change(screen.getByLabelText(/Height \(cm\)/i), { target: { value: '180' } })
    fireEvent.change(screen.getByLabelText(/Dietary Preference/i), { target: { value: 'keto' } })
    fireEvent.change(screen.getByLabelText(/Primary Health Goal/i), { target: { value: 'lose_weight' } })
    fireEvent.change(screen.getByLabelText(/Daily Calorie Target/i), { target: { value: '1950' } })
    fireEvent.change(screen.getByLabelText(/Custom Allergies/i), { target: { value: 'Avoid peanuts and MSG' } })

    fireEvent.click(screen.getByRole('button', { name: /Save Health Profile/i }))

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rohan Mehta',
          age: '35',
          weight: '78',
          height: '180',
          dietaryPreference: 'keto',
          healthGoal: 'lose_weight',
          dailyCalorieGoal: '1950',
          allergiesNotes: 'Avoid peanuts and MSG',
          conditions: ['diabetes', 'pcos'],
        })
      )
    })
  })
})
