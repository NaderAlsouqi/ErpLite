import { test, expect } from '../../fixtures/test-fixtures';
import { fillDate, toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { TrialBalancePage } from '../../pages/reports/trial-balance.page';

/**
 * Trial Balance (ميزان المراجعة) — READ-ONLY report.
 * Covers: filter/render, generate → results-or-empty, export gating,
 * clear-on-filter-change, the date-range validation, and detailed mode.
 */
test.describe('Reports — Trial Balance', () => {
  let tb: TrialBalancePage;

  test.beforeEach(async ({ page }) => {
    tb = new TrialBalancePage(page);
    await tb.goto();
  });

  test('renders the filter panel and generate control', async ({ errors }) => {
    await expect(tb.generateButton).toBeVisible();
    await expect(tb.dateFrom).toBeVisible();
    await expect(tb.dateTo).toBeVisible();
    await expect(tb.level).toBeVisible();
    await expect(tb.showZero).toBeVisible();
    await expect(tb.postedAll).toBeVisible();
    // Export exists here (not permission-gated) and is disabled before generating.
    expect(await tb.hasExport()).toBeTruthy();
    await expect(tb.exportMainButton).toBeDisabled();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('generate produces a results table or an empty-state', async ({ errors }) => {
    await tb.generate();
    await tb.expectResultsShown();

    // Either the balances table or the "no data" info alert renders.
    const rows = await tb.resultRows().count();
    if (rows > 0) {
      await expect(tb.resultsTable).toBeVisible();
      // Regular mode shows 4 header columns.
      await expect(tb.headerCells()).toHaveCount(4);
      await expect(tb.exportMainButton).toBeEnabled();
    } else {
      await expect(tb.emptyAlert).toBeVisible();
    }
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing a filter clears the displayed results', async () => {
    await tb.generate();
    await tb.expectResultsShown();

    // showZero has (change)="onFilterChange()" → results must disappear.
    await tb.showZero.click();
    await expect(tb.resultsRoot).toBeHidden();
  });

  test('rejects an inverted date range with a warning', async ({ page, errors }) => {
    // Force dateFrom > dateTo, then try to generate.
    await fillDate(tb.dateFrom, '2100-12-31');
    await tb.generateButton.click();

    await expect(toast(page, 'warning').first()).toBeVisible();
    await expect(tb.resultsRoot).toBeHidden();
    // A validation toast is expected — no uncaught/console/5xx errors though.
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('detailed mode renders the movement columns', async ({ errors }) => {
    await tb.typeDetailed.click();
    await tb.generate();
    await tb.expectResultsShown();

    if ((await tb.resultRows().count()) > 0) {
      // Detailed view = 7 columns (AccNo, AccName, BegB, Db, Cr, DbBal, CrBal).
      await expect(tb.headerCells()).toHaveCount(7);
    }
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });
});
