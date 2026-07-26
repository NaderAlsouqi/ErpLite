import { Page, Locator } from '@playwright/test';
import { ChequeVoucherPage } from './cheque-voucher.base.page';

/**
 * متابعة الشيكات — cheque tracking (a filter → results report screen).
 * Route: /accounting/cheques/tracking
 *
 * The form tab has a period filter (from/to) + a "Fetch" (احضار) button that
 * pulls matching cheques into a selectable grid; a select-all header checkbox;
 * and Save (gated by `*hasPermission="'CheqTracking.Create'"`). The list tab is
 * a standard paginated voucher list.
 */
export class CheqTrackingPage extends ChequeVoucherPage {
  readonly availableChequesApi = '/GetAvailableCheques';

  constructor(page: Page) {
    super(page, '/accounting/cheques/tracking');
  }

  // ── Period filter row (row 3 of the form) ─────────────────────
  private periodRow(): Locator {
    return this.cardBody().locator('.row.g-3.mb-4');
  }
  periodInputs(): Locator {
    return this.periodRow().locator('input');
  }
  periodFromInput(): Locator {
    return this.periodInputs().nth(0);
  }
  periodToInput(): Locator {
    return this.periodInputs().nth(1);
  }
  fetchButton(): Locator {
    return this.cardBody().locator('button:has(.ti-search)');
  }
  selectedCount(): Locator {
    return this.cardBody().locator('.text-muted.small strong');
  }

  // ── Cheque grid ───────────────────────────────────────────────
  selectAllCheckbox(): Locator {
    return this.table().locator('thead input[type="checkbox"]');
  }
  rowCheckboxes(): Locator {
    return this.table().locator('tbody input[type="checkbox"]');
  }
  gridRows(): Locator {
    return this.table().locator('tbody > tr');
  }
}
