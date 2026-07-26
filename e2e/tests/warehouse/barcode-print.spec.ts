import { test, expect } from '../../fixtures/test-fixtures';
import { toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ENV } from '../../support/env';
import { BarcodePrintPage } from '../../pages/warehouse/barcode-print.page';

// طباعة الباركود — builds CODE128 labels entirely client-side; every scenario is
// read-only (no records are ever written).
test.describe('Warehouse — barcode printing', () => {
  test.beforeEach(async ({ page }) => {
    await new BarcodePrintPage(page).goto();
  });

  test('renders the label options without runtime errors', async ({ page, errors }) => {
    const bp = new BarcodePrintPage(page);
    await expect(bp.fromItemSelect).toBeVisible();
    await expect(bp.toItemSelect).toBeVisible();
    await expect(bp.copiesInput).toBeVisible();
    await expect(bp.showNameCheck).toBeVisible();
    await expect(bp.showPriceCheck).toBeVisible();
    await expect(bp.previewBtn).toBeVisible();
    // Nothing generated yet → Print is disabled and the empty-state hint shows.
    await expect(bp.printBtn).toBeDisabled();
    await expect(bp.hint).toBeVisible();
    await expect(bp.labels).toHaveCount(0);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('previewing without an item range warns', async ({ page }) => {
    const bp = new BarcodePrintPage(page);
    await bp.previewBtn.click();
    await expect(toast(page, 'warning').first()).toBeVisible({ timeout: ENV.slowExpect });
    await expect(bp.labels).toHaveCount(0);
  });

  test('a zero copy count warns', async ({ page }) => {
    const bp = new BarcodePrintPage(page);
    if (!(await bp.pickOption(bp.fromItemSelect, 0)) || !(await bp.pickOption(bp.toItemSelect, 0))) {
      test.info().annotations.push({ type: 'skip', description: 'No items available.' });
      return;
    }
    await bp.setCopies(0);
    await bp.previewBtn.click();
    await expect(toast(page, 'warning').first()).toBeVisible({ timeout: ENV.slowExpect });
  });

  test('generates and then clears barcode labels for a single item', async ({ page }) => {
    const bp = new BarcodePrintPage(page);
    if (!(await bp.pickOption(bp.fromItemSelect, 0)) || !(await bp.pickOption(bp.toItemSelect, 0))) {
      test.info().annotations.push({ type: 'skip', description: 'No items available.' });
      return;
    }
    await bp.setCopies(1);
    await bp.previewBtn.click();

    await expect(bp.labels.first()).toBeVisible({ timeout: ENV.slowExpect });
    expect(await bp.labels.count()).toBeGreaterThanOrEqual(1);
    await expect(bp.barcodeSvgs.first()).toBeVisible();
    await expect(bp.printBtn).toBeEnabled();
    await expect(bp.clearBtn).toBeVisible();

    await bp.clearBtn.click();
    await expect(bp.labels).toHaveCount(0);
    await expect(bp.hint).toBeVisible();
    await expect(bp.printBtn).toBeDisabled();
  });

  test('copies count multiplies the generated labels', async ({ page }) => {
    const bp = new BarcodePrintPage(page);
    if (!(await bp.pickOption(bp.fromItemSelect, 0)) || !(await bp.pickOption(bp.toItemSelect, 0))) {
      test.info().annotations.push({ type: 'skip', description: 'No items available.' });
      return;
    }
    await bp.setCopies(3);
    await bp.previewBtn.click();
    // Single-item range × 3 copies → exactly 3 labels.
    await expect(bp.labels).toHaveCount(3, { timeout: ENV.slowExpect });
  });
});
