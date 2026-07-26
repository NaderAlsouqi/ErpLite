import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { waitForSpinnersGone } from '../../support/helpers';

export interface CrudGridOptions {
  /** Base permission key, e.g. 'Units' → Units.Create / Units.Delete. */
  permKey: string;
  /** Number of columns the list-tab table header should render. */
  columnCount: number;
}

/**
 * Reusable page object for the warehouse "entry / definition" screens that all
 * share the same two-tab (form + list) layout:
 *   units, warehouses (stores), disbursement-entities, origin-country,
 *   price-categories, main-categories, brands.
 *
 * Every selector is STRUCTURAL (tab position, form-section, action-buttons,
 * table structure) so this single class drives every entity without depending
 * on translated labels or per-entity model field names.
 */
export class CrudGridPage extends BasePage {
  readonly card: Locator;
  readonly formTab: Locator;
  readonly listTab: Locator;
  readonly formSection: Locator;
  readonly numberInput: Locator;
  readonly textInputs: Locator;
  readonly saveButton: Locator;
  readonly newButton: Locator;
  readonly deleteButton: Locator;
  readonly searchInput: Locator;
  readonly clearSearchButton: Locator;
  readonly table: Locator;
  readonly headerCells: Locator;
  readonly dataRows: Locator;
  readonly noRecordsCell: Locator;
  readonly confirmButton: Locator;

  constructor(
    page: Page,
    path: string,
    readonly options: CrudGridOptions
  ) {
    super(page, path);
    this.card = page.locator('.card.custom-card:not(.attachments-panel)').first();
    const tabs = this.card.locator('.nav-tabs .nav-link');
    this.formTab = tabs.nth(0);
    this.listTab = tabs.nth(1);

    this.formSection = page.locator('.form-section');
    this.numberInput = this.formSection.locator('input[type="number"]').first();
    this.textInputs = this.formSection.locator('input[type="text"]');

    this.saveButton = page.locator('.action-buttons button.btn-primary');
    this.newButton = page.locator('.action-buttons button.btn-secondary');
    this.deleteButton = page.locator('.action-buttons button.btn-danger');

    this.searchInput = page.locator('.input-group input.form-control[type="text"]');
    this.clearSearchButton = page.locator('.input-group button:has(.ti-x)');

    this.table = page.locator('.table-section table');
    this.headerCells = this.table.locator('thead th');
    this.dataRows = this.table.locator('tbody tr.cursor-pointer');
    this.noRecordsCell = this.table.locator('tbody td[colspan]');

    this.confirmButton = page.locator('.btn-confirm');
  }

  /** Arabic-name field (first text input in the entry form). */
  get arabicName(): Locator {
    return this.textInputs.nth(0);
  }

  /** English-name field (second text input in the entry form). */
  get englishName(): Locator {
    return this.textInputs.nth(1);
  }

  async showForm(): Promise<void> {
    await this.formTab.click();
    await expect(this.formSection).toBeVisible();
  }

  async showList(): Promise<void> {
    await this.listTab.click();
    await waitForSpinnersGone(this.page);
    await expect(this.table).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  /** A list row identified by (unique) visible text. */
  rowByText(text: string): Locator {
    return this.dataRows.filter({ hasText: text });
  }

  async hasCreatePermission(): Promise<boolean> {
    return (await this.saveButton.count()) > 0;
  }

  async hasDeletePermission(): Promise<boolean> {
    return (await this.deleteButton.count()) > 0;
  }

  /** Fill the two name fields on the entry form and save; expects a success toast. */
  async createRecord(name: string): Promise<void> {
    await this.showForm();
    await this.arabicName.fill(name);
    await this.englishName.fill(name);
    await this.saveButton.click();
    await this.expectToast('success');
  }

  /** Find a record in the list by name and open it in the entry form for editing. */
  async openRecord(name: string): Promise<void> {
    await this.showList();
    await this.search(name);
    const row = this.rowByText(name).first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(this.formSection).toBeVisible();
  }

  /** Delete the record currently loaded in the form (via the confirm modal). */
  async deleteCurrent(): Promise<void> {
    await expect(this.deleteButton).toBeEnabled();
    await this.deleteButton.click();
    await expect(this.confirmButton.first()).toBeVisible();
    await this.confirmButton.first().click();
    await this.expectToast('success');
  }
}
