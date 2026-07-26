import { test, expect } from '../../fixtures/test-fixtures';
import { expectShell } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ReplaceItemCodePage } from '../../pages/warehouse/entry-replace-item-code.page';

/**
 * Replace Item Code screen (/warehouse/entry/replace-item-code). Destructive
 * maintenance action — covered read-only: the page renders with its warning,
 * and the Replace button stays disabled until BOTH an old item and a new code
 * are supplied. No replacement is executed.
 */
test.describe('Warehouse entry — Replace item code', () => {
  test('renders the warning, old-item selector and new-code input', async ({ page, errors }) => {
    const rp = new ReplaceItemCodePage(page);
    await rp.goto();
    await expectShell(page);
    await expect(rp.card).toBeVisible();
    await expect(rp.warningAlert).toBeVisible();
    await expect(rp.oldItemSelect).toBeVisible();
    await expect(rp.newCodeInput).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('replace is disabled with no inputs and stays disabled with only a new code', async ({ page }) => {
    const rp = new ReplaceItemCodePage(page);
    await rp.goto();
    test.skip(!(await rp.hasExecutePermission()), 'account lacks ReplaceItemCode.Execute permission');

    await expect(rp.replaceButton).toBeDisabled();

    // Typing only a new code (without selecting an old item) must not enable it.
    await rp.newCodeInput.fill('E2E_NEWCODE_' + Date.now());
    await expect(rp.replaceButton).toBeDisabled();
  });
});
