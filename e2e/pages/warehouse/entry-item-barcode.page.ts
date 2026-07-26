import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the Item Barcodes screen (/warehouse/entry/barcode).
 * Two @ng-select typeaheads (item, then unit) gate a barcodes grid. The unit
 * select is disabled until an item is chosen and Save is disabled until a unit
 * is chosen — this class exposes those states for read-only assertions.
 */
export class ItemBarcodePage extends BasePage {
  readonly card: Locator;
  readonly itemSelect: Locator;
  readonly unitSelect: Locator;
  readonly operandInput: Locator;
  readonly saveButton: Locator;
  readonly newButton: Locator;
  readonly placeholderMessage: Locator;

  constructor(page: Page) {
    super(page, '/warehouse/entry/barcode');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)').first();
    this.itemSelect = page.locator('ng-select').nth(0);
    this.unitSelect = page.locator('ng-select').nth(1);
    this.operandInput = page.locator('input[readonly]').first();
    this.saveButton = page.locator('.card.custom-card:not(.attachments-panel) .card-header button.btn-primary');
    this.newButton = page.locator('.card.custom-card:not(.attachments-panel) .card-header button.btn-outline-secondary');
    this.placeholderMessage = page.locator('.text-muted.py-5');
  }

  async hasCreatePermission(): Promise<boolean> {
    return (await this.saveButton.count()) > 0;
  }

  async expectInitialState(): Promise<void> {
    await expect(this.itemSelect).toBeVisible();
    await expect(this.unitSelect).toHaveClass(/ng-select-disabled/);
    await expect(this.placeholderMessage).toBeVisible();
  }
}
