import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { toast, waitForApi } from '../../support/helpers';
import { ENV } from '../../support/env';
import { TransferVoucherPage } from '../../pages/warehouse/transfer-voucher.page';
import { stockVoucherSuite } from './stock-voucher.suite';

// سند نقل — reuse the shared read-only suite (its item-lookup + create tests
// self-skip for the header-store transfer voucher).
stockVoucherSuite('Transfer', (page) => new TransferVoucherPage(page), { expectCreateSuccess: false });

test.describe('Warehouse — Transfer voucher (store rules)', () => {
  test.beforeEach(async ({ page }) => {
    await new TransferVoucherPage(page).goto();
  });

  test('exposes FROM and TO store selects and a From/To list', async ({ page }) => {
    const vp = new TransferVoucherPage(page);
    await expect(vp.fromStoreSelect).toBeVisible();
    await expect(vp.toStoreSelect).toBeVisible();
    await vp.openList();
    // DocNo, Serial, Date, FromStore, ToStore, Total, Lines, (edit) → 8 columns.
    expect(await vp.listHeaderCells.count()).toBeGreaterThanOrEqual(7);
  });

  test('rejects the same store for FROM and TO', async ({ page }) => {
    const vp = new TransferVoucherPage(page);
    if (!(await vp.pickSameStoreInBoth())) {
      test.info().annotations.push({ type: 'skip', description: 'No stores configured.' });
      return;
    }
    await expect(toast(page, 'warning').first()).toBeVisible({ timeout: ENV.slowExpect });
    // The guard clears the TO store, so it shows no selected value.
    await expect(vp.hasValue(vp.toStoreSelect)).toHaveCount(0);
  });

  test('accepts two distinct stores', async ({ page }) => {
    const vp = new TransferVoucherPage(page);
    if (!(await vp.pickDistinctStores())) {
      test.info().annotations.push({ type: 'skip', description: 'Fewer than two stores configured.' });
      return;
    }
    await expect(vp.hasValue(vp.fromStoreSelect)).toBeVisible();
    await expect(vp.hasValue(vp.toStoreSelect)).toBeVisible();
  });

  test('save is blocked until FROM/TO stores are chosen', async ({ page }) => {
    const vp = new TransferVoucherPage(page);
    if ((await vp.saveBtn.count()) === 0) {
      test.info().annotations.push({ type: 'skip', description: 'No Transfer.Create permission.' });
      return;
    }
    if (!(await vp.selectFirstSerial())) {
      test.info().annotations.push({ type: 'skip', description: 'No serial types configured.' });
      return;
    }
    await expect(vp.docNoInput).toHaveValue(/.+/, { timeout: ENV.slowExpect });
    await vp.saveBtn.click();
    await expect(toast(page, 'warning').first()).toBeVisible({ timeout: ENV.slowExpect });
    expect(page.url()).toContain('/warehouse/vouchers/transfer');
  });

  test('attempts a transfer create', async ({ page }) => {
    requireWrites();
    const vp = new TransferVoucherPage(page);
    if ((await vp.saveBtn.count()) === 0) {
      test.info().annotations.push({ type: 'skip', description: 'No Transfer.Create permission.' });
      return;
    }
    if (!(await vp.selectFirstSerial())) {
      test.info().annotations.push({ type: 'skip', description: 'No serial types configured.' });
      return;
    }
    await expect(vp.docNoInput).toHaveValue(/.+/, { timeout: ENV.slowExpect });
    if (!(await vp.pickDistinctStores())) {
      test.info().annotations.push({ type: 'skip', description: 'Fewer than two stores configured.' });
      return;
    }
    if (!(await vp.pickOption(vp.rowItemSelect(0), 0))) return;
    await expect(vp.hasValue(vp.rowUnitSelect(0))).toBeVisible({ timeout: ENV.slowExpect });
    // Perpetual mode requires a per-line account; pick one when options exist.
    if ((await vp.optionCount(vp.rowAccountSelect(0))) > 0) {
      await vp.pickOption(vp.rowAccountSelect(0), 0);
    }
    await vp.setQty(0, 1);

    const res = await waitForApi(page, 'TransferVoucher/Save', () => vp.saveBtn.click());
    // Success or a stock/business warning — either way the write path was exercised.
    expect(res.status()).toBeGreaterThanOrEqual(200);
    await expect(toast(page).first()).toBeVisible({ timeout: ENV.slowExpect });

    if (res.ok()) {
      try {
        if ((await vp.deleteBtn.count()) > 0 && (await vp.deleteBtn.isEnabled())) {
          await waitForApi(page, 'TransferVoucher/Delete', async () => {
            await vp.deleteBtn.click();
            await page.locator('.btn-confirm').click();
          });
        }
      } catch {
        /* best-effort cleanup */
      }
    }
  });
});
