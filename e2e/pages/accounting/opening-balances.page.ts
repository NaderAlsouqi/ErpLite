import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the Opening Balances screen (/accounting/gl/opening-balances).
 * A single editable grid of leaf accounts with debit/credit inputs, a live
 * balance/difference footer, and a dirty "Save / Discard" workflow gated by the
 * Accf.Edit permission.
 */
export class OpeningBalancesPage extends BasePage {
  readonly cardTitle: Locator;
  readonly infoBar: Locator;
  readonly searchInput: Locator;
  readonly clearSearchBtn: Locator;
  readonly table: Locator;
  readonly headers: Locator;
  readonly rows: Locator;
  readonly totalsRow: Locator;
  readonly diffRow: Locator;
  readonly footer: Locator;
  readonly saveBtn: Locator;
  readonly discardBtn: Locator;
  readonly reportExport: Locator;

  constructor(page: Page) {
    super(page, '/accounting/gl/opening-balances');
    this.cardTitle = page.locator('.card-header .card-title');
    this.infoBar = page.locator('.ob-info-bar');
    this.searchInput = page.locator('.ob-search input.form-control');
    this.clearSearchBtn = page.locator('.ob-search .btn-outline-secondary');
    this.table = page.locator('table.ob-table');
    this.headers = this.table.locator('thead th');
    this.rows = this.table.locator('tbody tr.ob-row');
    this.totalsRow = page.locator('.ob-totals-row');
    this.diffRow = page.locator('.ob-diff-row');
    this.footer = page.locator('.ob-footer');
    this.saveBtn = page.locator('.card-options .btn-danger');
    this.discardBtn = page.locator('.card-options .btn-outline-danger');
    this.reportExport = page.locator('app-report-export');
  }

  get emptyStateRow(): Locator {
    return this.table.locator('tbody tr td[colspan]');
  }

  debitInput(row: Locator): Locator {
    return row.locator('.input-debit');
  }

  creditInput(row: Locator): Locator {
    return row.locator('.input-credit');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }
}
