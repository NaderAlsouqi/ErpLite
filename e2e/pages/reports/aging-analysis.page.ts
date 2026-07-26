import { Page, Locator } from '@playwright/test';
import { ReportPage } from './report.page';

/** Page object for /accounting/reports/aging-analysis (تحليل أعمار الديون). */
export class AgingAnalysisPage extends ReportPage {
  constructor(page: Page) {
    super(page, '/accounting/reports/aging-analysis', '.ag-print-area');
  }

  /** Required account picker — Generate stays disabled until one is chosen. */
  get accountSelect(): Locator {
    return this.ngSelect(0);
  }
  get salesmanSelect(): Locator {
    return this.ngSelect(1);
  }
  get areaSelect(): Locator {
    return this.ngSelect(2);
  }
  get asOfDate(): Locator {
    return this.card.locator('input[type=date]');
  }
  get sortByNo(): Locator {
    return this.page.locator('#sortNo');
  }
  get sortByName(): Locator {
    return this.page.locator('#sortName');
  }
}
