import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ForgotPassword from '../pages/ForgotPassword'
import { AuthProvider } from '../contexts/AuthContext'

const mockSendPasswordReset = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    sendPasswordReset: mockSendPasswordReset,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders reset password form correctly', () => {
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <AuthProvider>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Reset Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByText('Send Password Reset Email')).toBeInTheDocument()
    expect(screen.getByText('←')).toBeInTheDocument()
  })

  it('pre-fills email when query param is provided', () => {
    render(
      <MemoryRouter initialEntries={['/forgot-password?email=user%40example.com']}>
        <AuthProvider>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement
    expect(emailInput.value).toBe('user@example.com')
  })

  it('calls sendPasswordReset and displays success state', async () => {
    mockSendPasswordReset.mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <AuthProvider>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    const emailInput = screen.getByLabelText(/Email Address/i)
    const submitBtn = screen.getByText('Send Password Reset Email')

    fireEvent.change(emailInput, { target: { value: 'alice@example.com' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockSendPasswordReset).toHaveBeenCalledWith('alice@example.com')
      expect(screen.getByText('Check Your Inbox')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Return to Sign In')).toBeInTheDocument()
    })
  })
})
