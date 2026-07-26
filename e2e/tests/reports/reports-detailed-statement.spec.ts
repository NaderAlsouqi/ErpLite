import { test, expect } from '../../fixtures/test-fixtures';
import { toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { DetailedStatementPage } from '../../pages/reports/detailed-statement.page';

/**
 * Detailed Account Statement (كشف حساب تفصيلي) — READ-ONLY, search-style.
 * "From account" is required; results render a `.ads-summary` bar + per-account
 * tables. Covers render, the empty prompt, required-field validation, a full
 * search, clear-on-change, and the Clear button.
 */
test.describe('Reports — Detailed Account Statement', () => {
  let ds: DetailedStatementPage;

  test.beforeEach(async ({ page }) => {
    ds = new DetailedStatementPage(page);
    await ds.goto();
  });

  test('renders search controls and the empty prompt', async ({ errors }) => {
    await expect(ds.searchButton).toBeVisible();
    await expect(ds.clearButton).toBeVisible();
    await expect(ds.currencySelect).toBeVisible();
    await expect(ds.accountFromSelect).toBeVisible();
    await expect(ds.emptyPrompt).toBeVisible();
    // Export disabled until a search produces results.
    expect(await ds.hasExport()).toBeTruthy();
    await expect(ds.exportMainButton).toBeDisabled();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('searching without a from-account warns and shows nothing', async ({ page }) => {
    await ds.searchButton.click();
    await expect(toast(page, 'warning').first()).toBeVisible();
    await expect(ds.emptyPrompt).toBeVisible();
    await expect(ds.resultsRoot).toBeHidden();
  });

  test('selecting an account and searching renders the statement', async ({ errors }) => {
    const picked = await ds.selectFirstOption(ds.accountFromSelect);
    test.skip(!picked, 'No accounts available on this tenant.');

    await ds.searchButton.click();
    // hasResults flips true even with zero lines → the summary bar renders.
    await ds.expectResultsShown();
    await expect(ds.emptyPrompt).toBeHidden();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing a filter clears the results back to the prompt', async () => {
    const picked = await ds.selectFirstOption(ds.accountFromSelect);
    test.skip(!picked, 'No accounts available on this tenant.');

    await ds.searchButton.click();
    await ds.expectResultsShown();

    // "Show items" checkbox has (change)="onFilterChange()".
    await ds.showItems.click();
    await expect(ds.resultsRoot).toBeHidden();
    await expect(ds.emptyPrompt).toBeVisible();
  });

  test('the Clear button resets to the empty prompt', async () => {
    const picked = await ds.selectFirstOption(ds.accountFromSelect);
    test.skip(!picked, 'No accounts available on this tenant.');

    await ds.searchButton.click();
    await ds.expectResultsShown();

    await ds.clearButton.click();
    await expect(ds.resultsRoot).toBeHidden();
    await expect(ds.emptyPrompt).toBeVisible();
  });
});
