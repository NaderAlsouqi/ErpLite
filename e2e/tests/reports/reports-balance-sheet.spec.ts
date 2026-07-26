import { test, expect } from '../../fixtures/test-fixtures';
import { fillDate, toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { BalanceSheetPage } from '../../pages/reports/balance-sheet.page';

/**
 * Balance Sheet (الميزانية العمومية) — READ-ONLY report with an ending-stock
 * grid. Covers render, generate, clear-on-change, date validation and grid
 * button state.
 */
test.describe('Reports — Balance Sheet', () => {
  let bs: BalanceSheetPage;

  test.beforeEach(async ({ page }) => {
    bs = new BalanceSheetPage(page);
    await bs.goto();
  });

  test('renders filters, generate control and the stock grid', async ({ errors }) => {
    await expect(bs.generateButton).toBeVisible();
    await expect(bs.begDate).toBeVisible();
    await expect(bs.asOfDate).toBeVisible();
    await expect(bs.level).toBeVisible();
    await expect(bs.excludeClosing).toBeVisible();
    expect(await bs.hasExport()).toBeTruthy();
    await expect(bs.exportMainButton).toBeDisabled();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('grid save starts disabled and Add Row enables it', async () => {
    await expect(bs.loadGridButton).toBeDisabled();
    await expect(bs.saveGridButton).toBeDisabled();
    await bs.addRowButton.click();
    await expect(bs.saveGridButton).toBeEnabled();
  });

  test('generate renders the balance sheet', async ({ errors }) => {
    await bs.generate();
    await bs.expectResultsShown();
    await expect(bs.resultsTable).toBeVisible();
    if ((await bs.resultRows().count()) > 0) {
      await expect(bs.exportMainButton).toBeEnabled();
    }
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing a filter clears the displayed report', async () => {
    await bs.generate();
    await bs.expectResultsShown();
    await bs.excludeClosing.click();
    await expect(bs.resultsRoot).toBeHidden();
  });

  test('rejects an inverted date range with a warning', async ({ page, errors }) => {
    await fillDate(bs.begDate, '2100-12-31');
    await bs.generateButton.click();
    await expect(toast(page, 'warning').first()).toBeVisible();
    await expect(bs.resultsRoot).toBeHidden();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });
});
