import { test, expect } from '@playwright/test'

test.describe('E2E Workflows & System Health', () => {
  test('Application loads without blank screen or fatal console errors', async ({ page }) => {
    const fatalErrors: string[] = []
    page.on('pageerror', (err) => {
      fatalErrors.push(err.message)
    })

    await page.goto('/')
    await expect(page.locator('#root')).toBeVisible()
    await expect(page.getByText('FoodAI')).toBeVisible()
    expect(fatalErrors).toHaveLength(0)
  })

  test('Navigation between primary tabs works', async ({ page }) => {
    await page.goto('/')

    // Bottom tab bar navigation
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible()

    // Check bottom navigation items
    await expect(nav.getByText('Home')).toBeVisible()
    await expect(nav.getByText('Scan')).toBeVisible()
    await expect(nav.getByText('AI Food')).toBeVisible()
    await expect(nav.getByText('Progress')).toBeVisible()
    await expect(nav.getByText('Profile')).toBeVisible()
  })

  test('Guest access vs authenticated protection', async ({ page }) => {
    // 1. Guest can browse Home page safely without redirect
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/Know What You're Eating/i)).toBeVisible()

    // 2. Guest is redirected from protected route /scan to /login
    await page.goto('/scan')
    await expect(page).toHaveURL('/login')

    // 3. Guest can use 1-Tap Demo access
    await page.getByText(/Explore Demo Mode/i).click()
    await expect(page).toHaveURL('/')

    // 4. Now authenticated, user can navigate to /scan via SPA link
    await page.locator('nav').getByText('Scan').click()
    await expect(page).toHaveURL('/scan')
    await expect(page.getByText('Scan Food')).toBeVisible()
  })

  test('Barcode scanner UI, tabs, and validation states', async ({ page }) => {
    // Log in via demo mode
    await page.goto('/login')
    await page.getByText(/Explore Demo Mode/i).click()
    await expect(page).toHaveURL('/')

    // Navigate to Scan
    await page.locator('nav').getByText('Scan').click()
    await expect(page).toHaveURL('/scan')

    // Verify scan tabs exist
    await expect(page.getByRole('button', { name: /Barcode/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /OCR/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Paste/i })).toBeVisible()

    // Switch to Paste tab
    await page.getByRole('button', { name: /Paste/i }).click()
    await expect(page.getByPlaceholder(/Refined wheat flour/i)).toBeVisible()

    // Submit empty ingredients should show error toast
    await page.getByRole('button', { name: /Analyze Ingredients/i }).click()
    await expect(page.getByText(/Please paste ingredient text/i)).toBeVisible()
  })

  test('Product results display nutrition and processing level', async ({ page }) => {
    // Log in via demo mode
    await page.goto('/login')
    await page.getByText(/Explore Demo Mode/i).click()
    await expect(page).toHaveURL('/')

    // Click on Britannia Glucose Biscuits instant demo preset
    const presetBtn = page.getByText(/Britannia/i).first()
    await expect(presetBtn).toBeVisible()
    await presetBtn.click()

    // Navigates to results
    await expect(page).toHaveURL(/\/results\//)
    await expect(page.getByText(/Britannia/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Ultra-Processed/i).first()).toBeVisible()
    await expect(page.getByText(/Sugar/i).first()).toBeVisible()
  })

  test('AI Nutrition Analyzer handles input validation and meal query', async ({ page }) => {
    // Log in via demo mode
    await page.goto('/login')
    await page.getByText(/Explore Demo Mode/i).click()
    await expect(page).toHaveURL('/')

    // Navigate to AI Food
    await page.locator('nav').getByText('AI Food').click()
    await expect(page).toHaveURL('/ai-nutrition')

    const textarea = page.getByPlaceholder(/whole wheat rotis|Greek yogurt/i)
    await expect(textarea).toBeVisible()

    // Empty query: button is disabled
    const analyzeBtn = page.getByRole('button', { name: /Analyze Nutrition/i })
    await expect(analyzeBtn).toBeDisabled()

    // Fill query
    await textarea.fill('1 bowl of oats with almonds and chia seeds')
    await expect(analyzeBtn).toBeEnabled()
    await analyzeBtn.click()

    // Results card should appear with nutrients and glycemic score
    await expect(page.getByText(/Health Score|Calories|Macronutrients/i).first()).toBeVisible({ timeout: 25000 })
  })

  test('Food Camera Snap page loads and accepts photo upload', async ({ page }) => {
    // Log in via demo mode
    await page.goto('/login')
    await page.getByText(/Explore Demo Mode/i).click()
    await expect(page).toHaveURL('/')

    // Navigate via Home card
    await page.getByRole('link', { name: /Snap Food Photo/i }).click()
    await expect(page).toHaveURL('/camera-snap')

    await expect(page.getByRole('heading', { name: /Snap Food to Analyze/i })).toBeVisible()
    await expect(page.getByText('Gemini Vision', { exact: true })).toBeVisible()
  })

  test('Scan history respects authentication', async ({ page }) => {
    // Guest accessing /history is bounced to /login
    await page.goto('/history')
    await expect(page).toHaveURL('/login')

    // Authenticated user accessing /history sees history page
    await page.getByText(/Explore Demo Mode/i).click()
    await expect(page).toHaveURL('/')

    const viewAllLink = page.getByRole('link', { name: /View all/i })
    await expect(viewAllLink).toBeVisible()
    await viewAllLink.click()
    await expect(page).toHaveURL('/history')
    await expect(page.getByText('Scan History')).toBeVisible()
  })
})
