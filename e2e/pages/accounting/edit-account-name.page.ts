import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the Edit Account Name screen
 * (/accounting/gl/edit-account-name). A master/detail layout: a paginated,
 * searchable account table on the right; a detail form on the left that lets
 * you rename the selected account (Save gated by Accf.Edit, Discard always
 * available).
 */
export class EditAccountNamePage extends BasePage {
  readonly noSelectionPrompt: Locator;
  readonly noInput: Locator;
  readonly arabicNameInput: Locator;
  readonly englishNameInput: Locator;
  readonly saveBtn: Locator;
  readonly discardBtn: Locator;
  readonly searchInput: Locator;
  readonly clearSearchBtn: Locator;
  readonly table: Locator;
  readonly headers: Locator;
  readonly dataRows: Locator;
  readonly paginator: Locator;
  readonly reportExport: Locator;

  constructor(page: Page) {
    super(page, '/accounting/gl/edit-account-name');
    this.noSelectionPrompt = page.locator('.no-selection');
    this.noInput = page.locator('input.form-control[readonly]');
    this.arabicNameInput = page.locator('input.form-control[dir="rtl"]');
    this.englishNameInput = page.locator('input.form-control[dir="ltr"]');
    this.saveBtn = page.locator('.action-buttons .btn-primary');
    this.discardBtn = page.locator('.action-buttons .btn-danger');
    this.searchInput = page.locator('.input-group input.form-control');
    this.clearSearchBtn = page.locator('.input-group .btn-outline-secondary');
    this.table = page.locator('table.table');
    this.headers = this.table.locator('thead th');
    this.dataRows = this.table.locator('tbody tr:has(td.account-no-cell)');
    this.paginator = page.locator('mat-paginator');
    this.reportExport = page.locator('app-report-export');
  }

  get emptyStateRow(): Locator {
    return this.table.locator('tbody tr td[colspan]');
  }

  async selectFirstRow(): Promise<void> {
    await this.dataRows.first().click();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }
}
