import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Skeleton,
  SkeletonRecentScans,
  SkeletonProductList,
  SkeletonNutritionOverview,
  SkeletonHistoryList,
} from '../components/Skeleton'

describe('Skeleton Loading Screens Component Suite', () => {
  it('renders base Skeleton with accessibility attributes', () => {
    const { container } = render(<Skeleton className="w-20 h-4" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('aria-busy', 'true')
    expect(el).toHaveAttribute('aria-label', 'Loading...')
    expect(el.className).toContain('w-20')
  })

  it('renders SkeletonRecentScans with specified count', () => {
    render(<SkeletonRecentScans count={4} />)
    const group = screen.getByLabelText(/Loading recent scans/i)
    expect(group).toBeInTheDocument()
    expect(group.children.length).toBe(4)
  })

  it('renders SkeletonProductList for Catalog Explorer', () => {
    render(<SkeletonProductList count={3} />)
    const group = screen.getByLabelText(/Loading food catalog/i)
    expect(group).toBeInTheDocument()
    expect(group.children.length).toBe(3)
  })

  it('renders SkeletonHistoryList for History page', () => {
    render(<SkeletonHistoryList count={5} />)
    const group = screen.getByLabelText(/Loading scan history/i)
    expect(group).toBeInTheDocument()
    expect(group.children.length).toBe(5)
  })

  it('renders SkeletonNutritionOverview for product results & AI analysis', () => {
    render(<SkeletonNutritionOverview />)
    const group = screen.getByLabelText(/Loading food nutrition analysis/i)
    expect(group).toBeInTheDocument()
  })
})
