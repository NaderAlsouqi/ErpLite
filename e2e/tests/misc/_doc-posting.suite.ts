import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { DocPostingPage, DocPostingConfig } from '../../pages/misc/doc-posting.page';

/**
 * Shared scenario suite for the two structurally-identical GL (un)posting
 * screens: document-posting and document-unposting. Read-only coverage of
 * render / filter-mode switching / fetch. The actual post/unpost is a heavy,
 * hard-to-reverse mutation on a shared tenant, so it is gated by requireWrites
 * and only fires when writes are explicitly enabled AND rows are present.
 */
export function registerDocPostingSuite(config: DocPostingConfig): void {
  test.describe(`${config.title} (${config.path})`, () => {
    let dp: DocPostingPage;

    test.beforeEach(async ({ page }) => {
      dp = new DocPostingPage(page, config);
      await dp.goto();
    });

    test('renders the filters and the fetch button', async ({ errors }) => {
      await expect(dp.headerTitle()).toBeVisible();
      await expect(dp.fetchBtn).toBeVisible();
      await expect(dp.yearInput).toBeVisible();
      await expect(dp.docTypeSelect).toBeVisible();
      await expect(dp.serialSelect).toBeVisible();
      await expect(dp.filterByDate).toBeChecked();
      // No result table until a fetch runs.
      await expect(dp.resultTable).toHaveCount(0);
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('switching the filter mode swaps the date and doc-number inputs', async () => {
      await expect(dp.dateFrom).toBeVisible();
      await dp.selectDocNumMode();
      await expect(dp.docNumFrom).toBeVisible();
      await expect(dp.dateFrom).toHaveCount(0);
      await dp.selectDateMode();
      await expect(dp.dateFrom).toBeVisible();
      await expect(dp.docNumFrom).toHaveCount(0);
    });

    test('fetching renders the 4-column results table with a document count', async ({ page }) => {
      // The doc-type defaults to the first loaded voucher type; skip if none loaded.
      if ((await dp.docTypeSelect.locator('.ng-value').count()) === 0) {
        test.info().annotations.push({ type: 'skip', description: 'no voucher types available' });
        return;
      }
      const res = await waitForApi(page, config.fetchApi, () => dp.fetchBtn.click());
      expect(res.status()).toBeLessThan(400);
      await expect(dp.resultTable).toBeVisible();
      await expect(dp.headers).toHaveCount(4);
      await expect(dp.docCount).toBeVisible();
    });

    test('the action button disabled-state matches the fetched row count', async ({ page }) => {
      if ((await dp.docTypeSelect.locator('.ng-value').count()) === 0) {
        test.info().annotations.push({ type: 'skip', description: 'no voucher types available' });
        return;
      }
      await waitForApi(page, config.fetchApi, () => dp.fetchBtn.click());
      await expect(dp.actionBtn).toBeVisible();
      if (await dp.emptyRow.isVisible()) {
        await expect(dp.actionBtn).toBeDisabled();
      } else {
        await expect(dp.actionBtn).toBeEnabled();
      }
    });

    test('posts the fetched documents [write]', async ({ page }) => {
      requireWrites();
      if ((await dp.docTypeSelect.locator('.ng-value').count()) === 0) {
        test.info().annotations.push({ type: 'skip', description: 'no voucher types available' });
        return;
      }
      await waitForApi(page, config.fetchApi, () => dp.fetchBtn.click());
      if (await dp.emptyRow.isVisible()) {
        test.info().annotations.push({ type: 'skip', description: 'no documents to action' });
        return;
      }
      const res = await waitForApi(page, config.actionApi, () => dp.actionBtn.click());
      expect(res.status()).toBeLessThan(400);
      await expect(page.locator('.toast-success').first()).toBeVisible();
    });
  });
}
