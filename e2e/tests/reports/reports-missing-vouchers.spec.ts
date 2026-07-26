import { test, expect } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { MissingVouchersPage } from '../../pages/reports/missing-vouchers.page';

/**
 * Missing / Unbalanced Vouchers (كشف السندات المفقودة) — READ-ONLY.
 * Two actions render into `.mv-print-area`: the missing-doc scan (Generate) and
 * the unbalanced-transactions check.
 */
test.describe('Reports — Missing Vouchers', () => {
  let mv: MissingVouchersPage;

  test.beforeEach(async ({ page }) => {
    mv = new MissingVouchersPage(page);
    await mv.goto();
  });

  test('renders filters and both action buttons', async ({ errors }) => {
    await expect(mv.generateButton).toBeVisible();
    await expect(mv.unbalancedButton).toBeVisible();
    await expect(mv.docTypeSelect).toBeVisible();
    expect(await mv.numberInputs().count()).toBeGreaterThan(0);
    if (await mv.hasExport()) {
      await expect(mv.exportMainButton).toBeDisabled();
    }
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('the unbalanced check renders its results view', async ({ errors }) => {
    await mv.unbalancedButton.click();
    await mv.expectResultsShown();
    // Either an alert (none unbalanced / a table) renders inside the print area.
    await expect(mv.resultsRoot).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('generate shows the missing-doc results or a validation warning', async ({
    page,
    errors,
  }) => {
    await mv.generateButton.click();
    // docTo auto-fills to the max existing doc; if the range is empty the
    // component warns instead of rendering — accept either outcome.
    await expect(
      page.locator('.mv-print-area, .toast-warning')
    ).toBeVisible({ timeout: 30_000 });
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing a filter clears the displayed results', async () => {
    await mv.unbalancedButton.click();
    await mv.expectResultsShown();

    await mv.docFrom.fill('999999');
    await mv.docFrom.blur();
    await expect(mv.resultsRoot).toBeHidden();
  });
});
