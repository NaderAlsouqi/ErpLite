import { test, expect } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { AccountStatementPage } from '../../pages/reports/account-statement.page';

/**
 * Customer Account Statement (/reports/account-statement) — READ-ONLY.
 * Built on Angular Material; its customer list is scoped to the logged-in
 * delivery user, so we assert structure and control state rather than driving a
 * full query (which needs a delivery-linked account + date selections).
 */
test.describe('Reports — Customer Account Statement', () => {
  let as: AccountStatementPage;

  test.beforeEach(async ({ page }) => {
    as = new AccountStatementPage(page);
    await as.goto();
  });

  test('renders the filter controls', async ({ errors }) => {
    await as.expectLoaded();
    await expect(as.customerSelect).toBeVisible();
    // Two Material datepicker inputs (start + end).
    await expect(as.matDateInputs()).toHaveCount(2);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('search is disabled until dates and an account are chosen', async () => {
    // No start/end date and no account selected yet.
    await expect(as.searchButton).toBeDisabled();
  });

  test('the print button reflects the Reports.View permission and empty data', async () => {
    // The header print button is behind *hasPermission="'Reports.View'".
    if (await as.hasPrintButton()) {
      // Present but disabled — no statement data has been loaded.
      await expect(as.printButton).toBeDisabled();
    } else {
      // Legitimately absent when the account lacks Reports.View.
      expect(await as.hasPrintButton()).toBeFalsy();
    }
  });
});
