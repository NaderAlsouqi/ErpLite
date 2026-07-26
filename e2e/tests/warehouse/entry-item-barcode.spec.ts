import { test, expect } from '../../fixtures/test-fixtures';
import { expectShell } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ItemBarcodePage } from '../../pages/warehouse/entry-item-barcode.page';

/**
 * Item Barcodes screen (/warehouse/entry/barcode). Read-only coverage: the page
 * renders, the unit select is gated on picking an item, and the primary Save
 * action is disabled until a unit is chosen. No writes are performed.
 */
test.describe('Warehouse entry — Item barcodes', () => {
  test('renders the item/unit selectors and a placeholder prompt', async ({ page, errors }) => {
    const bc = new ItemBarcodePage(page);
    await bc.goto();
    await expectShell(page);
    await expect(bc.card).toBeVisible();
    await expect(bc.itemSelect).toBeVisible();
    await expect(bc.unitSelect).toBeVisible();
    await expect(bc.placeholderMessage).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('unit select is disabled until an item is chosen', async ({ page }) => {
    const bc = new ItemBarcodePage(page);
    await bc.goto();
    await bc.expectInitialState();
  });

  test('save is disabled while no unit is selected', async ({ page }) => {
    const bc = new ItemBarcodePage(page);
    await bc.goto();
    test.skip(!(await bc.hasCreatePermission()), 'account lacks ItemBarcode.Create permission');
    await expect(bc.saveButton).toBeDisabled();
  });
});
