import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { waitForSpinnersGone } from '../../support/helpers';

/**
 * Page object for the Suppliers/Vendors entry screen
 * (/warehouse/entry/suppliers). Shares the form/list two-tab layout of the
 * simpler definition screens but the entry form is richer: the "No" field is an
 * @ng-select with add-tag support and only the (Arabic) Name is required — a new
 * number is auto-assigned on save when the dropdown is left empty.
 */
export class VendorsPage extends BasePage {
  readonly card: Locator;
  readonly formTab: Locator;
  readonly listTab: Locator;
  readonly noSelect: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly deleteButton: Locator;
  readonly searchInput: Locator;
  readonly clearSearchButton: Locator;
  readonly table: Locator;
  readonly headerCells: Locator;
  readonly dataRows: Locator;
  readonly noRecordsCell: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    super(page, '/warehouse/entry/suppliers');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)').first();
    const tabs = this.card.locator('.nav-tabs .nav-link');
    this.formTab = tabs.nth(0);
    this.listTab = tabs.nth(1);

    // First ng-select in the entry form is the vendor "No" picker.
    this.noSelect = page.locator('ng-select').first();
    // The Arabic name is the only maxlength=200 input on the form.
    this.nameInput = page.locator('input[maxlength="200"]');

    this.saveButton = page.locator('.action-buttons button.btn-primary');
    this.deleteButton = page.locator('.action-buttons button.btn-danger');

    this.searchInput = page.locator('.input-group input.form-control[type="text"]');
    this.clearSearchButton = page.locator('.input-group button:has(.ti-x)');

    this.table = page.locator('.table-section table');
    this.headerCells = this.table.locator('thead th');
    this.dataRows = this.table.locator('tbody tr.cursor-pointer');
    this.noRecordsCell = this.table.locator('tbody td[colspan]');

    this.confirmButton = page.locator('.btn-confirm');
  }

  async showForm(): Promise<void> {
    await this.formTab.click();
    await expect(this.nameInput).toBeVisible();
  }

  async showList(): Promise<void> {
    await this.listTab.click();
    await waitForSpinnersGone(this.page);
    await expect(this.table).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  rowByText(text: string): Locator {
    return this.dataRows.filter({ hasText: text });
  }

  async hasCreatePermission(): Promise<boolean> {
    return (await this.saveButton.count()) > 0;
  }

  async hasDeletePermission(): Promise<boolean> {
    return (await this.deleteButton.count()) > 0;
  }

  /** Fill the required name and save (number auto-assigned). Expects a success toast. */
  async createVendor(name: string): Promise<void> {
    await this.showForm();
    await this.nameInput.fill(name);
    await this.saveButton.click();
    await this.expectToast('success');
  }

  async openVendor(name: string): Promise<void> {
    await this.showList();
    await this.search(name);
    const row = this.rowByText(name).first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(this.nameInput).toBeVisible();
  }

  async deleteCurrent(): Promise<void> {
    await expect(this.deleteButton).toBeEnabled();
    await this.deleteButton.click();
    await expect(this.confirmButton.first()).toBeVisible();
    await this.confirmButton.first().click();
    await this.expectToast('success');
  }
}
