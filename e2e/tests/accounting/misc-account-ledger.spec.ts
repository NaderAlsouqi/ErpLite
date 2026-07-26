import { test, expect } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { AccountLedgerPage } from '../../pages/accounting/account-ledger.page';

/**
 * كشف حساب — read/generate flows only. Generating a ledger is a GET, so no
 * write gating is required. We assert structure + behaviour, never specific
 * balances (shared real tenant).
 */
test.describe('Account Ledger (/accounting/misc/account-ledger)', () => {
  let ledger: AccountLedgerPage;

  test.beforeEach(async ({ page }) => {
    ledger = new AccountLedgerPage(page);
    await ledger.goto();
  });

  test('renders the account + date-range filters and the Fetch button', async ({ errors }) => {
    await expect(ledger.headerTitle()).toBeVisible();
    await expect(ledger.accountSelect).toBeVisible();
    await expect(ledger.dateFrom).toBeVisible();
    await expect(ledger.dateTo).toBeVisible();
    await expect(ledger.fetchBtn).toBeVisible();
    // No result until Fetch runs.
    await expect(ledger.printArea).toHaveCount(0);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('fetching without an account warns and does not query', async ({ page }) => {
    await ledger.fetchBtn.click();
    await expect(page.locator('.toast-warning').first()).toBeVisible();
    await expect(ledger.printArea).toHaveCount(0);
  });

  test('generating a ledger renders opening balance, table and final balance', async ({
    page,
    errors,
  }) => {
    await ledger.selectFirstAccount();
    const res = await waitForApi(page, 'AccountLedger/GetLedger', () => ledger.fetchBtn.click());
    expect(res.status()).toBeLessThan(400);
    await expect(ledger.printArea).toBeVisible();
    await expect(ledger.openingBalance).toBeVisible();
    await expect(ledger.resultTable).toBeVisible();
    await expect(ledger.finalBalance).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing a filter clears the previously fetched result', async ({ page }) => {
    await ledger.selectFirstAccount();
    await waitForApi(page, 'AccountLedger/GetLedger', () => ledger.fetchBtn.click());
    await expect(ledger.printArea).toBeVisible();
    await ledger.setDateFrom('2020-01-01');
    await expect(ledger.printArea).toHaveCount(0);
  });

  test('an inverted date range is rejected with a warning', async ({ page }) => {
    await ledger.selectFirstAccount();
    await ledger.setDateFrom('2035-01-01');
    await ledger.setDateTo('2020-12-31');
    await ledger.fetchBtn.click();
    await expect(page.locator('.toast-warning').first()).toBeVisible();
    await expect(ledger.printArea).toHaveCount(0);
  });
});
