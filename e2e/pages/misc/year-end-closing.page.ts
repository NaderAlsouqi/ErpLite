import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for Year-End Closing / إقفال نهاية السنة
 * (/accounting/misc/year-end-closing). A form (year, P&L account, optional
 * inventory-close block) plus Execute / Delete actions gated by *hasPermission
 * (YearEndClosing.Execute / .Delete). Both actions raise a confirmation modal
 * before doing anything. Derived from year-end-closing.component.html.
 */
export class YearEndClosingPage extends BasePage {
  readonly card: Locator;
  readonly yearInput: Locator;
  readonly pnlSelect: Locator;
  readonly closeInventoryCheck: Locator;
  readonly executeBtn: Locator;
  readonly deleteBtn: Locator;
  readonly confirmModal: Locator;
  readonly confirmBtn: Locator;
  readonly cancelBtn: Locator;

  constructor(page: Page) {
    super(page, '/accounting/misc/year-end-closing');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.yearInput = page.locator('input.year-field[type="number"]');
    this.pnlSelect = page.locator('.yec-select').first();
    this.closeInventoryCheck = page.locator('#closeInv');
    this.executeBtn = page.locator('.card-body .btn-primary');
    this.deleteBtn = page.locator('.card-body .btn-outline-danger');
    // ng-bootstrap modal body appended to <body> when shown.
    this.confirmModal = page.locator('.delete-confirm-modal');
    this.confirmBtn = this.confirmModal.locator('.btn-confirm');
    this.cancelBtn = this.confirmModal.locator('.btn-cancel');
  }

  async canExecute(): Promise<boolean> {
    return (await this.executeBtn.count()) > 0;
  }

  /** Pick the first account in the P&L ng-select dropdown. */
  async selectFirstPnlAccount(): Promise<void> {
    await this.pnlSelect.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible({ timeout: ENV.slowExpect });
    await panel.locator('.ng-option').first().click();
    await expect(panel).toBeHidden();
  }
}
