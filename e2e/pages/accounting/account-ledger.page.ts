import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';
import { fillDate } from '../../support/helpers';

/**
 * Page object for the Account Ledger / كشف حساب screen
 * (/accounting/misc/account-ledger). Pick an account + date range and Fetch to
 * render an opening balance, a movements table and a final balance. Changing
 * any filter clears the previously fetched result.
 */
export class AccountLedgerPage extends BasePage {
  readonly cardTitle: Locator;
  readonly accountSelect: Locator;
  readonly dateFrom: Locator;
  readonly dateTo: Locator;
  readonly fetchBtn: Locator;
  readonly detailedBtn: Locator;
  readonly reportExport: Locator;
  readonly printArea: Locator;
  readonly openingBalance: Locator;
  readonly resultTable: Locator;
  readonly finalBalance: Locator;

  constructor(page: Page) {
    super(page, '/accounting/misc/account-ledger');
    // Scope to the feature card: the main-layout injects a global attachments
    // card (`.card.custom-card.attachments-panel`) whose header also carries a
    // `.card-title` and a `.btn-primary` (upload) — otherwise these resolve to 2.
    const featureCard = page.locator('.card.custom-card:not(.attachments-panel)');
    this.cardTitle = featureCard.locator('.card-header .card-title');
    this.accountSelect = page.locator('.aldg-select');
    this.dateFrom = page.locator('input[type="date"]').nth(0);
    this.dateTo = page.locator('input[type="date"]').nth(1);
    this.fetchBtn = featureCard.locator('.card-header .btn-primary');
    this.detailedBtn = featureCard.locator('.card-header .btn-outline-primary');
    this.reportExport = page.locator('app-report-export');
    this.printArea = page.locator('.aldg-print-area');
    this.openingBalance = page.locator('.aldg-opening');
    this.resultTable = page.locator('table.aldg-table');
    this.finalBalance = page.locator('.aldg-final');
  }

  async selectFirstAccount(): Promise<void> {
    await this.accountSelect.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible({ timeout: ENV.slowExpect });
    await panel.locator('.ng-option').first().click();
    await expect(panel).toBeHidden();
  }

  async setDateFrom(iso: string): Promise<void> {
    await fillDate(this.dateFrom, iso);
  }

  async setDateTo(iso: string): Promise<void> {
    await fillDate(this.dateTo, iso);
  }
}
