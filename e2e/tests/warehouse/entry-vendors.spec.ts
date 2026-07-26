import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { expectShell, toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { VendorsPage } from '../../pages/warehouse/entry-vendors.page';

/**
 * Suppliers / Vendors entry screen (/warehouse/entry/suppliers). Same two-tab
 * shell as the simple definition screens but a richer entry form (ng-select
 * number picker, Name-only required, auto-assigned number on save).
 */
test.describe('Warehouse entry — Suppliers (vendors)', () => {
  test('renders the entry form and list tabs', async ({ page, errors }) => {
    const vendors = new VendorsPage(page);
    await vendors.goto();
    await expectShell(page);
    await expect(vendors.card).toBeVisible();
    await expect(vendors.formTab).toBeVisible();
    await expect(vendors.listTab).toBeVisible();
    await expect(vendors.noSelect).toBeVisible();
    await expect(vendors.nameInput).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('list tab renders a table with the expected columns', async ({ page, errors }) => {
    const vendors = new VendorsPage(page);
    await vendors.goto();
    await vendors.showList();
    await expect(vendors.table).toBeVisible();
    await expect(vendors.headerCells).toHaveCount(6);
    await expect(vendors.table.locator('tbody tr').first()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('list search filters to zero on an unlikely term, then clears', async ({ page }) => {
    const vendors = new VendorsPage(page);
    await vendors.goto();
    await vendors.showList();

    await vendors.search('E2E_NO_SUCH_VENDOR_' + Date.now());
    await expect(vendors.dataRows).toHaveCount(0);
    await expect(vendors.noRecordsCell).toBeVisible();

    await expect(vendors.clearSearchButton).toBeVisible();
    await vendors.clearSearchButton.click();
    await expect(vendors.searchInput).toHaveValue('');
  });

  test('saving without a name shows a validation warning (no write)', async ({ page }) => {
    const vendors = new VendorsPage(page);
    await vendors.goto();
    await vendors.showForm();

    test.skip(!(await vendors.hasCreatePermission()), 'account lacks Vendors.Create permission');

    await vendors.nameInput.fill('');
    await vendors.saveButton.click();
    await expect(toast(page, 'warning').first()).toBeVisible();
  });

  test('create then delete a vendor (cleanup)', async ({ page }) => {
    requireWrites();
    const vendors = new VendorsPage(page);
    await vendors.goto();

    const canCreate = await vendors.hasCreatePermission();
    const canDelete = await vendors.hasDeletePermission();
    test.skip(!canCreate || !canDelete, 'account lacks Vendors.Create/Delete permission');

    const name = 'E2E_' + Date.now();

    await test.step('create', async () => {
      await vendors.createVendor(name);
      await vendors.showList();
      await vendors.search(name);
      await expect(vendors.rowByText(name)).toBeVisible();
    });

    await test.step('delete (cleanup)', async () => {
      await vendors.openVendor(name);
      await vendors.deleteCurrent();
    });
  });
});
