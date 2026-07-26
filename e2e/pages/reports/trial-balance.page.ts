import { Page, Locator } from '@playwright/test';
import { ReportPage } from './report.page';

/** Page object for /accounting/reports/trial-balance (ميزان المراجعة). */
export class TrialBalancePage extends ReportPage {
  constructor(page: Page) {
    super(page, '/accounting/reports/trial-balance', '.tb-print-area');
  }

  get dateFrom(): Locator {
    return this.card.locator('input[type=date]').nth(0);
  }
  get dateTo(): Locator {
    return this.card.locator('input[type=date]').nth(1);
  }
  /** Level input — uniquely identified by max="9" (branch-no has no max). */
  get level(): Locator {
    return this.card.locator('input[type=number][max="9"]');
  }
  get showZero(): Locator {
    return this.page.locator('#chkShowZero');
  }
  get subAccountsOnly(): Locator {
    return this.page.locator('#chkSubOnly');
  }
  get excludeClosing(): Locator {
    return this.page.locator('#chkExclClosing');
  }
  get branchAll(): Locator {
    return this.page.locator('#brAll');
  }
  get branchSpecific(): Locator {
    return this.page.locator('#brSpecific');
  }
  get typeRegular(): Locator {
    return this.page.locator('#tpReg');
  }
  get typeDetailed(): Locator {
    return this.page.locator('#tpDet');
  }
  get postedAll(): Locator {
    return this.page.locator('#psAll');
  }
  get postedYes(): Locator {
    return this.page.locator('#psYes');
  }

  /** Header cells of the rendered results table (4 regular, 7 detailed). */
  headerCells(): Locator {
    return this.resultsRoot.locator('thead th');
  }
}
