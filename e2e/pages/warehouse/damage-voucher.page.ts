import { Page } from '@playwright/test';
import { StockVoucherPage } from './stock-voucher.base.page';

/** سند إتلاف — Damage (write-off) voucher. Per-line store; editable cost. */
export class DamageVoucherPage extends StockVoucherPage {
  constructor(page: Page) {
    super(page, {
      path: '/warehouse/vouchers/damage',
      perm: 'Damage',
      api: 'DamageVoucher',
      costEditable: true,
      lineStoreIndex: 2,
    });
  }
}
