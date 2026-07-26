import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for the invoice REFUNDS list (/sales/refund) — the list of
 * payback documents, with the same Material-table + filter layout as the
 * invoice list. Derived from invoice-refund.component.html.
 */
export class SalesInvoiceRefundPage extends BasePage {
  readonly addRefundButton: Locator;
  readonly printButton: Locator;
  readonly table: Locator;
  readonly headerCells: Locator;
  readonly searchInput: Locator;
  readonly statusButtons: Locator;
  readonly customerSelect: Locator;
  readonly grandTotal: Locator;
  readonly paginator: Locator;

  constructor(page: Page) {
    super(page, '/sales/refund');
    this.addRefundButton = page.locator('.card-options button:has(.ti-plus)');
    this.printButton = page.locator('.card-options button:has(.ti-printer)');
    this.table = page.locator('table[mat-table]');
    this.headerCells = this.table.locator('th[mat-header-cell]');
    this.searchInput = page.locator('.input-group:has(.ti-search) input');
    this.statusButtons = page.locator('.btn-group.w-100 button');
    this.customerSelect = page.locator('ng-select');
    this.grandTotal = page.locator('.card.mt-4 .text-end h5');
    this.paginator = page.locator('mat-paginator');
  }

  rows(): Locator {
    return this.table.locator('tr[mat-row]');
  }

  async columnCount(): Promise<number> {
    return this.headerCells.count();
  }

  async search(text: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill('');
    await this.searchInput.pressSequentially(text);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.table).toBeVisible({ timeout: ENV.navTimeout });
  }
}
