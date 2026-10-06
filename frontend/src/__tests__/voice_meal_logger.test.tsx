import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VoiceMealLoggerModal from '../components/VoiceMealLoggerModal'

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-voice-123', email: 'test@example.com' },
  }),
}))

// Mock Firestore services
vi.mock('../services/firestoreService', () => ({
  saveDailyLogToFirestore: vi.fn().mockResolvedValue({ id: 'mock-daily-log' }),
  saveFoodScanToFirestore: vi.fn().mockResolvedValue({ id: 'mock-food-scan' }),
}))

describe('VoiceMealLoggerModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly when open', () => {
    render(
      <MemoryRouter>
        <VoiceMealLoggerModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    )

    expect(screen.getByText(/Voice Meal Logger/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Web Speech API/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Quick Voice Examples/i)).toBeInTheDocument()
    expect(screen.getByText(/Fast 1-Tap Log/i)).toBeInTheDocument()
    expect(screen.getByText(/AI Nutrition Log/i)).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <MemoryRouter>
        <VoiceMealLoggerModal isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    )

    expect(container).toBeEmptyDOMElement()
  })
})
