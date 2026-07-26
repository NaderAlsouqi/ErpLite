import { Page, Locator } from '@playwright/test';
import { ReportPage } from './report.page';

/**
 * Page object for /accounting/vouchers/acc-belong-report
 * (كشف حسابات تابعة). Generate is disabled until an account is picked; the
 * results render inside `.ab-print-area` for summary/detail/monthly modes, or
 * as a "no data" block when nothing matched.
 */
export class AccBelongReportPage extends ReportPage {
  constructor(page: Page) {
    super(page, '/accounting/vouchers/acc-belong-report', '.ab-print-area');
  }

  get accountSelect(): Locator {
    return this.ngSelect(0);
  }
  get dateFrom(): Locator {
    return this.card.locator('input[type=date]').nth(0);
  }
  get dateTo(): Locator {
    return this.card.locator('input[type=date]').nth(1);
  }
  get showZero(): Locator {
    return this.page.locator('#chkShowZero');
  }
  get modeSummary(): Locator {
    return this.page.locator('#modeSummary');
  }
  get modeDetail(): Locator {
    return this.page.locator('#modeDetail');
  }
  get modeAnalysis(): Locator {
    return this.page.locator('#modeAnalysis');
  }

  /** Empty-state block shown when a report was generated but returned no rows. */
  get noData(): Locator {
    return this.card.locator('.card-body > .text-center.py-5.text-muted');
  }
}
