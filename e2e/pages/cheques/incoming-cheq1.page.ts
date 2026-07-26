import { Page, Locator } from '@playwright/test';
import { ChequeVoucherPage } from './cheque-voucher.base.page';

/**
 * إدخال شيكات واردة — incoming cheque entry (creates cheques).
 * Route: /accounting/cheques/incoming-first
 * Save is gated by `*hasPermission="'IncomingCheq1.Create'"`.
 */
export class IncomingChequePage extends ChequeVoucherPage {
  /** Substring identifying the Save/Delete API for this screen. */
  readonly saveApi = '/IncomingCheq1/Save';

  constructor(page: Page) {
    super(page, '/accounting/cheques/incoming-first');
  }

  // The status radio group (StsInBox=0, StsCollection=1, StsReturned=3).
  statusRadios(): Locator {
    return this.cardBody().locator('input[type="radio"][id^="sts_"]');
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

  /** Build the API cleanup path for a created voucher. */
  deletePath(docNum: number, myYear: number, vType: number): string {
    return `/IncomingCheq1/Delete?docNum=${docNum}&myYear=${myYear}&vType=${vType}`;
  }
}
