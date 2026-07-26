import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { FotaraSettingsPage } from '../../pages/misc/fotara-settings.page';

/**
 * Billing System Linkage / ربط نظام الفوترة (/accounting/system/fotara-settings).
 * Comf.View-guarded route (suite skips on redirect), Comf.Edit-gated Save. The
 * write test re-saves the CURRENT values unchanged and only runs when the form
 * is already fully configured, so it never introduces bogus credentials.
 */
test.describe('Fotara Settings (/accounting/system/fotara-settings)', () => {
  let fs: FotaraSettingsPage;

  test.beforeEach(async ({ page }) => {
    fs = new FotaraSettingsPage(page);
    const rendered = await fs.open();
    test.skip(!rendered, 'account lacks Comf.View (guard redirected to login)');
  });

  test('renders the linkage form', async ({ errors }) => {
    await expect(fs.headerTitle()).toBeVisible();
    await expect(fs.card).toBeVisible();
    await expect(fs.companyNameInput).toBeVisible();
    await expect(fs.taxNumberInput).toBeVisible();
    await expect(fs.clientIdInput).toBeVisible();
    await expect(fs.secretInput).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('the secret key is masked and can be toggled visible', async () => {
    await expect(fs.secretInput).toHaveAttribute('type', 'password');
    await fs.secretToggle.click();
    await expect(fs.secretInput).toHaveAttribute('type', 'text');
    await fs.secretToggle.click();
    await expect(fs.secretInput).toHaveAttribute('type', 'password');
  });

  test('loads the current settings from the API', async ({ page }) => {
    const res = await waitForApi(page, '/FotaraData/Get', async () => {
      await page.reload();
    });
    expect(res.status()).toBeLessThan(400);
    await expect(fs.companyNameInput).toBeVisible();
  });

  test('saving with an empty tax number is rejected client-side', async ({ page }) => {
    if (!(await fs.canSave())) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks Comf.Edit' });
      return;
    }
    await fs.taxNumberInput.fill('');
    await fs.saveBtn.click();
    await expect(page.locator('.toast-warning').first()).toBeVisible();
  });

  test('re-saves the current settings unchanged when configured [write]', async ({ page }) => {
    requireWrites();
    if (!(await fs.canSave())) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks Comf.Edit' });
      return;
    }
    if (!(await fs.isConfigured())) {
      test.info().annotations.push({ type: 'skip', description: 'fotara not configured in this tenant' });
      return;
    }
    const res = await waitForApi(page, '/FotaraData/Save', () => fs.saveBtn.click());
    expect(res.status()).toBeLessThan(400);
    await expect(page.locator('.toast-success').first()).toBeVisible();
  });
});
