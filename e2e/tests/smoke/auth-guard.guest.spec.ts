import { test, expect } from '../../fixtures/test-fixtures';
import { ENV } from '../../support/env';

/**
 * Runs UNAUTHENTICATED (guest project — no stored session). Verifies the global
 * AuthGuard redirects protected routes to /auth/login, and that the public
 * routes (root redirect, wildcard 404) behave correctly.
 */
const PROTECTED_SAMPLE = [
  '/home2',
  '/dashboard',
  '/dashboard2',
  '/activity-log',
  '/sales/invoice',
  '/accounting/vouchers/journal',
  '/accounting/reports/trial-balance',
  '/accounting/gl/accounts-list',
  '/warehouse/vouchers/inbound',
  '/warehouse/entry/item-card',
  '/workflow/tasks',
  '/reseller/quotation',
];

test.describe('AuthGuard — unauthenticated access is blocked', () => {
  for (const path of PROTECTED_SAMPLE) {
    test(`redirects ${path} -> /auth/login`, async ({ page }) => {
      await page.goto(ENV.baseURL + path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: ENV.navTimeout });
    });
  }

  test('root path redirects to login', async ({ page }) => {
    await page.goto(ENV.baseURL + '/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: ENV.navTimeout });
  });

  test('unknown route renders the public 404 page (not a redirect)', async ({ page }) => {
    await page.goto(ENV.baseURL + '/this/route/does/not/exist', {
      waitUntil: 'domcontentloaded',
    });
    // The wildcard 404 route sits OUTSIDE the AuthGuard, so it must render, not redirect.
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator('body')).toContainText(/404|not\s*found|الصفحة|غير\s*موجود/i);
  });
});
