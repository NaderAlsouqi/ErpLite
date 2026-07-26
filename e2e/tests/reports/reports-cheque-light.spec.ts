import { test, expect } from '../../fixtures/test-fixtures';
import { toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ReportPage } from '../../pages/reports/report.page';

/**
 * Light coverage for the cheque / voucher listing reports. The first group
 * generates straight from default filters; the last two require a selection
 * (a beneficiary tag, a specific cheque) before results appear.
 */

interface ChequeReport {
  key: string;
  path: string;
  root: string;
}

// Generate works from the default date range for these three.
const DEFAULT_GEN: ChequeReport[] = [
  { key: 'inward-cheques', path: '/accounting/reports/inward-cheques', root: '.iwc-print-area' },
  { key: 'outward-cheques', path: '/accounting/reports/outward-cheques', root: '.owc-print-area' },
  { key: 'payment-vouchers', path: '/accounting/reports/payment-vouchers', root: '.pv-print-area' },
];

test.describe('Reports — Cheque/Voucher listings (light)', () => {
  for (const cfg of DEFAULT_GEN) {
    test.describe(cfg.key, () => {
      let rp: ReportPage;

      test.beforeEach(async ({ page }) => {
        rp = new ReportPage(page, cfg.path, cfg.root);
        await rp.goto();
      });

      test('renders with the export control disabled', async ({ errors }) => {
        await expect(rp.generateButton).toBeVisible();
        if (await rp.hasExport()) {
          await expect(rp.exportMainButton).toBeDisabled();
        }
        expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
      });

      test('generates a listing and clears it on filter change', async ({ errors }) => {
        await rp.generate();
        await rp.expectResultsShown();

        if ((await rp.hasExport()) && (await rp.resultRows().count()) > 0) {
          await expect(rp.exportMainButton).toBeEnabled();
        }

        // Change the "from" date → (change)="onFilterChange()" clears results.
        const dateFrom = rp.card.locator('input[type=date]').first();
        await dateFrom.fill('2000-01-01');
        await dateFrom.blur();
        await expect(rp.resultsRoot).toBeHidden();

        expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
      });
    });
  }

  test.describe('cheques-to-beneficiary', () => {
    let rp: ReportPage;

    test.beforeEach(async ({ page }) => {
      rp = new ReportPage(page, '/accounting/reports/cheques-to-beneficiary', '.cb-print-area');
      await rp.goto();
    });

    test('warns when generating without a beneficiary', async ({ page }) => {
      await rp.generateButton.click();
      await expect(toast(page, 'warning').first()).toBeVisible();
      await expect(rp.resultsRoot).toBeHidden();
    });

    test('generating for a beneficiary renders results and clears on change', async ({
      page,
      errors,
    }) => {
      // The beneficiary control accepts a typed tag (addTag) — deterministic.
      const ben = rp.ngSelect(0);
      await ben.click();
      await ben.locator('input[type=text]').fill('E2E_' + Date.now());
      await page.keyboard.press('Enter');

      await rp.generate();
      await rp.expectResultsShown(); // empty-state alert for a synthetic name

      const dateFrom = rp.card.locator('input[type=date]').first();
      await dateFrom.fill('2000-01-01');
      await dateFrom.blur();
      await expect(rp.resultsRoot).toBeHidden();

      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });
  });

  test.describe('incoming-cheque-movement', () => {
    let rp: ReportPage;

    test.beforeEach(async ({ page }) => {
      rp = new ReportPage(page, '/accounting/reports/incoming-cheque-movement', '.icm-print-area');
      await rp.goto();
    });

    test('renders the serial + cheque pickers', async ({ errors }) => {
      await expect(rp.ngSelect(0)).toBeVisible();
      await expect(rp.ngSelect(1)).toBeVisible();
      await expect(rp.generateButton).toBeVisible();
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('warns when generating without a selected cheque', async ({ page }) => {
      await rp.generateButton.click();
      await expect(toast(page, 'warning').first()).toBeVisible();
      await expect(rp.resultsRoot).toBeHidden();
    });

    test('selecting a cheque renders its movement and clears on change', async ({ errors }) => {
      const picked = await rp.selectFirstOption(rp.ngSelect(1));
      test.skip(!picked, 'No incoming cheques available on this tenant.');

      await rp.generate();
      await rp.expectResultsShown();

      // Clearing the chosen cheque triggers onFilterChange → results disappear.
      await rp.ngSelect(1).locator('.ng-clear-wrapper').click();
      await expect(rp.resultsRoot).toBeHidden();

      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });
  });
});
