import { Page, Locator } from '@playwright/test';
import { ReportPage } from './report.page';

/**
 * Page object for /accounting/vouchers/journal-report (تقرير القيود).
 * Search-style: "Search" primary button, export (disabled until results),
 * "Clear" button, an empty prompt, and a `.jvr-summary` bar with the grouped
 * voucher table once a search runs.
 */
export class JournalVoucherReportPage extends ReportPage {
  constructor(page: Page) {
    super(page, '/accounting/vouchers/journal-report', '.jvr-summary');
  }

  get searchButton(): Locator {
    return this.generateButton;
  }
  get clearButton(): Locator {
    return this.header.locator('button.btn-outline-secondary');
  }
  get emptyPrompt(): Locator {
    return this.card.locator('.card-body .text-center.py-5.text-muted');
  }

  get filterModeDate(): Locator {
    return this.page.locator('#modeDate');
  }
  get filterModeDoc(): Locator {
    return this.page.locator('#modeDoc');
  }
  /** Number inputs (visible only in DocNum filter mode). */
  numberInputs(): Locator {
    return this.card.locator('.card-body input[type=number]');
  }
}
