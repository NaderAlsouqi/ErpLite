import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for the ADD INVOICE form (/sales/add-invoice).
 *
 * The form is split across three cards: customer + options, item management
 * (with a live line-items table), and the invoice summary. Selectors are
 * derived from add-invoice.component.html — the two `size="5"` list boxes are
 * the customer picker (0) and the item picker (1).
 */
export class SalesAddInvoicePage extends BasePage {
  readonly customerSelect: Locator;
  readonly itemSelect: Locator;
  readonly customerSearch: Locator;
  readonly itemSearch: Locator;
  readonly addItemButton: Locator;
  readonly paymentMethodSelect: Locator;
  readonly includeTaxCheckbox: Locator;
  readonly signCheckbox: Locator;
  readonly isCashCheckbox: Locator;
  readonly itemsTable: Locator;
  readonly summaryValues: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page, '/sales/add-invoice');
    this.customerSelect = page.locator('select.form-select[size="5"]').nth(0);
    this.itemSelect = page.locator('select.form-select[size="5"]').nth(1);
    // Two search boxes on this form, in DOM order: customer (0), item (1).
    const searchBoxes = page.locator('.input-group:has(.ti-search) input');
    this.customerSearch = searchBoxes.nth(0);
    this.itemSearch = searchBoxes.nth(1);
    this.addItemButton = page.locator('button.btn-primary:has(.ti-plus)');
    this.paymentMethodSelect = page.locator('select.form-select:not([size]):not(.form-select-sm)');
    this.includeTaxCheckbox = page.locator('#includeTaxCheckbox');
    this.signCheckbox = page.locator('#SignCheckbox');
    this.isCashCheckbox = page.locator('#isCashCheckbox');
    this.itemsTable = page.locator('table').first();
    this.summaryValues = page.locator('.alert.alert-light .fs-5');
    this.saveButton = page.locator('button:has(.ti-device-floppy)');
  }

  /** Line-item rows that carry a delete button (i.e. real items, not the placeholder). */
  itemRows(): Locator {
    return this.itemsTable.locator('tbody tr:has(.ti-trash)');
  }

  /** Options available in the item list box. */
  itemOptions(): Locator {
    return this.itemSelect.locator('option');
  }

  /** Options available in the customer list box. */
  customerOptions(): Locator {
    return this.customerSelect.locator('option');
  }

  /** Summary tiles: 0 = TotalTax, 1 = TotalWithoutTax, 2 = TotalWithTax, 3 = Discount. */
  summaryValue(index: 0 | 1 | 2 | 3): Locator {
    return this.summaryValues.nth(index);
  }

  async selectFirstCustomer(): Promise<void> {
    await this.customerSelect.selectOption({ index: 0 });
  }

  async addFirstItem(): Promise<void> {
    await this.itemSelect.selectOption({ index: 0 });
    await this.addItemButton.click();
  }

  /** Set quantity + unit price on a given line row and commit (fires the change handler). */
  async setLine(rowIndex: number, quantity: number, price: number): Promise<void> {
    const row = this.itemRows().nth(rowIndex);
    const numberInputs = row.locator('input[type="number"]');
    const qty = numberInputs.nth(0);
    const unitPrice = numberInputs.nth(1);
    await qty.fill(String(quantity));
    await qty.blur();
    await unitPrice.fill(String(price));
    await unitPrice.blur();
  }

  async expectFormReady(): Promise<void> {
    await expect(this.customerSelect).toBeVisible({ timeout: ENV.navTimeout });
    await expect(this.itemSelect).toBeVisible();
  }
}
