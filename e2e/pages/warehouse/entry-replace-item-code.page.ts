import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the Replace Item Code screen
 * (/warehouse/entry/replace-item-code). A destructive maintenance action: an
 * old item (@ng-select typeahead) is renamed to a new free-text code. The
 * Replace button stays disabled until both an old item and a new code exist.
 */
export class ReplaceItemCodePage extends BasePage {
  readonly card: Locator;
  readonly warningAlert: Locator;
  readonly oldItemSelect: Locator;
  readonly newCodeInput: Locator;
  readonly replaceButton: Locator;
  readonly newButton: Locator;

  constructor(page: Page) {
    super(page, '/warehouse/entry/replace-item-code');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)').first();
    this.warningAlert = page.locator('.alert.alert-warning');
    this.oldItemSelect = page.locator('ng-select').first();
    this.newCodeInput = page.locator('input.form-control[maxlength="50"]');
    this.replaceButton = page.locator('button.btn-primary');
    this.newButton = page.locator('.card.custom-card:not(.attachments-panel) .card-header button.btn-outline-secondary');
  }

  async hasExecutePermission(): Promise<boolean> {
    return (await this.replaceButton.count()) > 0;
  }
}
