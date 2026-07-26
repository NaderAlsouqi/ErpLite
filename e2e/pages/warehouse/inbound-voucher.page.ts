import { Page } from '@playwright/test';
import { StockVoucherPage } from './stock-voucher.base.page';

/** سند إدخال — Inbound (stock-in) voucher. Per-line store; editable cost. */
export class InboundVoucherPage extends StockVoucherPage {
  constructor(page: Page) {
    super(page, {
      path: '/warehouse/vouchers/inbound',
      perm: 'Inbound',
      api: 'InboundVoucher',
      costEditable: true,
      lineStoreIndex: 2,
    });
  }

  /** Header Vendor @ng-select (second header select, after the serial). */
  vendorSelect() {
    return this.page.locator('.row.g-3.mb-2 ng-select').nth(1);
  }
}
