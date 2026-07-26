import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for the Chart of Accounts / دليل الحسابات screen
 * (/accounting/gl/accounts-list). It renders an expandable account tree that
 * flips to a paginated flat list in search mode, with inline add/edit rows and
 * a "Save All / Discard All" dirty workflow.
 */
export class ChartOfAccountsPage extends BasePage {
  readonly cardTitle: Locator;
  readonly expandAllBtn: Locator;
  readonly collapseAllBtn: Locator;
  readonly addAccountBtn: Locator;
  readonly saveAllBtn: Locator;
  readonly discardAllBtn: Locator;
  readonly reportExport: Locator;
  readonly searchInput: Locator;
  readonly clearSearchBtn: Locator;
  readonly table: Locator;
  readonly headers: Locator;
  readonly accountRows: Locator;
  readonly treeToggles: Locator;
  readonly searchInfo: Locator;
  readonly paginator: Locator;
  readonly treeFooter: Locator;
  readonly dirtyBanner: Locator;
  readonly newRows: Locator;

  constructor(page: Page) {
    super(page, '/accounting/gl/accounts-list');
    this.cardTitle = page.locator('.card-header .card-title');
    this.expandAllBtn = page.locator('.card-options .btn-outline-primary').nth(0);
    this.collapseAllBtn = page.locator('.card-options .btn-outline-primary').nth(1);
    this.addAccountBtn = page.locator('.card-options .btn-primary');
    this.saveAllBtn = page.locator('.card-options .btn-danger');
    this.discardAllBtn = page.locator('.card-options .btn-outline-danger');
    this.reportExport = page.locator('app-report-export');
    this.searchInput = page.locator('.card-body .input-group input.form-control').first();
    this.clearSearchBtn = page.locator('.card-body .input-group .btn-outline-secondary');
    this.table = page.locator('table.accounts-table');
    this.headers = this.table.locator('thead th');
    this.accountRows = this.table.locator('tbody tr.account-row');
    this.treeToggles = this.table.locator('.btn-tree-toggle');
    this.searchInfo = page.locator('.search-info');
    this.paginator = page.locator('mat-paginator');
    this.treeFooter = page.locator('.tree-footer');
    this.dirtyBanner = page.locator('.dirty-banner');
    this.newRows = this.table.locator('tr.row-new');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }

  async expandAll(): Promise<void> {
    await this.expandAllBtn.click();
  }

  async collapseAll(): Promise<void> {
    await this.collapseAllBtn.click();
  }

  /** The Arabic-name input of the (single) pending new row. */
  get newRowNameInput(): Locator {
    return this.newRows.first().locator('.col-name input');
  }

  get newRowInvalidName(): Locator {
    return this.newRows.first().locator('.col-name input.is-invalid');
  }

  async addRootAccount(): Promise<void> {
    await this.addAccountBtn.click();
    await expect(this.newRows.first()).toBeVisible({ timeout: ENV.slowExpect });
  }
}
