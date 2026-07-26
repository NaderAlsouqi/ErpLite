import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { waitForSpinnersGone } from '../../support/helpers';

/**
 * Page object for the Item Card (بطاقة مادة) screen
 * (/warehouse/entry/item-card). It is a 3-tab master/detail form:
 *   info  → master fields (category select drives the auto item code)
 *   units → unit rows + price-category rows + alternatives grids
 *   list  → all-items table with client-side search
 */
export class ItemCardPage extends BasePage {
  readonly card: Locator;
  readonly infoTab: Locator;
  readonly unitsTab: Locator;
  readonly listTab: Locator;

  readonly categorySelect: Locator;
  readonly itemCodeInput: Locator;
  readonly nameArInput: Locator;
  readonly nameEnInput: Locator;

  readonly saveButton: Locator;
  readonly deleteButton: Locator;
  readonly barcodeButton: Locator;
  readonly newButton: Locator;

  readonly unitsGrid: Locator;
  readonly priceCatGrid: Locator;
  readonly altGrid: Locator;
  readonly addUnitButton: Locator;

  readonly listSearch: Locator;
  readonly listTable: Locator;
  readonly listHeaderCells: Locator;
  readonly listRows: Locator;

  readonly confirmButton: Locator;

  constructor(page: Page) {
    super(page, '/warehouse/entry/item-card');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)').first();
    const tabs = this.card.locator('.nav-tabs .nav-link');
    this.infoTab = tabs.nth(0);
    this.unitsTab = tabs.nth(1);
    this.listTab = tabs.nth(2);

    // Info tab: the first ng-select is the category; the item code lives in the
    // only input-group; the two maxlength=250 inputs are the AR/EN names.
    this.categorySelect = page.locator('ng-select').first();
    this.itemCodeInput = page.locator('.input-group input[type="text"]').first();
    this.nameArInput = page.locator('input[maxlength="250"]').nth(0);
    this.nameEnInput = page.locator('input[maxlength="250"]').nth(1);

    this.saveButton = page.locator('.action-buttons button.btn-primary');
    this.deleteButton = page.locator('.action-buttons button.btn-danger');
    this.barcodeButton = page.locator('.action-buttons button.btn-info');
    this.newButton = page.locator('.action-buttons button.btn-secondary');

    this.unitsGrid = page.locator('.units-grid');
    this.priceCatGrid = page.locator('.cat-grid');
    this.altGrid = page.locator('.alt-grid');
    this.addUnitButton = this.unitsGrid.locator('xpath=following-sibling::button[1]');

    this.listSearch = page.locator('.input-group input[type="text"]').first();
    this.listTable = page.locator('table');
    this.listHeaderCells = this.listTable.locator('thead th');
    this.listRows = this.listTable.locator('tbody tr.cursor-pointer');

    this.confirmButton = page.locator('.btn-confirm');
  }

  async showInfo(): Promise<void> {
    await this.infoTab.click();
    await expect(this.nameArInput).toBeVisible();
  }

  async showUnits(): Promise<void> {
    await this.unitsTab.click();
    await expect(this.unitsGrid).toBeVisible();
  }

  async showList(): Promise<void> {
    await this.listTab.click();
    await waitForSpinnersGone(this.page);
    await expect(this.listTable).toBeVisible();
  }

  async hasCreatePermission(): Promise<boolean> {
    return (await this.saveButton.count()) > 0;
  }

  /** Open a dropdown and click its first enabled option. Returns false if empty. */
  private async selectFirstOption(ngSelect: Locator): Promise<boolean> {
    await ngSelect.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    const options = panel.locator('.ng-option:not(.ng-option-disabled)');
    if ((await options.count()) === 0) {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await options.first().click();
    await expect(panel).toBeHidden();
    return true;
  }

  /** Pick the first category — this generates the item code server-side. */
  async selectFirstCategory(): Promise<boolean> {
    return this.selectFirstOption(this.categorySelect);
  }

  async currentItemCode(): Promise<string> {
    return this.itemCodeInput.inputValue();
  }

  /**
   * On the units tab, configure the single starter row: pick the first unit and
   * flag it as the smallest unit (which forces operand = 1). Returns false when
   * there are no units defined in the tenant.
   */
  async setFirstUnitAsMin(): Promise<boolean> {
    const firstRow = this.unitsGrid.locator('.dgrid-row').first();
    const picked = await this.selectFirstOption(firstRow.locator('ng-select'));
    if (!picked) return false;
    await firstRow.locator('input[type="checkbox"]').first().check();
    return true;
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
