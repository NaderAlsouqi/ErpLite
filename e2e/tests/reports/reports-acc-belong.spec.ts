import { test, expect } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { AccBelongReportPage } from '../../pages/reports/acc-belong-report.page';

/**
 * Account-Belonging Report (كشف حسابات تابعة) — READ-ONLY.
 * Generate is disabled until a branched account is chosen. Results render in
 * `.ab-print-area` (summary/detail/monthly) or a "no data" block.
 */
test.describe('Reports — Account Belonging', () => {
  let ab: AccBelongReportPage;

  test.beforeEach(async ({ page }) => {
    ab = new AccBelongReportPage(page);
    await ab.goto();
  });

  test('renders filters with generate gated on account selection', async ({ errors }) => {
    await expect(ab.accountSelect).toBeVisible();
    await expect(ab.dateFrom).toBeVisible();
    await expect(ab.dateTo).toBeVisible();
    await expect(ab.modeDetail).toBeVisible();
    await expect(ab.generateButton).toBeDisabled();
    expect(await ab.hasExport()).toBeTruthy();
    await expect(ab.exportMainButton).toBeDisabled();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('selecting an account and generating renders a report or empty-state', async ({
    page,
    errors,
  }) => {
    const picked = await ab.selectFirstOption(ab.accountSelect);
    test.skip(!picked, 'No branched accounts available on this tenant.');

    await expect(ab.generateButton).toBeEnabled();
    await ab.generate();

    // Detail mode shows the print area; an empty result shows the no-data block.
    await expect(page.locator('.ab-print-area, .card-body > .text-center.py-5.text-muted')).toBeVisible({
      timeout: 30_000,
    });
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing a filter clears the displayed report', async () => {
    const picked = await ab.selectFirstOption(ab.accountSelect);
    test.skip(!picked, 'No branched accounts available on this tenant.');

    await ab.generate();
    await expect(ab.generateButton).toBeEnabled();

    await ab.showZero.click();
    await expect(ab.resultsRoot).toBeHidden();
    await expect(ab.noData).toBeHidden();
  });
});
