import { test, expect } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { AgingAnalysisPage } from '../../pages/reports/aging-analysis.page';

/**
 * Aging Analysis (تحليل أعمار الديون) — READ-ONLY report.
 * Generate stays disabled until a "belong" account is chosen; results render in
 * `.ag-print-area`. Covers render, the required-account gate, generate, and
 * clear-on-change.
 */
test.describe('Reports — Aging Analysis', () => {
  let ag: AgingAnalysisPage;

  test.beforeEach(async ({ page }) => {
    ag = new AgingAnalysisPage(page);
    await ag.goto();
  });

  test('renders filters with generate gated on account selection', async ({ errors }) => {
    await expect(ag.accountSelect).toBeVisible();
    await expect(ag.salesmanSelect).toBeVisible();
    await expect(ag.areaSelect).toBeVisible();
    await expect(ag.asOfDate).toBeVisible();
    // No account chosen yet → generate is disabled.
    await expect(ag.generateButton).toBeDisabled();
    expect(await ag.hasExport()).toBeTruthy();
    await expect(ag.exportMainButton).toBeDisabled();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('selecting an account enables generate and renders results', async ({ errors }) => {
    const picked = await ag.selectFirstOption(ag.accountSelect);
    test.skip(!picked, 'No branched accounts available on this tenant.');

    await expect(ag.generateButton).toBeEnabled();
    await ag.generate();
    await ag.expectResultsShown();

    // Either an aging table or the empty-state alert renders.
    if ((await ag.resultRows().count()) === 0) {
      await expect(ag.emptyAlert).toBeVisible();
    } else {
      await expect(ag.resultsTable).toBeVisible();
    }
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing a filter clears displayed results', async () => {
    const picked = await ag.selectFirstOption(ag.accountSelect);
    test.skip(!picked, 'No branched accounts available on this tenant.');

    await ag.generate();
    await ag.expectResultsShown();

    // Sort-order radios carry (change)="onFilterChange()".
    await ag.sortByName.click();
    await expect(ag.resultsRoot).toBeHidden();
  });
});
