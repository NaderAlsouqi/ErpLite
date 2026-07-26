import { test, expect } from '../../fixtures/test-fixtures';
import { toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { IncomeStatementPage } from '../../pages/reports/income-statement.page';

/**
 * Income Statement (قائمة الدخل) — READ-ONLY report with an ending-stock grid.
 * Covers: render, generate → results, clear-on-change, level validation, and
 * the client-side grid controls (enable/disable state — no persistence).
 */
test.describe('Reports — Income Statement', () => {
  let is: IncomeStatementPage;

  test.beforeEach(async ({ page }) => {
    is = new IncomeStatementPage(page);
    await is.goto();
  });

  test('renders filters, generate control and the stock grid', async ({ errors }) => {
    await expect(is.generateButton).toBeVisible();
    await expect(is.dateFrom).toBeVisible();
    await expect(is.dateTo).toBeVisible();
    await expect(is.level).toBeVisible();
    await expect(is.addRowButton).toBeVisible();
    // Export is present and disabled until a report is generated.
    expect(await is.hasExport()).toBeTruthy();
    await expect(is.exportMainButton).toBeDisabled();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('grid load/save start disabled and Add Row enables Save', async () => {
    // No stock account entered → Load disabled; empty grid → Save disabled.
    await expect(is.loadGridButton).toBeDisabled();
    await expect(is.saveGridButton).toBeDisabled();

    await is.addRowButton.click();
    // A non-empty grid enables the Save button (still a client-side change).
    await expect(is.saveGridButton).toBeEnabled();
  });

  test('generate renders the income statement', async ({ errors }) => {
    await is.generate();
    await is.expectResultsShown();
    await expect(is.resultsTable).toBeVisible();
    if ((await is.resultRows().count()) > 0) {
      await expect(is.exportMainButton).toBeEnabled();
    }
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing a filter clears the displayed report', async () => {
    await is.generate();
    await is.expectResultsShown();

    await is.excludeClosing.click();
    await expect(is.resultsRoot).toBeHidden();
  });

  test('rejects a non-positive level with a warning', async ({ page, errors }) => {
    await is.level.fill('0');
    await is.level.blur();
    await is.generateButton.click();

    await expect(toast(page, 'warning').first()).toBeVisible();
    await expect(is.resultsRoot).toBeHidden();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });
});
