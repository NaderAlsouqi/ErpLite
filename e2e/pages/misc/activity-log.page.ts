import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';
import { fillDate } from '../../support/helpers';

/**
 * Page object for the Activity Log / سجل الأحداث screen (/activity-log).
 * A card with a filter row (username text, module / action / status ng-selects,
 * date-from / date-to), a Search + Clear action pair, a 7-column bordered
 * table, and a Material paginator.
 *
 * Derived from activity-log.component.html. Read-only (all GET requests).
 */
export class ActivityLogPage extends BasePage {
  readonly card: Locator;
  readonly filters: Locator;
  readonly usernameInput: Locator;
  readonly moduleSelect: Locator;
  readonly actionSelect: Locator;
  readonly statusSelect: Locator;
  readonly dateFrom: Locator;
  readonly dateTo: Locator;
  readonly searchBtn: Locator;
  readonly clearBtn: Locator;
  readonly table: Locator;
  readonly headers: Locator;
  readonly rows: Locator;
  readonly emptyRow: Locator;
  readonly paginator: Locator;
  readonly reportExport: Locator;

  constructor(page: Page) {
    super(page, '/activity-log');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.filters = page.locator('.al-filters');
    this.usernameInput = page.locator('.al-filters input.al-input[type="text"]');
    // The three filter ng-selects, in template order: module, action, status.
    this.moduleSelect = page.locator('.al-filters ng-select').nth(0);
    this.actionSelect = page.locator('.al-filters ng-select').nth(1);
    this.statusSelect = page.locator('.al-filters ng-select').nth(2);
    this.dateFrom = page.locator('.al-filters input[type="date"]').nth(0);
    this.dateTo = page.locator('.al-filters input[type="date"]').nth(1);
    this.searchBtn = page.locator('.al-filter-actions .btn-primary');
    this.clearBtn = page.locator('.al-filter-actions .al-btn-clear');
    this.table = page.locator('.al-table-wrapper table');
    this.headers = this.table.locator('thead th');
    this.rows = this.table.locator('tbody tr.al-row');
    this.emptyRow = this.table.locator('tbody tr td[colspan]');
    this.paginator = page.locator('mat-paginator');
    this.reportExport = page.locator('app-report-export');
  }

  /** Either data rows or the "no records" placeholder are visible. */
  async waitForTableSettled(): Promise<void> {
    await expect(this.rows.first().or(this.emptyRow.first())).toBeVisible({
      timeout: ENV.navTimeout,
    });
  }

  async setDateFrom(iso: string): Promise<void> {
    await fillDate(this.dateFrom, iso);
  }

  async setDateTo(iso: string): Promise<void> {
    await fillDate(this.dateTo, iso);
  }
}
