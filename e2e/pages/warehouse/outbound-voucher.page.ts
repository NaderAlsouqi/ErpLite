import { Page } from '@playwright/test';
import { StockVoucherPage } from './stock-voucher.base.page';

/** سند إخراج — Outbound (stock-out) voucher. Per-line store; editable cost. */
export class OutboundVoucherPage extends StockVoucherPage {
  constructor(page: Page) {
    super(page, {
      path: '/warehouse/vouchers/outbound',
      perm: 'Outbound',
      api: 'OutboundVoucher',
      costEditable: true,
      lineStoreIndex: 2,
    });
  }
}
