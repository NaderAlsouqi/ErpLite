import { Page } from '@playwright/test';
import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { toast, waitForApi, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ENV } from '../../support/env';
import { StockVoucherPage } from '../../pages/warehouse/stock-voucher.base.page';

export interface StockSuiteOptions {
  /** When a write create succeeds we always try to clean up. `expectCreateSuccess`
   *  asserts a success toast (inbound — adds stock, always valid). For issue-type
   *  vouchers stock availability is not guaranteed, so we only assert a response
   *  came back and tolerate a business-rule warning/error. */
  expectCreateSuccess: boolean;
}

/**
 * Registers the read-only behaviour suite shared by every warehouse stock voucher,
 * plus an ALLOW_WRITES-gated create flow. `make` builds the concrete page object
 * from the Playwright page fixture.
 */
export function stockVoucherSuite(
  title: string,
  make: (page: Page) => StockVoucherPage,
  opts: StockSuiteOptions
): void {
  test.describe(`Warehouse — ${title} voucher`, () => {
    test.beforeEach(async ({ page }) => {
      await make(page).goto();
    });

    test('renders the voucher form skeleton without runtime errors', async ({ page, errors }) => {
      const vp = make(page);
      await expect(vp.card.first()).toBeVisible();
      await expect(vp.tabs).toHaveCount(2);
      await expect(vp.yearInput).toBeVisible();
      await expect(vp.serialSelect).toBeVisible();
      await expect(vp.docNoInput).toBeVisible();
      await expect(vp.grid).toBeVisible();
      await expect(vp.gridHead).toBeVisible();
      // The header + weight-total + New button are structural anchors.
      await expect(vp.gridHeadCells.first()).toBeVisible();
      await expect(vp.totalWeightInput).toBeVisible();
      await expect(vp.newBtn).toBeVisible();
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('switches to the vouchers-list tab and back to the form', async ({ page }) => {
      const vp = make(page);
      await vp.openList();
      // The list table exposes a header row with several columns.
      const cols = await vp.listHeaderCells.count();
      expect(cols).toBeGreaterThanOrEqual(5);
      await vp.openForm();
      await expect(vp.grid).toBeVisible();
    });

    test('selecting a serial type auto-fills the next DocNo', async ({ page }) => {
      const vp = make(page);
      if ((await vp.serialOptionCount()) === 0) {
        test.info().annotations.push({ type: 'skip', description: 'No serial types configured.' });
        return;
      }
      await waitForApi(page, `${vp.cfg.api}/NextNo`, async () => {
        await vp.selectFirstSerial();
      });
      await expect(vp.docNoInput).toHaveValue(/.+/, { timeout: ENV.slowExpect });
    });

    test('adding a row grows the grid and the total-weight recomputes', async ({ page }) => {
      const vp = make(page);
      const before = await vp.gridRows.count();
      await vp.setWeight(0, 5);
      await vp.addRow();
      expect(await vp.gridRows.count()).toBe(before + 1);
      await vp.setWeight(before, 3); // the newly-added last row
      // 5 + 3 = 8, formatted number:'1.0-3'.
      await expect(vp.totalWeightInput).toHaveValue(/^8(\.0+)?$/, { timeout: ENV.slowExpect });
    });

    test('cost columns and the grand-total agree with the ViewCost permission', async ({ page }) => {
      const vp = make(page);
      if (await vp.hasCostColumns()) {
        await expect(vp.grandTotalInput).toBeVisible();
      } else {
        await expect(vp.grandTotalInput).toHaveCount(0);
      }
    });

    test('removing the only row keeps at least one empty row', async ({ page }) => {
      const vp = make(page);
      // Collapse to a single row first (component re-adds one when the last is removed).
      while ((await vp.gridRows.count()) > 1) {
        await vp.removeRow(0);
      }
      await vp.removeRow(0);
      await expect(vp.gridRows).toHaveCount(1);
    });

    test('saving an empty voucher is blocked by validation', async ({ page }) => {
      const vp = make(page);
      if ((await vp.saveBtn.count()) === 0) {
        test.info().annotations.push({ type: 'skip', description: `No ${vp.cfg.perm}.Create permission.` });
        return;
      }
      await vp.saveBtn.click();
      await expect(toast(page, 'warning').first()).toBeVisible({ timeout: ENV.slowExpect });
      // A failed validation never navigates away.
      expect(page.url()).toContain(vp.cfg.path);
    });

    test('opens and closes the "bring items" modal', async ({ page }) => {
      const vp = make(page);
      await vp.bringBtn.click();
      const dialog = page.locator('.inb-overlay .inb-dialog');
      await expect(dialog).toBeVisible();
      // The modal always offers at least a category picker.
      await expect(dialog.locator('ng-select').first()).toBeVisible();
      await page.locator('.inb-overlay button.btn-secondary').first().click();
      await expect(vp.overlay).toBeHidden();
    });

    test('GL-entries and Delete are disabled on a brand-new voucher', async ({ page }) => {
      const vp = make(page);
      await expect(vp.glBtn).toBeDisabled();
      if ((await vp.deleteBtn.count()) > 0) {
        await expect(vp.deleteBtn).toBeDisabled();
      }
    });

    test('list filter narrows to an empty state then restores on clear', async ({ page }) => {
      const vp = make(page);
      await vp.openList();
      const nonsense = 'E2E_NOMATCH_' + Date.now();
      await vp.listSearch.fill(nonsense);
      // No voucher matches → the empty-state row appears and the count reads "0 / N".
      await expect(page.locator('.voucher-list tbody tr td[colspan]')).toBeVisible();
      const filtered = await vp.listCount.textContent();
      expect((filtered ?? '').replace(/\s+/g, '')).toMatch(/^0\//);
      await vp.listSearch.fill('');
      // Cleared → numerator equals denominator again (holds even for an empty tenant).
      const restored = (await vp.listCount.textContent()) ?? '';
      const m = restored.match(/(\d+)\s*\/\s*(\d+)/);
      expect(m, `unexpected count text: "${restored}"`).not.toBeNull();
      expect(m![1]).toBe(m![2]);
    });

    // ── item-lookup behaviour (per-line store vouchers only) ─────────────────
    if (opts) {
      test('picking an item populates its unit', async ({ page }) => {
        const vp = make(page);
        if (vp.cfg.lineStoreIndex == null) {
          test.info().annotations.push({ type: 'skip', description: 'Store lives on the header (transfer).' });
          return;
        }
        if ((await vp.optionCount(vp.rowItemSelect(0))) === 0) {
          test.info().annotations.push({ type: 'skip', description: 'No items available.' });
          return;
        }
        await vp.pickOption(vp.rowItemSelect(0), 0);
        await expect(vp.hasValue(vp.rowItemSelect(0))).toBeVisible();
        await expect(vp.hasValue(vp.rowUnitSelect(0))).toBeVisible({ timeout: ENV.slowExpect });
      });

      test('line total recomputes from quantity × cost', async ({ page }) => {
        const vp = make(page);
        if (vp.cfg.lineStoreIndex == null || !vp.cfg.costEditable) {
          test.info().annotations.push({ type: 'skip', description: 'Cost is not editable on this voucher.' });
          return;
        }
        if (!(await vp.hasCostColumns())) {
          test.info().annotations.push({ type: 'skip', description: `No ${vp.cfg.perm}.ViewCost — cost columns hidden.` });
          return;
        }
        if ((await vp.optionCount(vp.rowItemSelect(0))) === 0) {
          test.info().annotations.push({ type: 'skip', description: 'No items available.' });
          return;
        }
        await vp.pickOption(vp.rowItemSelect(0), 0);
        await expect(vp.hasValue(vp.rowUnitSelect(0))).toBeVisible({ timeout: ENV.slowExpect });
        await vp.setQty(0, 2);
        await vp.setCost(0, 3);
        await expect
          .poll(async () => vp.numberValueOf(vp.rowTotalInput(0)), { timeout: ENV.slowExpect })
          .toBe(6);
        await expect.poll(async () => vp.numberValueOf(vp.grandTotalInput)).toBe(6);
      });
    }

    // ── write flow (opt-in) ──────────────────────────────────────────────────
    test('creates a voucher and cleans it up', async ({ page }) => {
      requireWrites();
      const vp = make(page);
      if (vp.cfg.lineStoreIndex == null) {
        test.info().annotations.push({ type: 'skip', description: 'Transfer create is covered in its own spec.' });
        return;
      }
      if ((await vp.saveBtn.count()) === 0) {
        test.info().annotations.push({ type: 'skip', description: `No ${vp.cfg.perm}.Create permission.` });
        return;
      }
      if (!(await vp.selectFirstSerial())) {
        test.info().annotations.push({ type: 'skip', description: 'No serial types configured.' });
        return;
      }
      await expect(vp.docNoInput).toHaveValue(/.+/, { timeout: ENV.slowExpect });

      if (!(await vp.pickOption(vp.rowItemSelect(0), 0))) return;
      await expect(vp.hasValue(vp.rowUnitSelect(0))).toBeVisible({ timeout: ENV.slowExpect });
      const store = vp.rowStoreSelect(0);
      if (store && !(await vp.pickOption(store, 0))) return;
      await vp.setQty(0, 1);
      if (vp.cfg.costEditable && (await vp.hasCostColumns())) await vp.setCost(0, 1);

      const res = await waitForApi(page, `${vp.cfg.api}/Save`, () => vp.saveBtn.click());

      if (opts.expectCreateSuccess) {
        await expect(toast(page, 'success').first()).toBeVisible({ timeout: ENV.slowExpect });
      } else {
        // Issue-type voucher: a response returned (success or a stock warning/error).
        expect(res.status()).toBeGreaterThanOrEqual(200);
        await expect(toast(page).first()).toBeVisible({ timeout: ENV.slowExpect });
      }

      // Best-effort cleanup: only when the save actually persisted.
      if (res.ok()) {
        try {
          await waitForSpinnersGone(page);
          if ((await vp.deleteBtn.count()) > 0 && (await vp.deleteBtn.isEnabled())) {
            await waitForApi(page, `${vp.cfg.api}/Delete`, async () => {
              await vp.deleteBtn.click();
              await page.locator('.btn-confirm').click();
            });
          }
        } catch {
          /* leave cleanup best-effort — never fail the test on teardown */
        }
      }
    });
  });
}
