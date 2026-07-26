import { Page, Locator } from '@playwright/test';
import { ReportPage } from './report.page';

/**
 * Page object for /accounting/reports/detailed-statement
 * (كشف حساب تفصيلي). Search-style screen: a "Search" primary button, an export
 * control (disabled until results), a "Clear" button, an empty prompt shown
 * until results arrive, and a `.ads-summary` bar once a search runs.
 */
export class DetailedStatementPage extends ReportPage {
  constructor(page: Page) {
    super(page, '/accounting/reports/detailed-statement', '.ads-summary');
  }

  /** Alias — the header primary button is "Search" here. */
  get searchButton(): Locator {
    return this.generateButton;
  }
  get clearButton(): Locator {
    return this.header.locator('button.btn-outline-secondary');
  }
  /** Prompt shown while no results have been fetched. */
  get emptyPrompt(): Locator {
    return this.card.locator('.card-body .text-center.py-5.text-muted');
  }

  get currencySelect(): Locator {
    return this.ngSelect(0);
  }
  get accountFromSelect(): Locator {
    return this.ngSelect(1);
  }
  get accountToSelect(): Locator {
    return this.ngSelect(2);
  }
  get showItems(): Locator {
    return this.page.locator('#chkItems');
  }
  get showChecks(): Locator {
    return this.page.locator('#chkEquiv');
  }
}
