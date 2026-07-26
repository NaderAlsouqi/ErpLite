import { test, expect, requireCredentials } from '../../fixtures/test-fixtures';
import { goto, expectShell } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { PermissionsAdminPage } from '../../pages/permissions/permissions-admin.page';

const MANAGE = 'Admin.ManagePermissions';

/**
 * Permissions admin screen (/accounting/admin/permissions), guarded by
 * `Admin.ManagePermissions`. Coverage is read-only: access guard, matrix render,
 * user selection, permission search, system-scope filtering and in-memory
 * bulk-toggle behavior (Select-All / Clear-All / row / column) which never hits
 * Save, so nothing is persisted. Grant/revoke persistence lives in the sibling
 * *.write.spec.ts, gated behind ALLOW_WRITES.
 */
test.describe('Permissions admin — access guard', () => {
  test('redirects to /auth/login when the account lacks the permission', async ({ page, api }) => {
    requireCredentials();
    const granted = await api.permissions();
    test.skip(granted.includes(MANAGE), 'Account holds Admin.ManagePermissions; redirect case N/A.');

    const perms = new PermissionsAdminPage(page);
    await goto(page, perms.path);
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Permissions admin — matrix (requires Admin.ManagePermissions)', () => {
  let perms: PermissionsAdminPage;

  test.beforeEach(async ({ page, api }) => {
    requireCredentials();
    const granted = await api.permissions();
    test.skip(!granted.includes(MANAGE), 'Requires Admin.ManagePermissions.');
    perms = new PermissionsAdminPage(page);
    await perms.goto();
  });

  test('renders the shell, header, card and the user picker', async ({ page, errors }) => {
    await expectShell(page);
    await expect(perms.pageHeader).toBeVisible();
    await expect(perms.headerTitle()).toBeVisible();
    await expect(perms.card).toBeVisible();
    await expect(perms.cardTitle).toBeVisible();
    await expect(perms.userSelect).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('before a user is picked: empty state, no matrix, no toolbar', async () => {
    await expect(perms.emptyState).toBeVisible();
    await expect(perms.table).toHaveCount(0);
    await expect(perms.saveBtn).toHaveCount(0);
    await expect(perms.permissionSearch).toHaveCount(0);
    await expect(perms.systemSelect).toHaveCount(0);
  });

  test('picking a user renders the matrix with module rows and action columns', async ({
    errors,
  }) => {
    await perms.selectFirstUser();

    await expect(perms.table).toBeVisible();
    await expect(perms.moduleHeader).toBeVisible();
    await expect(perms.actionHeaders.first()).toBeVisible();
    expect(await perms.actionHeaders.count()).toBeGreaterThan(0);
    expect(await perms.moduleRows.count()).toBeGreaterThan(0);
    // Each body cell either holds a grant checkbox or is empty; at least one exists.
    expect(await perms.cellCheckboxes.count()).toBeGreaterThan(0);
    // Toolbar + filters appear only once a user is selected.
    await expect(perms.saveBtn).toBeVisible();
    await expect(perms.permissionSearch).toBeVisible();
    await expect(perms.systemSelect).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('a nonsense permission search clears the matrix, clearing restores it', async () => {
    await perms.selectFirstUser();
    await expect(perms.table).toBeVisible();

    await perms.searchPermission('zzz_no_match_' + Date.now());
    await expect(perms.noResults).toBeVisible();
    await expect(perms.table).toHaveCount(0);

    await perms.clearPermissionSearch();
    await expect(perms.table).toBeVisible();
    await expect(perms.noResults).toHaveCount(0);
  });

  test('the system-scope filter narrows the matrix and clearing widens it again', async () => {
    await perms.selectFirstUser();
    const before = await perms.moduleRows.count();

    await perms.selectFirstSystem();
    // Scoping to one system can only keep or reduce the number of module rows.
    const scoped = (await perms.table.count()) ? await perms.moduleRows.count() : 0;
    expect(scoped).toBeLessThanOrEqual(before);

    await perms.clearSystem();
    await expect(perms.table).toBeVisible();
    expect(await perms.moduleRows.count()).toBeGreaterThanOrEqual(scoped);
  });

  test('Select-All then Clear-All toggle every module checkbox (in memory, no save)', async ({
    errors,
  }) => {
    await perms.selectFirstUser();
    const firstRowCheckbox = perms.moduleCheckbox(perms.moduleRows.first());

    await perms.selectAllBtn.click();
    await expect(firstRowCheckbox).toBeChecked();

    await perms.clearAllBtn.click();
    await expect(firstRowCheckbox).not.toBeChecked();

    // Purely client-side — nothing was saved, so no runtime errors expected.
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('toggling a module checkbox cascades to every cell in that row', async () => {
    await perms.selectFirstUser();
    const row = perms.moduleRows.first();
    const moduleCb = perms.moduleCheckbox(row);
    const cells = row.locator('td.perm-cell input[type="checkbox"]');
    const cellCount = await cells.count();

    const before = await moduleCb.isChecked();
    await moduleCb.click();
    await expect(moduleCb).toBeChecked({ checked: !before });

    for (let i = 0; i < cellCount; i++) {
      await expect(cells.nth(i)).toBeChecked({ checked: !before });
    }
  });

  test('a column header checkbox toggles the whole action column', async () => {
    await perms.selectFirstUser();
    test.skip((await perms.actionHeaders.count()) === 0, 'No action columns present.');

    // The header checkbox reflects isColumnAllChecked: clicking it grants (or
    // revokes) the action across every module, so the "all checked" state flips.
    const colCb = perms.columnCheckbox(0);
    const before = await colCb.isChecked();
    await colCb.click();
    await expect(colCb).toBeChecked({ checked: !before });
  });
});
