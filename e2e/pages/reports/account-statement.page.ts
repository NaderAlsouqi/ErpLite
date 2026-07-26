import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for /reports/account-statement (كشف حساب) — the customer account
 * statement built on Angular Material (mat-datepicker + mat-table). Its data is
 * scoped to the logged-in delivery user's customers, so this object focuses on
 * structure and control state rather than driving a full query.
 */
export class AccountStatementPage extends BasePage {
  constructor(page: Page) {
    super(page, '/reports/account-statement');
  }

  get card(): Locator {
    return this.page.locator('.custom-card').first();
  }
  /** Search button in the card body (disabled until all fields are set). */
  get searchButton(): Locator {
    return this.card.locator('.card-body button.btn-primary.w-100');
  }
  /** Print button in the header — rendered only with the Reports.View perm. */
  get printButton(): Locator {
    return this.header.locator('button.btn-primary');
  }
  get header(): Locator {
    return this.card.locator('.card-header').first();
  }
  get customerSelect(): Locator {
    return this.card.locator('ng-select');
  }
  /** The two datepicker inputs — each wrapped in its own `.input-group`. */
  matDateInputs(): Locator {
    return this.card.locator('.input-group input.form-control');
  }
  get resultsTable(): Locator {
    return this.card.locator('table[mat-table]');
  }

  async hasPrintButton(): Promise<boolean> {
    return (await this.printButton.count()) > 0;
  }

  async expectLoaded(): Promise<void> {
    await expect(this.card).toBeVisible({ timeout: ENV.navTimeout });
    await expect(this.searchButton).toBeVisible();
  }
}
