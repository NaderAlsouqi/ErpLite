import { test, expect, requireWrites, requireCredentials } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ENV } from '../../support/env';
import { PermissionsAdminPage } from '../../pages/permissions/permissions-admin.page';

const MANAGE = 'Admin.ManagePermissions';

interface AdminUser {
  User_ID: number;
  Login_Name: string;
  FullName: string;
}

/**
 * Grant/revoke persistence for the permissions matrix. Every test here mutates a
 * real user's grants on a shared tenant, so all are gated behind requireWrites()
 * (ALLOW_WRITES=true). Each flow is net-zero: it records a cell's state, flips it,
 * Saves, then flips it back and Saves again — leaving the account exactly as found.
 *
 * Per app behavior, a saved grant only takes effect for the target user after they
 * re-login (JWT), so we assert the toggle/UI state + a successful /Permissions/set
 * response and a success toast — never a live permission effect.
 */
test.describe('Permissions admin — grant/revoke persistence [writes]', () => {
  let perms: PermissionsAdminPage;
  let target: AdminUser | null;

  test.beforeEach(async ({ page, api }) => {
    requireWrites();
    requireCredentials();
    const granted = await api.permissions();
    test.skip(!granted.includes(MANAGE), 'Requires Admin.ManagePermissions.');

    const users = await api.getJson<AdminUser[]>('/Permissions/users');
    const me = (ENV.username || '').toLowerCase();
    // Prefer a user other than the test account so we never mutate our own grants.
    target =
      users.find((u) => (u.Login_Name || '').toLowerCase() !== me) ?? users[0] ?? null;

    perms = new PermissionsAdminPage(page);
    await perms.goto();
  });

  test('toggling a grant and saving persists, then restores the original state', async ({
    errors,
  }) => {
    test.skip(!target, 'No selectable users on this tenant.');

    await perms.selectUserByLogin(target!.Login_Name);

    const cell = perms.firstCellCheckbox;
    await expect(cell).toBeVisible();
    const original = await cell.isChecked();

    await test.step('flip one grant and save', async () => {
      await cell.click();
      await expect(cell).toBeChecked({ checked: !original });

      const res = await perms.save();
      expect(res.ok(), `set returned ${res.status()}`).toBeTruthy();
      await perms.expectToast('success');
      // Toggle state survives the round-trip (grant applies to the user on re-login).
      await expect(cell).toBeChecked({ checked: !original });
    });

    await test.step('restore the original grant state', async () => {
      await cell.click();
      await expect(cell).toBeChecked({ checked: original });

      const res = await perms.save();
      expect(res.ok(), `restore set returned ${res.status()}`).toBeTruthy();
      await expect(cell).toBeChecked({ checked: original });
    });

    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('Save posts the full granted set to /Permissions/set and succeeds', async () => {
    test.skip(!target, 'No selectable users on this tenant.');

    await perms.selectUserByLogin(target!.Login_Name);
    await expect(perms.saveBtn).toBeEnabled();

    // Save without changes is a valid no-op persist of the current selection.
    const res = await perms.save();
    expect(res.ok(), `set returned ${res.status()}`).toBeTruthy();
    expect(res.request().method()).toBe('POST');
    await perms.expectToast('success');
  });
});
