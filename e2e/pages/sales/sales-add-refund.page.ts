import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for the ADD REFUND / payback page (/sales/add-refund).
 * You search an invoice by number, then choose per-item return quantities.
 * Derived from add-refund.component.html.
 */
export class SalesAddRefundPage extends BasePage {
  readonly invoiceNumberInput: Locator;
  readonly fetchButton: Locator;
  readonly emptyState: Locator;
  readonly invoiceDetailsCard: Locator;
  readonly itemsTable: Locator;
  readonly cancelButton: Locator;
  readonly processButton: Locator;

  constructor(page: Page) {
    super(page, '/sales/add-refund');
    this.invoiceNumberInput = page.locator('#invoiceNumber');
    this.fetchButton = page.locator('button:has(.ti-search)');
    this.emptyState = page.locator('.empty-state');
    this.invoiceDetailsCard = page.locator('.invoice-summary-grid');
    this.itemsTable = page.locator('table');
    this.cancelButton = page.locator('button:has(.ti-x)');
    this.processButton = page.locator('button:has(.ti-check)');
  }

  async fetch(invoiceNumber: string): Promise<void> {
    await this.invoiceNumberInput.fill(invoiceNumber);
    await this.fetchButton.click();
  }

  async expectReady(): Promise<void> {
    await expect(this.invoiceNumberInput).toBeVisible({ timeout: ENV.navTimeout });
    await expect(this.fetchButton).toBeVisible();
  }
}
