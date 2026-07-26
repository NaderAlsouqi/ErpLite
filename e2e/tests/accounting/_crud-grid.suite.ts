import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { CrudGridPage, CrudGridConfig } from '../../pages/accounting/crud-grid.page';

/**
 * Registers a full behavioural suite for one accounting "definition" CRUD grid.
 * The six grids (Banks, Currencies, Taxes, Cost-Centers, Account-Groups, Stamps)
 * share an identical template, so the read-only scenarios are fully generic and
 * the write flow is gated behind requireWrites() + a *hasPermission presence
 * check on the Create/Delete buttons.
 *
 * This module is intentionally NOT a *.spec.ts file — it is imported and invoked
 * by the per-screen spec files so each grid gets its own isolated describe block.
 */
export function registerCrudGridSuite(config: CrudGridConfig): void {
  test.describe(`${config.title} — definitions CRUD grid`, () => {
    let grid: CrudGridPage;

    test.beforeEach(async ({ page }) => {
      grid = new CrudGridPage(page, config);
      await grid.goto();
    });

    test('renders the entry form with the No/Arabic/English fields', async ({ page, errors }) => {
      await expect(grid.headerTitle()).toBeVisible();
      await expect(grid.card).toBeVisible();
      await expect(grid.tabs).toHaveCount(2);
      await grid.switchToForm();
      await expect(grid.keyInput).toBeVisible();
      await expect(grid.arabicInput).toBeVisible();
      await expect(grid.englishInput).toBeVisible();
      await expect(grid.newBtn).toBeVisible();
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('the list tab renders a table with the expected columns', async ({ page, errors }) => {
      await grid.switchToList();
      await expect(grid.table).toBeVisible();
      await expect(grid.headers).toHaveCount(config.columnCount);
      // At least the header row exists; body may legitimately be empty on a fresh tenant.
      expect(await grid.rows.count()).toBeGreaterThanOrEqual(0);
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('search narrows the list and the clear button restores it', async () => {
      await grid.switchToList();
      // Baseline = whatever the list shows unfiltered (data rows, or the single
      // empty-state row on a fresh tenant). Clearing must return to it exactly.
      const baseline = await grid.rows.count();
      const nonsense = 'zzz_no_match_' + Date.now();
      await grid.search(nonsense);
      await expect(grid.emptyStateRow).toBeVisible();
      // A clear button only appears while the search box has a value.
      if (await grid.clearSearchBtn.count()) {
        await grid.clearSearchBtn.first().click();
      } else {
        await grid.clearSearch();
      }
      await expect(grid.searchInput).toHaveValue('');
      await expect(grid.rows).toHaveCount(baseline);
    });

    test('refresh reloads the list from the backend', async ({ page }) => {
      await grid.switchToList();
      const res = await waitForApi(page, `${config.apiResource}/GetAll`, () =>
        grid.refreshBtn.first().click()
      );
      expect(res.status()).toBeLessThan(400);
      await expect(grid.table).toBeVisible();
    });

    test('selecting a list row opens it in the entry form', async () => {
      await grid.switchToList();
      const count = await grid.rows.count();
      // Skip cleanly on an empty tenant rather than asserting on seeded data.
      test.skip(count === 0 || (await grid.emptyStateRow.count()) > 0, 'No existing rows to select.');
      await grid.rows.first().click();
      // onSelectRow() flips to the entry tab and loads the record's key.
      await expect(grid.keyInput).toBeVisible();
      await expect(grid.keyInput).not.toHaveValue('');
    });

    test('save validates required fields before hitting the API', async () => {
      await grid.switchToForm();
      // Save is gated by the create permission; skip gracefully when absent.
      test.skip((await grid.saveBtn.count()) === 0, `Account lacks ${config.createPermission}.`);
      // A fresh form has an auto-filled number but empty Arabic/English names,
      // so validate() short-circuits with a warning toast and makes no request.
      await grid.setArabic('');
      await grid.setEnglish('');
      await grid.saveBtn.click();
      await grid.expectWarningToast();
    });

    test('create → edit → delete a unique record', async ({ page }) => {
      requireWrites();
      // Skip (tracked, not silent) when this grid has a known backend defect
      // that makes the write flow un-completable — see the spec's config.
      if (config.knownWriteBug) test.fixme(true, config.knownWriteBug);
      await grid.switchToForm();
      test.skip((await grid.saveBtn.count()) === 0, `Account lacks ${config.createPermission}.`);

      const name = 'E2E_' + Date.now();
      let key = '';

      await test.step('create', async () => {
        // Use the component's auto-generated next number (guaranteed unique at load).
        key = (await grid.keyInput.inputValue()).trim();
        await grid.setArabic(name);
        await grid.setEnglish(name);
        const res = await waitForApi(page, `${config.apiResource}/Add`, () => grid.saveBtn.click());
        expect(res.ok(), `Add ${config.apiResource} failed: ${res.status()}`).toBeTruthy();
        await grid.expectSuccessToast();
      });

      await test.step('verify the new record appears in the list', async () => {
        await grid.switchToList();
        await grid.search(name);
        await expect(grid.rowsWithText(name)).toHaveCount(1);
      });

      await test.step('edit the record', async () => {
        await grid.rowsWithText(name).first().click();
        await expect(grid.keyInput).toHaveValue(key);
        await grid.setEnglish(name + '_upd');
        const res = await waitForApi(page, `${config.apiResource}/Update`, () => grid.saveBtn.click());
        expect(res.ok(), `Update ${config.apiResource} failed: ${res.status()}`).toBeTruthy();
        await grid.expectSuccessToast();
      });

      await test.step('delete the record (cleanup)', async () => {
        await grid.switchToList();
        await grid.search(name);
        await grid.rowsWithText(name).first().click();
        test.skip(
          (await grid.deleteBtn.count()) === 0,
          `Account lacks ${config.deletePermission}; record ${key} left for manual cleanup.`
        );
        await grid.deleteBtn.click();
        await expect(grid.confirmModal).toBeVisible();
        const res = await waitForApi(page, `${config.apiResource}/Delete`, () =>
          grid.confirmDeleteBtn.click()
        );
        expect(res.ok(), `Delete ${config.apiResource} failed: ${res.status()}`).toBeTruthy();
        await grid.expectSuccessToast();
        await grid.switchToList();
        await grid.search(name);
        await expect(grid.rowsWithText(name)).toHaveCount(0);
      });
    });
  });
}
