import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { CompanyInfoPage } from '../../pages/misc/company-info.page';

/**
 * Company Information / معلومات الشركة (/accounting/system/company-info).
 * Route is Comf.View-guarded; if the account lacks it the guard redirects to
 * login and the whole suite skips. The Save button is separately Comf.Edit-
 * gated. The write test re-saves the CURRENT values unchanged (idempotent), so
 * it never mutates meaningful state on the shared tenant.
 */
test.describe('Company Info (/accounting/system/company-info)', () => {
  let ci: CompanyInfoPage;

  test.beforeEach(async ({ page }) => {
    ci = new CompanyInfoPage(page);
    const rendered = await ci.open();
    test.skip(!rendered, 'account lacks Comf.View (guard redirected to login)');
  });

  test('renders the company-info form', async ({ errors }) => {
    await expect(ci.headerTitle()).toBeVisible();
    await expect(ci.card).toBeVisible();
    await expect(ci.nameInput).toBeVisible();
    await expect(ci.openingDate).toBeVisible();
    await expect(ci.decimalsInput).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('loads the current company info from the API', async ({ page }) => {
    const res = await waitForApi(page, '/Comf/GetCompanyInfo', async () => {
      await page.reload();
    });
    expect(res.status()).toBeLessThan(400);
    await expect(ci.nameInput).toBeVisible();
  });

  test('save button visibility reflects the Comf.Edit permission', async () => {
    if (await ci.canSave()) {
      await expect(ci.saveBtn).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: 'account lacks Comf.Edit' });
    }
  });

  test('saving with an empty company name is rejected client-side', async ({ page }) => {
    if (!(await ci.canSave())) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks Comf.Edit' });
      return;
    }
    await ci.nameInput.fill('');
    await ci.saveBtn.click();
    await expect(page.locator('.toast-warning').first()).toBeVisible();
  });

  test('re-saves the current company info unchanged [write]', async ({ page }) => {
    requireWrites();
    if (!(await ci.canSave())) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks Comf.Edit' });
      return;
    }
    // No field is modified — this round-trips the loaded values.
    const res = await waitForApi(page, '/Comf/SaveCompanyInfo', () => ci.saveBtn.click());
    expect(res.status()).toBeLessThan(400);
    await expect(page.locator('.toast-success').first()).toBeVisible();
  });
});
