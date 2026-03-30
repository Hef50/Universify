import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('page loads and shows landing or app', async ({ page }) => {
    await page.goto('/');
    // Unauthenticated: landing with "Get Started" or "CMUnify"
    await expect(
      page.getByText(/get started|CMUnify/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to login', async ({ page }) => {
    await page.goto('/');
    const getStarted = page.getByText(/get started/i).first();
    await getStarted.click();
    await expect(page).toHaveURL(/login/);
    await expect(page.getByText(/sign in with google/i)).toBeVisible({ timeout: 5_000 });
  });
});
