import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import ProductResults from '../pages/ProductResults'
import { AuthProvider } from '../contexts/AuthContext'

const { mockResult } = vi.hoisted(() => ({
  mockResult: {
    product: {
      barcode: '8901063371040',
      product_name: 'Britannia Glucose / Tiger Biscuits',
      brands: 'Britannia Industries Ltd.',
      serving_size: '36.6 g',
      product_weight_g: 36.6,
      categories_tags: ['biscuits'],
    },
    nutrition: {
      per_100g: { sugars_g: 26.5, salt_g: 0.65, fat_g: 13.5 },
      per_serving: { sugars_g: 9.7, salt_g: 0.24, fat_g: 4.9 },
      pct_by_weight: { sugars_pct: 26.5, salt_pct: 0.65, fat_pct: 13.5 },
    },
    processing_level: 'ultra_processed',
    additives_count: 5,
    verdict: 'Ultra-Processed Biscuit',
    ingredients: [],
  },
}))

vi.mock('../api/food', () => ({
  getProductDetail: vi.fn().mockResolvedValue(mockResult),
  scanBarcode: vi.fn().mockResolvedValue(mockResult),
  searchProducts: vi.fn().mockResolvedValue([
    {
      barcode: '8901063371040',
      product_name: 'Britannia Glucose / Tiger Biscuits',
      brands: 'Britannia Industries Ltd.',
      serving_size: '36.6 g',
    },
  ]),
}))

describe('Product Scan Name Display', () => {
  it('displays the product name prominently in ProductResults header and summary', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/results/:scanId',
          element: (
            <AuthProvider>
              <ProductResults />
            </AuthProvider>
          ),
        },
      ],
      {
        initialEntries: [
          {
            pathname: '/results/8901063371040',
            state: { result: mockResult },
          },
        ],
      }
    )

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(
        screen.getAllByText(/Britannia Glucose \/ Tiger Biscuits/i).length
      ).toBeGreaterThanOrEqual(1)
    })
  })
})
