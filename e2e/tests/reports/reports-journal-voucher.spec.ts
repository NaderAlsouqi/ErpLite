import { test, expect } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { JournalVoucherReportPage } from '../../pages/reports/journal-voucher-report.page';

/**
 * Journal Voucher Report (تقرير القيود) — READ-ONLY, search-style.
 * Search works with the default date range. Covers render, empty prompt,
 * a full search, filter-mode toggle, clear-on-change and the Clear button.
 */
test.describe('Reports — Journal Voucher Report', () => {
  let jv: JournalVoucherReportPage;

  test.beforeEach(async ({ page }) => {
    jv = new JournalVoucherReportPage(page);
    await jv.goto();
  });

  test('renders search controls and the empty prompt', async ({ errors }) => {
    await expect(jv.searchButton).toBeVisible();
    await expect(jv.clearButton).toBeVisible();
    await expect(jv.filterModeDate).toBeVisible();
    await expect(jv.filterModeDoc).toBeVisible();
    await expect(jv.emptyPrompt).toBeVisible();
    expect(await jv.hasExport()).toBeTruthy();
    await expect(jv.exportMainButton).toBeDisabled();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('searching with the default range renders the voucher summary', async ({ errors }) => {
    await jv.searchButton.click();
    await jv.expectResultsShown();
    await expect(jv.emptyPrompt).toBeHidden();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('switching to DocNum mode reveals number range inputs and clears results', async () => {
    await jv.searchButton.click();
    await jv.expectResultsShown();

    await jv.filterModeDoc.click();
    // (change)="onFilterChange()" clears the summary; number inputs appear.
    await expect(jv.resultsRoot).toBeHidden();
    await expect(jv.emptyPrompt).toBeVisible();
    expect(await jv.numberInputs().count()).toBeGreaterThan(0);
  });

  test('the Clear button resets to the empty prompt', async () => {
    await jv.searchButton.click();
    await jv.expectResultsShown();

    await jv.clearButton.click();
    await expect(jv.resultsRoot).toBeHidden();
    await expect(jv.emptyPrompt).toBeVisible();
  });
});
