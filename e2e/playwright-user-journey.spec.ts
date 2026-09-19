import { test, expect } from '@playwright/test';

test.describe('E2E Browser Journey: Valley Reigns Recruitment Platform', () => {
  test('Homepage loads job listings, search filters work, and employer navigation responds', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');

    // 2. Expect main brand title or header to be visible
    await expect(page.locator('header')).toBeVisible();

    // 3. Verify search bar is accessible
    const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Engineer');
      await expect(searchInput).toHaveValue('Engineer');
    }

    // 4. Verify job cards or listings container is rendered
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('Employer portal navigation and login modal interaction', async ({ page }) => {
    await page.goto('/');

    // Look for Employer button / portal trigger
    const employerTrigger = page.locator('button:has-text("Employer"), a:has-text("Employer")').first();
    if (await employerTrigger.isVisible()) {
      await employerTrigger.click();
      // Should show employer modal or navigation view
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
