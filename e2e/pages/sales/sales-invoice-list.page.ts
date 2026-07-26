import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for the Sales Invoices LIST page (/sales/invoice).
 * Renders an Angular Material table; selectors use the persistent
 * `mat-*` attribute selectors so they survive Material class-name churn.
 */
export class SalesInvoiceListPage extends BasePage {
  readonly card: Locator;
  readonly addButton: Locator;
  readonly printButton: Locator;
  readonly table: Locator;
  readonly headerCells: Locator;
  readonly searchInput: Locator;
  readonly statusButtons: Locator;
  readonly customerSelect: Locator;
  readonly grandTotal: Locator;
  readonly paginator: Locator;

  constructor(page: Page) {
    super(page, '/sales/invoice');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)').first();
    this.addButton = page.locator('.card-options button:has(.ti-plus)');
    this.printButton = page.locator('.card-options button:has(.ti-printer)');
    this.table = page.locator('table[mat-table]');
    this.headerCells = this.table.locator('th[mat-header-cell]');
    this.searchInput = page.locator('.input-group:has(.ti-search) input');
    this.statusButtons = page.locator('.btn-group.w-100 button');
    this.customerSelect = page.locator('ng-select');
    this.grandTotal = page.locator('.card.mt-4 .text-end h5');
    this.paginator = page.locator('mat-paginator');
  }

  /** Data (content) rows only — excludes the header and the no-data row. */
  rows(): Locator {
    return this.table.locator('tr[mat-row]');
  }

  /** The cell rendered by *matNoDataRow when the filtered result set is empty. */
  noDataRow(): Locator {
    return this.table.locator('tr.mat-row td.mat-cell, tr.mat-row td');
  }

  async columnCount(): Promise<number> {
    return this.headerCells.count();
  }

  /** Type into the keyup-driven search box (fires keyup per character). */
  async search(text: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill('');
    await this.searchInput.pressSequentially(text);
  }

  /** Click one of the All / Transferred / Not-transferred toggle buttons. */
  async filterByStatus(index: 0 | 1 | 2): Promise<void> {
    await this.statusButtons.nth(index).click();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.table).toBeVisible({ timeout: ENV.navTimeout });
  }
}
