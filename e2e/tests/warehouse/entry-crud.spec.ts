import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { expectShell, toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { CrudGridPage } from '../../pages/warehouse/entry-crud.page';

/**
 * Warehouse "entry / definition" CRUD screens that share the form/list two-tab
 * layout. One data-driven suite covers all of them structurally:
 *   - the entry form + list tabs render,
 *   - the list table has the expected columns,
 *   - list search filters rows and clears,
 *   - saving with empty required fields raises a validation warning (no write),
 *   - full create → edit → delete round-trip (gated behind ALLOW_WRITES).
 *
 * Assertions are structural (never on pre-existing rows/values) because the
 * backend is a shared real tenant.
 */
interface Entity {
  title: string;
  path: string;
  permKey: string;
  columns: number;
}

const ENTITIES: Entity[] = [
  { title: 'Units', path: '/warehouse/entry/units', permKey: 'Units', columns: 3 },
  { title: 'Warehouses', path: '/warehouse/entry/warehouses', permKey: 'Stores', columns: 4 },
  {
    title: 'Disbursement entities',
    path: '/warehouse/entry/disbursement-entities',
    permKey: 'DisbursementEntities',
    columns: 4,
  },
  { title: 'Origin country', path: '/warehouse/entry/origin-country', permKey: 'OriginCountry', columns: 3 },
  { title: 'Price categories', path: '/warehouse/entry/price-categories', permKey: 'PriceCategory', columns: 3 },
  { title: 'Main categories', path: '/warehouse/entry/main-items', permKey: 'MainCategories', columns: 5 },
  { title: 'Brands', path: '/warehouse/entry/brands', permKey: 'Brands', columns: 3 },
];

for (const entity of ENTITIES) {
  test.describe(`Warehouse entry — ${entity.title}`, () => {
    const make = (page: import('@playwright/test').Page) =>
      new CrudGridPage(page, entity.path, { permKey: entity.permKey, columnCount: entity.columns });

    test('renders the entry form and list tabs', async ({ page, errors }) => {
      const crud = make(page);
      await crud.goto();
      await expectShell(page);
      await expect(crud.card).toBeVisible();
      await expect(crud.formTab).toBeVisible();
      await expect(crud.listTab).toBeVisible();
      await expect(crud.numberInput).toBeVisible();
      await expect(crud.arabicName).toBeVisible();
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('list tab renders a table with the expected columns', async ({ page, errors }) => {
      const crud = make(page);
      await crud.goto();
      await crud.showList();
      await expect(crud.table).toBeVisible();
      await expect(crud.headerCells).toHaveCount(entity.columns);
      // A body is always present (data rows or the "no records" row).
      await expect(crud.table.locator('tbody tr').first()).toBeVisible();
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('list search filters to zero on an unlikely term, then clears', async ({ page }) => {
      const crud = make(page);
      await crud.goto();
      await crud.showList();

      await crud.search('E2E_NO_SUCH_ROW_' + Date.now());
      await expect(crud.dataRows).toHaveCount(0);
      await expect(crud.noRecordsCell).toBeVisible();

      await expect(crud.clearSearchButton).toBeVisible();
      await crud.clearSearchButton.click();
      await expect(crud.searchInput).toHaveValue('');
    });

    test('saving with empty required fields shows a validation warning (no write)', async ({ page }) => {
      const crud = make(page);
      await crud.goto();
      await crud.showForm();

      const canCreate = await crud.hasCreatePermission();
      test.skip(!canCreate, `account lacks ${entity.permKey}.Create permission`);

      // Clear the name fields so client-side validation blocks before any request.
      await crud.arabicName.fill('');
      await crud.englishName.fill('');
      await crud.saveButton.click();

      await expect(toast(page, 'warning').first()).toBeVisible();
    });

    test('create, edit and delete a record (cleanup)', async ({ page }) => {
      requireWrites();
      const crud = make(page);
      await crud.goto();

      const canCreate = await crud.hasCreatePermission();
      const canDelete = await crud.hasDeletePermission();
      test.skip(!canCreate || !canDelete, `account lacks ${entity.permKey}.Create/Delete permission`);

      const name = 'E2E_' + Date.now();

      await test.step('create', async () => {
        await crud.createRecord(name);
        await crud.showList();
        await crud.search(name);
        await expect(crud.rowByText(name)).toBeVisible();
      });

      await test.step('edit', async () => {
        await crud.openRecord(name);
        await crud.englishName.fill(name + '_E');
        await crud.saveButton.click();
        await crud.expectToast('success');
      });

      await test.step('delete (cleanup)', async () => {
        await crud.openRecord(name);
        await crud.deleteCurrent();
      });
    });
  });
}
