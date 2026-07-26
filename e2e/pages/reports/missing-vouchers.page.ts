import { Page, Locator } from '@playwright/test';
import { ReportPage } from './report.page';

/**
 * Page object for /accounting/misc/missing-vouchers (كشف السندات المفقودة).
 * Two actions: "Generate" (missing-doc scan) and "Unbalanced" (transactions
 * whose lines don't net to zero). Both render into `.mv-print-area`.
 */
export class MissingVouchersPage extends ReportPage {
  constructor(page: Page) {
    super(page, '/accounting/misc/missing-vouchers', '.mv-print-area');
  }

  get unbalancedButton(): Locator {
    return this.header.locator('button.btn-outline-warning');
  }
  get docTypeSelect(): Locator {
    return this.card.locator('.card-body select');
  }
  numberInputs(): Locator {
    return this.card.locator('.card-body input[type=number]');
  }
  /** من رقم (DocFrom) — first number input after docType select. */
  get docFrom(): Locator {
    return this.numberInputs().nth(2);
  }
}
