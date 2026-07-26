import { test, expect } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ActivityLogPage } from '../../pages/misc/activity-log.page';

/**
 * Activity Log / سجل الأحداث (/activity-log). Fully read-only (all GETs):
 * table render, column structure, filter apply/clear, date filter, pagination.
 * We never assert on specific rows (shared real tenant).
 */
test.describe('Activity Log (/activity-log)', () => {
  let log: ActivityLogPage;

  test.beforeEach(async ({ page }) => {
    log = new ActivityLogPage(page);
    await log.goto();
    await log.waitForTableSettled();
  });

  test('renders the filter card, the 7-column table and the paginator', async ({ errors }) => {
    await expect(log.headerTitle()).toBeVisible();
    await expect(log.filters).toBeVisible();
    await expect(log.usernameInput).toBeVisible();
    await expect(log.searchBtn).toBeVisible();
    await expect(log.clearBtn).toBeVisible();
    await expect(log.headers).toHaveCount(7);
    await expect(log.paginator).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('applying the search filter re-queries the log', async ({ page }) => {
    await log.usernameInput.fill('zzz_no_such_user_' + Date.now());
    const res = await waitForApi(page, '/ActivityLog/GetAll', () => log.searchBtn.click());
    expect(res.status()).toBeLessThan(400);
    // An impossible username yields the empty-state placeholder row.
    await expect(log.emptyRow).toBeVisible();
  });

  test('clearing the filters resets and reloads', async ({ page }) => {
    await log.usernameInput.fill('anything');
    await log.searchBtn.click();
    const res = await waitForApi(page, '/ActivityLog/GetAll', () => log.clearBtn.click());
    expect(res.status()).toBeLessThan(400);
    await expect(log.usernameInput).toHaveValue('');
  });

  test('a date-range filter is sent to the server', async ({ page }) => {
    await log.setDateFrom('2020-01-01');
    await log.setDateTo('2020-01-31');
    const res = await waitForApi(page, '/ActivityLog/GetAll', () => log.searchBtn.click());
    expect(res.status()).toBeLessThan(400);
    expect(res.url()).toMatch(/DateFrom=2020-01-01/);
  });

  test('paginator is present and paging re-queries when more pages exist', async ({ page }) => {
    const nextBtn = log.paginator.locator('button.mat-mdc-paginator-navigation-next');
    await expect(nextBtn).toBeVisible();
    if (await nextBtn.isEnabled()) {
      const res = await waitForApi(page, '/ActivityLog/GetAll', () => nextBtn.click());
      expect(res.status()).toBeLessThan(400);
    } else {
      test.info().annotations.push({ type: 'note', description: 'single page of results' });
    }
  });
});
