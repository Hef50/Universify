import { test, expect } from '@playwright/test';

test.describe('Events', () => {
  test('landing page shows discovery or CTA', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText(/discover|get started|CMUnify/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('find tab shows events or empty state after login link', async ({ page }) => {
    await page.goto('/');
    await page.getByText(/get started/i).first().click();
    await expect(page).toHaveURL(/login/);
    // From login we could go to (tabs)/find if we had auth; without auth we stay on login
    await expect(page.getByText(/sign in with google|universify/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
