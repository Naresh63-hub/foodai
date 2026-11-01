import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['Pixel 5'],
  hasTouch: true,
});

test('Mobile touch responsiveness and no touch-blocking overlays', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Log in via demo mode
  await page.goto('/login');
  await page.getByText(/Explore Demo Mode/i).tap();
  await expect(page).toHaveURL('/');

  // 1. Verify page loads without fatal errors
  expect(pageErrors).toEqual([]);

  // 2. Verify element at center is clickable and not blocked by an invisible backdrop
  const centerTarget = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
      tagName: el?.tagName,
      className: el?.className,
    };
  });
  expect(centerTarget.tagName).not.toBe('NAV');

  // 3. Tap on the bottom navigation "Scan" tab
  const scanTab = page.locator('nav a[href="/scan"]').first();
  await expect(scanTab).toBeVisible();
  await scanTab.tap();
  await expect(page).toHaveURL('/scan');

  // 4. Tap on "Home" tab to return
  const homeTab = page.locator('nav a[href="/"]').first();
  await homeTab.tap();
  await expect(page).toHaveURL('/');

  // 5. Tap on the Floating Food AI Chatbot button
  const chatbotBtn = page.locator('button[aria-label="Open FoodAI Chatbot"]').first();
  await expect(chatbotBtn).toBeVisible();
  await chatbotBtn.tap();

  // Verify chat window opens and input is available
  const chatInput = page.locator('input[placeholder*="Ask about foods"]');
  await expect(chatInput).toBeVisible();

  // Close chatbot
  const closeBtn = page.locator('button[title="Close chat"]').first();
  await closeBtn.tap();
  await expect(chatInput).not.toBeVisible();

  // 6. Tap on Analyze My Plate hero card from Home
  const plateCard = page.getByRole('link', { name: /Analyze My Plate/i }).first();
  await expect(plateCard).toBeVisible();
  await plateCard.tap();
  await expect(page).toHaveURL('/plate');

  // 7. Tap on Indian Thali preset
  const thaliPreset = page.getByText('Traditional Indian Thali').first();
  await expect(thaliPreset).toBeVisible();
  await thaliPreset.tap();

  // Verify analyze button appears and can be tapped
  const analyzeBtn = page.getByRole('button', { name: /Analyze Plate Items & Nutrition/i });
  await expect(analyzeBtn).toBeVisible();
  await analyzeBtn.tap();

  // Wait for results
  await expect(page.getByText(/Total Plate Nutrition/i)).toBeVisible({ timeout: 15000 });

  // Verify floating sticky bar is visible and above the bottom tab bar
  const stickyBar = page.locator('text=Save Meal').first();
  await expect(stickyBar).toBeVisible();
  await stickyBar.tap();
  await expect(page.getByText(/Meal Saved to History!/i)).toBeVisible({ timeout: 10000 });
});
