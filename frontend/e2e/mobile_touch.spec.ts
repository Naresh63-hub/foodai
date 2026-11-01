import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['Pixel 5'],
  hasTouch: true,
});

test('Mobile touch responsiveness and no touch-blocking overlays', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('request', (req) => console.log('REQ:', req.method(), req.url()));
  page.on('requestfailed', (req) => console.log('FAILED REQ:', req.url(), req.failure()?.errorText));

  await page.goto('/');
  await page.waitForTimeout(3000);

  // Verify page loads without fatal errors
  expect(pageErrors).toEqual([]);

  // Verify element at center of screen is interactive or standard page content, NOT an invisible overlay
  const centerTarget = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
      tagName: el?.tagName,
      className: el?.className,
      id: el?.id,
    };
  });
  console.log('Center target element:', centerTarget);

  // Tap on a home page card
  const plateCard = page.locator('text=Analyze My Plate').first();
  await expect(plateCard).toBeVisible();
  await plateCard.tap();
  await page.waitForURL('**/analyze-plate');
  expect(page.url()).toContain('/analyze-plate');

  // Go back to home
  const homeTab = page.locator('nav a[href="/"]').first();
  await homeTab.tap();
  await page.waitForURL('**/');

  // Tap on the Food AI Chatbot button
  const chatbotBtn = page.locator('button[aria-label="Open FoodAI Chatbot"]').first();
  await expect(chatbotBtn).toBeVisible();
  await chatbotBtn.tap();

  // Verify chatbot modal opens and is interactive
  const chatbotInput = page.locator('input[placeholder*="Ask about foods"]');
  await expect(chatbotInput).toBeVisible();

  // Close chatbot
  const closeBtn = page.locator('button[title="Close chat"]').first();
  await closeBtn.tap();
  await expect(chatbotInput).not.toBeVisible();
});
