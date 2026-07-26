import { Page, Locator, expect } from '@playwright/test';
import { StockVoucherPage } from './stock-voucher.base.page';

/**
 * سند نقل — Inter-store Transfer voucher. Differs from the other three: the store
 * lives on the header as two selects (FROM / TO) that must differ; the per-line
 * Cost is a readonly weighted average; each line carries an account select.
 */
export class TransferVoucherPage extends StockVoucherPage {
  readonly fromStoreSelect: Locator;
  readonly toStoreSelect: Locator;

  constructor(page: Page) {
    super(page, {
      path: '/warehouse/vouchers/transfer',
      perm: 'Transfer',
      api: 'TransferVoucher',
      costEditable: false,
      lineStoreIndex: null,
    });
    // Header @ng-select order: serial(0), fromStore(1), toStore(2), currency(3)…
    this.fromStoreSelect = page.locator('.card-body ng-select').nth(1);
    this.toStoreSelect = page.locator('.card-body ng-select').nth(2);
  }

  /** Per-line account @ng-select (third select in a transfer row). */
  rowAccountSelect(i: number): Locator {
    return this.row(i).locator('ng-select').nth(2);
  }

  /**
   * Drive the same-store guard: pick the first FROM store, then pick that exact
   * same store for TO. The component rejects it, clears TO, and toasts a warning.
   * Returns false when there are no store options to exercise the flow.
   */
  async pickSameStoreInBoth(): Promise<boolean> {
    const fromTxt = await this.pickFirstOption(this.fromStoreSelect);
    if (fromTxt == null) return false;
    const num = (fromTxt.match(/^(\d+)/) ?? [])[1];
    if (!num) return false;

    await this.toStoreSelect.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    // Match the option that starts with the same store number (word boundary so
    // "3" does not also match "30").
    await panel
      .locator('.ng-option:not(.ng-option-disabled)', { hasText: new RegExp('^' + num + '\\b') })
      .first()
      .click();
    // The guard closes the panel by resetting the model.
    await expect(panel).toBeHidden().catch(() => {});
    return true;
  }

  /** Pick two DIFFERENT stores for FROM and TO (first and second options). */
  async pickDistinctStores(): Promise<boolean> {
    const okFrom = await this.pickOption(this.fromStoreSelect, 0);
    const okTo = await this.pickOption(this.toStoreSelect, 1);
    return okFrom && okTo;
  }
}
