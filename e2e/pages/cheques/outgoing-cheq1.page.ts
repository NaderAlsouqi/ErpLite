import { Page, Locator } from '@playwright/test';
import { ChequeVoucherPage } from './cheque-voucher.base.page';

/**
 * إخراج شيكات صادرة — outgoing cheque entry (creates cheques).
 * Route: /accounting/cheques/outgoing-first
 * Save is gated by `*hasPermission="'OutgoingCheq1.Create'"`.
 * Each valid line additionally requires a non-empty "Draw" (الساحب) value.
 */
export class OutgoingChequePage extends ChequeVoucherPage {
  readonly saveApi = '/OutgoingCheq1/Save';

  constructor(page: Page) {
    super(page, '/accounting/cheques/outgoing-first');
  }

  gridRows(): Locator {
    return this.table().locator('tbody > tr');
  }
  firstRowCheqNum(): Locator {
    return this.gridRows().first().locator('.col-cheqnum input');
  }
  firstRowAmt(): Locator {
    return this.gridRows().first().locator('.col-amt input');
  }
  firstRowDraw(): Locator {
    return this.gridRows().first().locator('.col-draw input');
  }
  removeFirstRowButton(): Locator {
    return this.gridRows().first().locator('.col-del button');
  }

  deletePath(docNum: number, myYear: number, vType: number): string {
    return `/OutgoingCheq1/Delete?docNum=${docNum}&myYear=${myYear}&vType=${vType}`;
  }
}
