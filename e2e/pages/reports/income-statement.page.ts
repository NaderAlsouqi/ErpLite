import { Page, Locator } from '@playwright/test';
import { ReportPage } from './report.page';

/** Page object for /accounting/reports/income-statement (قائمة الدخل). */
export class IncomeStatementPage extends ReportPage {
  constructor(page: Page) {
    super(page, '/accounting/reports/income-statement', '.is-print-area');
  }

  get dateFrom(): Locator {
    return this.card.locator('input[type=date]').nth(0);
  }
  get dateTo(): Locator {
    return this.card.locator('input[type=date]').nth(1);
  }
  get level(): Locator {
    return this.card.locator('input[type=number][max="9"]');
  }
  get showZero(): Locator {
    return this.page.locator('#chkShowZero');
  }
  get excludeClosing(): Locator {
    return this.page.locator('#chkExclClosing');
  }

  // ── بضاعة آخر المدة grid (nested card) ──────────────────────────────
  get gridCard(): Locator {
    return this.card.locator('.card.border').first();
  }
  get loadGridButton(): Locator {
    return this.gridCard.locator('button.btn-outline-secondary');
  }
  get addRowButton(): Locator {
    return this.gridCard.locator('button.btn-outline-primary');
  }
  get saveGridButton(): Locator {
    return this.gridCard.locator('button.btn-primary');
  }
  gridRows(): Locator {
    return this.gridCard.locator('tbody tr');
  }
}
