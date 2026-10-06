import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Welcome Back')).toBeVisible()
    await expect(page.getByText('Sign in to continue to FoodAI')).toBeVisible()
  })

  test('should display register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Create Account')).toBeVisible()
    await expect(page.getByText('Join FoodAI today to make healthier food choices')).toBeVisible()
  })

  test('should have email and password fields on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByText('Sign In')).toBeVisible()
  })

  test('should have email, password, and confirm password fields on register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByLabel('Confirm Password')).toBeVisible()
    await expect(page.getByText('Create Account')).toBeVisible()
  })

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto('/login')
    
    await page.click('text=Sign up')
    await expect(page).toHaveURL('/register')
    
    await page.click('text=Sign in')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/scan')
    await expect(page).toHaveURL('/login')
  })

  test('should redirect to login when accessing profile without auth', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Main Navigation', () => {
  test('should display home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
  })

  test('should have bottom navigation bar', async ({ page }) => {
    await page.goto('/')
    const navBar = page.locator('nav').first()
    await expect(navBar).toBeVisible()
  })
})
