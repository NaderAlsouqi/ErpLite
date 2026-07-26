import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { fillDate } from '../../support/helpers';

/**
 * Page object for the Home2 landing dashboard (/home2). An app-page-header, a
 * filter card (date-from / date-to / currency ng-select / post-status select),
 * one voucher-analytics card per voucher type (each with KPIs, a data grid and
 * an apexchart), and grouped page-shortcut buttons. Derived from
 * home2.component.html. Filters auto-apply via (change) → VoucherDashboard/Get.
 */
export class Home2Page extends BasePage {
  readonly filterCard: Locator;
  readonly dateFrom: Locator;
  readonly dateTo: Locator;
  readonly currencySelect: Locator;
  readonly postStatusSelect: Locator;
  readonly voucherCards: Locator;
  readonly charts: Locator;
  readonly shortcutGroups: Locator;
  readonly shortcutButtons: Locator;

  constructor(page: Page) {
    super(page, '/home2');
    this.filterCard = page.locator('.h2-filter-card');
    this.dateFrom = this.filterCard.locator('input[type="date"]').nth(0);
    this.dateTo = this.filterCard.locator('input[type="date"]').nth(1);
    this.currencySelect = this.filterCard.locator('ng-select');
    this.postStatusSelect = this.filterCard.locator('select.form-select');
    this.voucherCards = page.locator('.h2-voucher-card');
    this.charts = page.locator('apx-chart');
    this.shortcutGroups = page.locator('.hp-action-grid');
    this.shortcutButtons = page.locator('.hp-action-card');
  }

  async setDateFrom(iso: string): Promise<void> {
    await fillDate(this.dateFrom, iso);
  }

  async setDateTo(iso: string): Promise<void> {
    await fillDate(this.dateTo, iso);
  }
}
