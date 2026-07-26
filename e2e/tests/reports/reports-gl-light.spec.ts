import { test, expect } from '../../fixtures/test-fixtures';
import type { Page } from '@playwright/test';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ReportPage } from '../../pages/reports/report.page';

/**
 * Light (load + generate) coverage for the remaining GL reports. Each is driven
 * through the shared ReportPage: render, export gating, generate → results-or-
 * empty, and the clear-on-filter-change convention. Reports whose Generate is
 * gated on a lookup pick (`needsSelect`) assert the disabled state first.
 */
interface ClearStep {
  kind: 'click' | 'number' | 'date';
  selector: string;
}
interface GlReport {
  key: string;
  path: string;
  root: string;
  /** ng-select index to pick before Generate becomes enabled (undefined = none). */
  needsSelect?: number;
  clear: ClearStep;
}

const GL_REPORTS: GlReport[] = [
  { key: 'accounts-list', path: '/accounting/reports/accounts-list', root: '.alr-print-area', clear: { kind: 'click', selector: '#scopeSpecific' } },
  { key: 'beginning-balances', path: '/accounting/reports/beginning-balances', root: '.bb-print-area', clear: { kind: 'click', selector: '#chkShowZero' } },
  { key: 'cost-center-account-balances', path: '/accounting/reports/cost-center-account-balances', root: '.ccb-print-area', clear: { kind: 'click', selector: '#ccbShowEstimated' } },
  { key: 'cost-center-transactions', path: '/accounting/reports/cost-center-transactions', root: '.cct-print-area', clear: { kind: 'click', selector: 'label[for="dateRange"]' } },
  { key: 'monthly-balances', path: '/accounting/reports/monthly-balances', root: '.mb-print-area', needsSelect: 0, clear: { kind: 'number', selector: 'input[type=number]' } },
  { key: 'accounts-groups', path: '/accounting/reports/accounts-groups', root: '.agr-print-area', needsSelect: 0, clear: { kind: 'date', selector: 'input[type=date]' } },
];

async function applyClear(page: Page, step: ClearStep): Promise<void> {
  const loc = page.locator(step.selector).first();
  if (step.kind === 'click') {
    await loc.click();
  } else if (step.kind === 'number') {
    await loc.fill('2000');
    await loc.blur();
  } else {
    await loc.fill('2000-01-01');
    await loc.blur();
  }
}

test.describe('Reports — GL light coverage', () => {
  for (const cfg of GL_REPORTS) {
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

      test('generates results and clears them on filter change', async ({ page, errors }) => {
        if (cfg.needsSelect !== undefined) {
          await expect(rp.generateButton).toBeDisabled();
          const picked = await rp.selectFirstOption(rp.ngSelect(cfg.needsSelect));
          test.skip(!picked, 'No lookup options available on this tenant.');
          await expect(rp.generateButton).toBeEnabled();
        }

        await rp.generate();
        await rp.expectResultsShown();

        if ((await rp.hasExport()) && (await rp.resultRows().count()) > 0) {
          await expect(rp.exportMainButton).toBeEnabled();
        }

        // Any filter change must clear the displayed report.
        await applyClear(page, cfg.clear);
        await expect(rp.resultsRoot).toBeHidden();

        expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
      });
    });
  }
});
