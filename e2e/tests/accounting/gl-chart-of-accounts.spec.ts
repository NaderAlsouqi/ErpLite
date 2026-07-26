import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ChartOfAccountsPage } from '../../pages/accounting/chart-of-accounts.page';

test.describe('Chart of Accounts — دليل الحسابات (/accounting/gl/accounts-list)', () => {
  let coa: ChartOfAccountsPage;

  test.beforeEach(async ({ page }) => {
    coa = new ChartOfAccountsPage(page);
    await coa.goto();
  });

  test('renders the toolbar and the account tree table', async ({ errors }) => {
    await expect(coa.headerTitle()).toBeVisible();
    await expect(coa.expandAllBtn).toBeVisible();
    await expect(coa.collapseAllBtn).toBeVisible();
    await expect(coa.addAccountBtn).toBeVisible();
    await expect(coa.table).toBeVisible();
    // No / Arabic / English / Level / Belong / Credit / Debit / Ccntr / Actions.
    await expect(coa.headers).toHaveCount(9);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('expand-all reveals more rows than collapse-all', async () => {
    const collapsed0 = await coa.accountRows.count();
    await coa.expandAll();
    const expanded = await coa.accountRows.count();
    expect(expanded).toBeGreaterThanOrEqual(collapsed0);
    // Only assert a strict increase when the tree actually has parent nodes.
    if ((await coa.treeToggles.count()) > 0) {
      expect(expanded).toBeGreaterThan(collapsed0);
    }
    await coa.collapseAll();
    expect(await coa.accountRows.count()).toBeLessThanOrEqual(expanded);
  });

  test('a parent row can be expanded to show its children', async ({ page }) => {
    test.skip((await coa.treeToggles.count()) === 0, 'No parent accounts to expand.');
    // Every toggle belongs to a node with children; expanding it focuses that
    // node and reveals its children (parent row + >= 1 child row).
    await coa.treeToggles.first().click();
    await expect(page.locator('tr.account-row.row-expanded').first()).toBeVisible();
    expect(await coa.accountRows.count()).toBeGreaterThanOrEqual(2);
  });

  test('search switches to flat mode and clearing returns to the tree', async () => {
    await expect(coa.treeFooter).toBeVisible();
    await coa.search('1');
    await expect(coa.searchInfo).toBeVisible();
    await expect(coa.paginator).toBeVisible();
    await coa.clearSearch();
    await expect(coa.treeFooter).toBeVisible();
    await expect(coa.searchInfo).toHaveCount(0);
  });

  test('a nonsense search yields the empty-state row', async () => {
    await coa.search('zzz_no_match_' + Date.now());
    await expect(coa.table.locator('tbody tr td[colspan]')).toBeVisible();
  });

  test('adding a sub-account enforces the required-name validation', async ({ page }) => {
    requireWrites();
    // The Add Account button is always present (no permission gate on this screen).
    await test.step('add a new inline row', async () => {
      await coa.addRootAccount();
      await expect(coa.dirtyBanner).toBeVisible();
      // Save All / Discard All appear only while dirty.
      await expect(coa.saveAllBtn).toBeVisible();
      await expect(coa.discardAllBtn).toBeVisible();
    });

    await test.step('clearing the name blocks Save All with a validation error', async () => {
      await coa.newRowNameInput.fill('');
      await coa.saveAllBtn.click();
      await expect(page.locator('.toast-error').first()).toBeVisible();
      await expect(coa.newRowInvalidName).toBeVisible();
    });

    await test.step('discard reverts the dirty state without persisting', async () => {
      await coa.discardAllBtn.click();
      await expect(coa.dirtyBanner).toHaveCount(0);
      await expect(coa.newRows).toHaveCount(0);
    });
  });
});
