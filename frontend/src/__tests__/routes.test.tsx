import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import AppRouter from '../router'
import Home from '../pages/Home'
import Scan from '../pages/Scan'
import ProductResults from '../pages/ProductResults'
import IngredientDetails from '../pages/IngredientDetails'
import Nutrition from '../pages/Nutrition'
import FoodDNA from '../pages/FoodDNA'
import History from '../pages/History'
import Profile from '../pages/Profile'
import ProfilePreferences from '../pages/ProfilePreferences'
import BottomTabBar from '../components/BottomTabBar'
import NutritionChip from '../components/NutritionChip'
import IngredientCard from '../components/IngredientCard'
import ProcessingBadge from '../components/ProcessingBadge'

describe('Route pages & components are valid modules', () => {
  it('all 9 page components export as functions', () => {
    expect(typeof Home).toBe('function')
    expect(typeof Scan).toBe('function')
    expect(typeof ProductResults).toBe('function')
    expect(typeof IngredientDetails).toBe('function')
    expect(typeof Nutrition).toBe('function')
    expect(typeof FoodDNA).toBe('function')
    expect(typeof History).toBe('function')
    expect(typeof Profile).toBe('function')
    expect(typeof ProfilePreferences).toBe('function')
  })

  it('all 4 component modules export as functions', () => {
    expect(typeof BottomTabBar).toBe('function')
    expect(typeof NutritionChip).toBe('function')
    expect(typeof IngredientCard).toBe('function')
    expect(typeof ProcessingBadge).toBe('function')
  })

  it('<Routes/> renders without crashing at /', () => {
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: <AppRouter />,
        },
      ],
      { initialEntries: ['/'] }
    )
    const { container } = render(<RouterProvider router={router} />)
    expect(container).toBeTruthy()
  })

  it('<Routes/> renders without crashing at /scan', () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <AppRouter /> }],
      { initialEntries: ['/scan'] }
    )
    const { container } = render(<RouterProvider router={router} />)
    expect(container).toBeTruthy()
  })

  it('<Routes/> renders without crashing at /history', () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <AppRouter /> }],
      { initialEntries: ['/history'] }
    )
    const { container } = render(<RouterProvider router={router} />)
    expect(container).toBeTruthy()
  })

  it('<Routes/> renders without crashing at /profile', () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <AppRouter /> }],
      { initialEntries: ['/profile'] }
    )
    const { container } = render(<RouterProvider router={router} />)
    expect(container).toBeTruthy()
  })
})
