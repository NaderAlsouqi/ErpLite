import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { expectShell, toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ItemCardPage } from '../../pages/warehouse/entry-item-card.page';

/**
 * Item Card (بطاقة مادة) master/detail screen (/warehouse/entry/item-card).
 * Read-only coverage of the three tabs and required-field validation, plus a
 * gated create happy-path that exercises the category → auto-code → unit flow.
 */
test.describe('Warehouse entry — Item card', () => {
  test('renders the info tab with category, code and name fields', async ({ page, errors }) => {
    const card = new ItemCardPage(page);
    await card.goto();
    await expectShell(page);
    await expect(card.card).toBeVisible();
    await expect(card.infoTab).toBeVisible();
    await expect(card.unitsTab).toBeVisible();
    await expect(card.listTab).toBeVisible();
    await expect(card.categorySelect).toBeVisible();
    await expect(card.itemCodeInput).toBeVisible();
    await expect(card.nameArInput).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('units tab shows the units, price-category and alternatives grids', async ({ page }) => {
    const card = new ItemCardPage(page);
    await card.goto();
    await card.showUnits();
    await expect(card.unitsGrid).toBeVisible();
    await expect(card.priceCatGrid).toBeVisible();
    await expect(card.altGrid).toBeVisible();
  });

  test('list tab renders the items table and filters on an unlikely term', async ({ page }) => {
    const card = new ItemCardPage(page);
    await card.goto();
    await card.showList();
    await expect(card.listTable).toBeVisible();
    await expect(card.listHeaderCells).toHaveCount(7);

    await card.listSearch.fill('E2E_NO_SUCH_ITEM_' + Date.now());
    await expect(card.listRows).toHaveCount(0);
  });

  test('saving an empty card shows a validation warning (no write)', async ({ page }) => {
    const card = new ItemCardPage(page);
    await card.goto();
    await card.showInfo();

    test.skip(!(await card.hasCreatePermission()), 'account lacks ItemCard.Create permission');

    await card.save();
    await expect(toast(page, 'warning').first()).toBeVisible();
  });

  test('create a new item (category → auto code → unit) then delete it (cleanup)', async ({ page }) => {
    requireWrites();
    const card = new ItemCardPage(page);
    await card.goto();

    test.skip(!(await card.hasCreatePermission()), 'account lacks ItemCard.Create permission');

    const name = 'E2E_' + Date.now();

    await test.step('fill master info', async () => {
      await card.showInfo();
      const hasCategory = await card.selectFirstCategory();
      test.skip(!hasCategory, 'no product categories defined in this tenant');
      // Selecting a category triggers the server-side next-code generation.
      await expect(card.itemCodeInput).not.toHaveValue('');
      await card.nameArInput.fill(name);
    });

    await test.step('configure the smallest unit', async () => {
      await card.showUnits();
      const hasUnit = await card.setFirstUnitAsMin();
      test.skip(!hasUnit, 'no measurement units defined in this tenant');
    });

    await test.step('save', async () => {
      await card.save();
      await card.expectToast('success');
    });

    await test.step('delete (cleanup)', async () => {
      await card.showList();
      await card.listSearch.fill(name);
      const row = card.listRows.filter({ hasText: name }).first();
      if (await row.count()) {
        await row.click();
        await card.showInfo();
        await expect(card.deleteButton).toBeEnabled();
        await card.deleteButton.click();
        await expect(card.confirmButton.first()).toBeVisible();
        await card.confirmButton.first().click();
        await card.expectToast('success');
      } else {
        test.info().annotations.push({
          type: 'cleanup-skipped',
          description: `created item "${name}" not found in list for deletion`,
        });
      }
    });
  });
});
