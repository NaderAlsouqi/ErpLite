import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { EditAccountNamePage } from '../../pages/accounting/edit-account-name.page';

test.describe('Edit Account Name (/accounting/gl/edit-account-name)', () => {
  let ean: EditAccountNamePage;

  test.beforeEach(async ({ page }) => {
    ean = new EditAccountNamePage(page);
    await ean.goto();
  });

  test('renders the account table and the empty detail panel', async ({ errors }) => {
    await expect(ean.headerTitle()).toBeVisible();
    await expect(ean.noSelectionPrompt).toBeVisible();
    await expect(ean.table).toBeVisible();
    // AccountNo / Arabic / English / Level / Stopped.
    await expect(ean.headers).toHaveCount(5);
    await expect(ean.paginator).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('search filters the table and clearing restores it', async () => {
    await ean.search('zzz_no_match_' + Date.now());
    await expect(ean.emptyStateRow).toBeVisible();
    await ean.clearSearch();
    await expect(ean.emptyStateRow).toHaveCount(0);
  });

  test('selecting a row loads it into the detail form', async () => {
    test.skip((await ean.dataRows.count()) === 0, 'No accounts to select.');
    await ean.selectFirstRow();
    await expect(ean.noSelectionPrompt).toHaveCount(0);
    await expect(ean.noInput).toBeVisible();
    await expect(ean.noInput).not.toHaveValue('');
    await expect(ean.arabicNameInput).toBeVisible();
    await expect(ean.englishNameInput).toBeVisible();
    // Nothing changed yet → Discard is disabled.
    await expect(ean.discardBtn).toBeDisabled();
  });

  test('editing a name enables Discard and reverting disables it again', async () => {
    test.skip((await ean.dataRows.count()) === 0, 'No accounts to select.');
    await ean.selectFirstRow();
    const original = await ean.arabicNameInput.inputValue();
    await ean.arabicNameInput.fill(original + ' _edit');
    await expect(ean.discardBtn).toBeEnabled();
    await ean.discardBtn.click();
    await expect(ean.arabicNameInput).toHaveValue(original);
    await expect(ean.discardBtn).toBeDisabled();
  });

  test('renaming an account persists and can be restored', async ({ page }) => {
    requireWrites();
    test.skip((await ean.dataRows.count()) === 0, 'No accounts to select.');
    await ean.selectFirstRow();
    test.skip((await ean.saveBtn.count()) === 0, 'Account lacks Accf.Edit.');

    const original = await ean.englishNameInput.inputValue();
    const edited = (original || 'ACC') + ' E2E';

    await test.step('save the edited name', async () => {
      await ean.englishNameInput.fill(edited);
      await expect(ean.saveBtn).toBeEnabled();
      const res = await waitForApi(page, 'Accf/RenameBatch', () => ean.saveBtn.click());
      expect(res.ok(), `RenameBatch failed: ${res.status()}`).toBeTruthy();
      await expect(page.locator('.toast-success').first()).toBeVisible();
    });

    await test.step('restore the original name (cleanup)', async () => {
      await ean.englishNameInput.fill(original);
      await expect(ean.saveBtn).toBeEnabled();
      const res = await waitForApi(page, 'Accf/RenameBatch', () => ean.saveBtn.click());
      expect(res.ok(), `RenameBatch restore failed: ${res.status()}`).toBeTruthy();
      await expect(page.locator('.toast-success').first()).toBeVisible();
    });
  });
});
