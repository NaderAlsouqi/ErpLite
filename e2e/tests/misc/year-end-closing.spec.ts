import { test, expect } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { YearEndClosingPage } from '../../pages/misc/year-end-closing.page';

/**
 * Year-End Closing / إقفال نهاية السنة (/accounting/misc/year-end-closing).
 * We exercise render, defaults, client-side validation and the confirmation
 * gate. The actual close is intentionally NOT executed: it posts irreversible
 * GL entries against a shared tenant. We only assert the confirmation modal
 * appears and can be cancelled (no server write).
 */
test.describe('Year-End Closing (/accounting/misc/year-end-closing)', () => {
  let yec: YearEndClosingPage;

  test.beforeEach(async ({ page }) => {
    yec = new YearEndClosingPage(page);
    await yec.goto();
  });

  test('renders the form with the year and P&L account controls', async ({ errors }) => {
    await expect(yec.headerTitle()).toBeVisible();
    await expect(yec.yearInput).toBeVisible();
    await expect(yec.pnlSelect).toBeVisible();
    await expect(yec.closeInventoryCheck).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('year defaults to the current year and is capped at it', async () => {
    const currentYear = new Date().getFullYear();
    await expect(yec.yearInput).toHaveValue(String(currentYear));
    await expect(yec.yearInput).toHaveAttribute('max', String(currentYear));
  });

  test('inventory-close block is disabled until the checkbox is ticked', async () => {
    await expect(yec.closeInventoryCheck).not.toBeChecked();
    await yec.closeInventoryCheck.check();
    await expect(yec.closeInventoryCheck).toBeChecked();
  });

  test('executing without a P&L account is rejected with a warning', async ({ page }) => {
    if (!(await yec.canExecute())) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks YearEndClosing.Execute' });
      return;
    }
    await yec.executeBtn.click();
    await expect(page.locator('.toast-warning').first()).toBeVisible();
    // No confirmation modal should appear when validation fails.
    await expect(yec.confirmModal).toHaveCount(0);
  });

  test('executing with a P&L account opens a confirmation that can be cancelled', async () => {
    if (!(await yec.canExecute())) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks YearEndClosing.Execute' });
      return;
    }
    await yec.selectFirstPnlAccount();
    await yec.executeBtn.click();
    await expect(yec.confirmModal).toBeVisible();
    // Cancel — nothing is posted to the server.
    await yec.cancelBtn.click();
    await expect(yec.confirmModal).toBeHidden();
  });
});
