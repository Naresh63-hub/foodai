import { test, expect } from '@playwright/test'

test.describe('Multi-Item Plate Recognition Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in via demo mode
    await page.goto('/login')
    await page.getByText(/Explore Demo Mode/i).click()
    await expect(page).toHaveURL('/')
  })

  test('Navigate to Analyze My Plate and verify initial capture options', async ({ page }) => {
    // Click Analyze My Plate from Home
    const plateCard = page.getByRole('link', { name: /Analyze My Plate/i })
    await expect(plateCard).toBeVisible()
    await plateCard.click()
    await expect(page).toHaveURL('/plate')

    await expect(page.getByRole('heading', { name: 'Analyze My Plate' })).toBeVisible()
    await expect(page.getByText('Traditional Indian Thali')).toBeVisible()
    await expect(page.getByText('Mediterranean Salmon Platter')).toBeVisible()
    await expect(page.getByText('Start Camera')).toBeVisible()
    await expect(page.getByText('Upload Photo')).toBeVisible()
  })

  test('Select demo plate, trigger analysis, edit portion and save meal', async ({ page }) => {
    // Navigate via Home card
    await page.getByRole('link', { name: /Analyze My Plate/i }).click()
    await expect(page).toHaveURL('/plate')

    // Tap on Indian Thali demo preset
    await page.getByText('Traditional Indian Thali').click()

    // Trigger analysis
    const analyzeBtn = page.getByRole('button', { name: /Analyze Plate Items & Nutrition/i })
    await expect(analyzeBtn).toBeVisible()
    await analyzeBtn.click()

    // Wait for analysis results
    await expect(page.getByText(/Total Plate Nutrition/i)).toBeVisible({ timeout: 15000 })
    await expect(page.locator('input[value*="Steamed Basmati Rice"]')).toBeVisible()
    await expect(page.locator('input[value*="Yellow Moong Dal Tadka"]')).toBeVisible()

    // Edit rice quantity
    const riceQty = page.getByLabel(/Quantity for Steamed Basmati Rice/i)
    await expect(riceQty).toBeVisible()
    await riceQty.fill('250')

    // Verify save button is present and clickable
    const saveBtn = page.getByRole('button', { name: /Save Meal to Food Diary/i })
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // Verify success state
    await expect(page.getByText(/Meal Saved to History!/i)).toBeVisible({ timeout: 10000 })
  })
})
