import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import FoodAIChatbot from '../components/FoodAIChatbot'
import * as foodApi from '../api/food'

// Mock UserPreferences
vi.mock('../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    values: { age: 28, weight: 68, conditions: ['Hypertension'] },
  }),
}))

describe('FoodAIChatbot Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders floating chatbot trigger button on bottom left', () => {
    render(
      <BrowserRouter>
        <FoodAIChatbot />
      </BrowserRouter>,
    )

    const triggerBtn = screen.getByRole('button', { name: /Open FoodAI Chatbot/i })
    expect(triggerBtn).toBeInTheDocument()
    expect(triggerBtn).toHaveTextContent(/Food AI/i)
  })

  it('opens chat drawer when floating button is clicked', async () => {
    render(
      <BrowserRouter>
        <FoodAIChatbot />
      </BrowserRouter>,
    )

    const triggerBtn = screen.getByRole('button', { name: /Open FoodAI Chatbot/i })
    fireEvent.click(triggerBtn)

    expect(screen.getByText(/FoodAI Assistant/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ask about foods, calories, diet.../i)).toBeInTheDocument()
    expect(screen.getAllByText(/🍱 How to analyze my plate?/i).length).toBeGreaterThan(0)
  })

  it('submits a user message and renders AI assistant response', async () => {
    const chatSpy = vi.spyOn(foodApi, 'sendChatMessage').mockResolvedValueOnce({
      reply: 'Paneer has approximately 18g of protein per 100g serving.',
      suggestions: ['How to analyze a plate?'],
    })

    render(
      <BrowserRouter>
        <FoodAIChatbot />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Open FoodAI Chatbot/i }))

    const input = screen.getByPlaceholderText(/Ask about foods, calories, diet.../i)
    fireEvent.change(input, { target: { value: 'How much protein in paneer?' } })

    const sendBtn = screen.getByText('➤')
    fireEvent.click(sendBtn)

    expect(screen.getByText('How much protein in paneer?')).toBeInTheDocument()

    await waitFor(() => {
      expect(chatSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'How much protein in paneer?',
        }),
      )
      expect(screen.getByText(/Paneer has approximately 18g of protein/i)).toBeInTheDocument()
    })
  })

  it('clicking a quick prompt chip sends message automatically', async () => {
    const chatSpy = vi.spyOn(foodApi, 'sendChatMessage').mockResolvedValueOnce({
      reply: 'To analyze a plate, take an overhead photo in Analyze My Plate.',
    })

    render(
      <BrowserRouter>
        <FoodAIChatbot />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Open FoodAI Chatbot/i }))

    const suggestionChips = screen.getAllByText('🍱 How to analyze my plate?')
    fireEvent.click(suggestionChips[0])

    await waitFor(() => {
      expect(chatSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '🍱 How to analyze my plate?',
        }),
      )
      expect(screen.getByText(/To analyze a plate, take an overhead photo/i)).toBeInTheDocument()
    })
  })

  it('clears chat history when trash icon is clicked', () => {
    render(
      <BrowserRouter>
        <FoodAIChatbot />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Open FoodAI Chatbot/i }))
    const clearBtn = screen.getByTitle(/Clear conversation/i)
    fireEvent.click(clearBtn)

    expect(screen.getByText(/Conversation cleared/i)).toBeInTheDocument()
  })
})
