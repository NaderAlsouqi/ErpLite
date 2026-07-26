import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { buttonByNames, waitForSpinnersGone } from '../../support/helpers';
import { ENV } from '../../support/env';

/**
 * Which family of voucher screen this page models:
 *  - 'grid'    → two-grid (debit/credit) balance vouchers: cash-payment, cheques-payment.
 *  - 'receipt' → header-style receipt vouchers: receipt-vouchers, virtual/receipt-vouchers.
 */
export type VoucherVariant = 'grid' | 'receipt';

/**
 * Generic page object shared by the receipt / cash-payment / cheques-payment
 * screens. All three expose a "form" and (for grid + receipt) a "list" surface;
 * the grid family additionally has a debit grid, a credit grid, and a balance bar.
 *
 * Selectors are structural (classes/roles/form order), derived directly from each
 * component's HTML, so they survive Arabic/English locale switches.
 */
export class VoucherFormPage extends BasePage {
  readonly variant: VoucherVariant;

  /** The primary feature card. */
  readonly card: Locator;

  /** Tab controls (present on grid + receipt). */
  readonly formTab: Locator;
  readonly listTab: Locator;

  /** Balance bar (grid variant only). */
  readonly balanceBar: Locator;

  /** Primary save/submit button. Permission-gated — guard with count(). */
  readonly saveButton: Locator;

  /** The vouchers-list search button. */
  readonly searchButton: Locator;

  constructor(page: Page, path: string, variant: VoucherVariant) {
    super(page, path);
    this.variant = variant;
    this.card = page.locator('.card.custom-card').first();

    if (variant === 'grid') {
      // cash-payment / cheques-payment: two top toggle buttons.
      const tabs = page.locator('.row.mb-3 .col-12 button');
      this.formTab = tabs.nth(0);
      this.listTab = tabs.nth(1);
      // The Save button carries the shared General.Save label.
      this.saveButton = buttonByNames(page, [/save|حفظ/i]);
    } else {
      // receipt-vouchers: bootstrap nav-tabs anchors.
      const tabs = page.locator('.nav-tabs .nav-link');
      this.formTab = tabs.nth(0);
      this.listTab = tabs.nth(1);
      // Receipt submit is the lone .btn-success in the form.
      this.saveButton = page.locator('button.btn-success');
    }

    this.balanceBar = page.locator('.balance-bar');
    this.searchButton = buttonByNames(page, [/search|بحث/i]);
  }

  async switchToList(): Promise<void> {
    await this.listTab.click();
    await waitForSpinnersGone(this.page);
  }

  async switchToForm(): Promise<void> {
    await this.formTab.click();
  }

  // ─── Grid-variant helpers (cash-payment / cheques-payment) ──────────────

  /** All debit/credit line tables in the active form (debit=0, credit=1). */
  private grids(): Locator {
    return this.page.locator('table.lines-table');
  }

  debitGrid(): Locator {
    return this.grids().nth(0);
  }

  creditGrid(): Locator {
    return this.grids().nth(1);
  }

  debitRows(): Locator {
    return this.debitGrid().locator('tbody tr');
  }

  creditRows(): Locator {
    return this.creditGrid().locator('tbody tr');
  }

  addDebitLineButton(): Locator {
    return this.debitGrid().locator('tfoot button.btn-outline-primary');
  }

  addCreditLineButton(): Locator {
    return this.creditGrid().locator('tfoot button.btn-outline-primary');
  }

  totalDebitCell(): Locator {
    return this.debitGrid().locator('tfoot td.text-primary');
  }

  totalCreditCell(): Locator {
    return this.creditGrid().locator('tfoot td.text-danger');
  }

  async addDebitLine(): Promise<void> {
    const before = await this.debitRows().count();
    await this.addDebitLineButton().click();
    await expect(this.debitRows()).toHaveCount(before + 1);
  }

  async addCreditLine(): Promise<void> {
    const before = await this.creditRows().count();
    await this.addCreditLineButton().click();
    await expect(this.creditRows()).toHaveCount(before + 1);
  }

  /** The amount input in a grid row (the first numeric input). */
  async setDebitAmount(rowIndex: number, value: number): Promise<void> {
    const input = this.debitRows().nth(rowIndex).locator('input[type=number]').first();
    await input.fill(String(value));
    await input.blur();
  }

  async setCreditAmount(rowIndex: number, value: number): Promise<void> {
    const input = this.creditRows().nth(rowIndex).locator('input[type=number]').first();
    await input.fill(String(value));
    await input.blur();
  }

  /** The cheque-number input in a cheques-payment credit row (second numeric input). */
  async setCreditChequeNo(rowIndex: number, value: number): Promise<void> {
    const input = this.creditRows().nth(rowIndex).locator('input[type=number]').nth(1);
    await input.fill(String(value));
    await input.blur();
  }

  /** Open a grid row's account @ng-select and pick an option by index. */
  async pickGridAccount(
    grid: 'debit' | 'credit',
    rowIndex: number,
    optionIndex = 0
  ): Promise<boolean> {
    const rows = grid === 'debit' ? this.debitRows() : this.creditRows();
    const select = rows.nth(rowIndex).locator('ng-select').first();
    await select.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    // Exclude the disabled "No items found" placeholder (rendered as
    // `.ng-option.ng-option-disabled`) so an empty list returns false instead
    // of clicking a non-selectable row that never closes the panel.
    const options = panel.locator('.ng-option:not(.ng-option-disabled)');
    if ((await options.count()) <= optionIndex) {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await options.nth(optionIndex).click();
    await expect(panel).toBeHidden();
    return true;
  }

  async isBalanced(): Promise<boolean> {
    const cls = (await this.balanceBar.getAttribute('class')) ?? '';
    return /(^|\s)balanced/.test(cls) && !/unbalanced/.test(cls);
  }

  async expectBalanced(): Promise<void> {
    await expect(this.balanceBar).toHaveClass(/(^|\s)balanced/, { timeout: ENV.slowExpect });
  }

  async expectUnbalanced(): Promise<void> {
    await expect(this.balanceBar).toHaveClass(/unbalanced/, { timeout: ENV.slowExpect });
  }

  // ─── Receipt-variant helpers (receipt-vouchers) ─────────────────────────

  /** Form-tab @ng-selects in DOM order: invoice, cash acct, cheque acct, customer. */
  receiptSelect(index: number): Locator {
    return this.card.locator('.card-body ng-select').nth(index);
  }

  /** Form-tab numeric inputs in DOM order: amount, cashAmount, totalCheques(readonly). */
  receiptNumberInput(index: number): Locator {
    return this.card.locator('.card-body input[type=number]').nth(index);
  }

  /** The Reset button (the lone .btn-secondary on the receipt form). */
  receiptResetButton(): Locator {
    return this.card.locator('button.btn-secondary').first();
  }

  /** AddCash / AddCheque primary buttons (permission-gated). */
  receiptPrimaryButtons(): Locator {
    return this.card.locator('.card-body .d-flex button.btn-primary');
  }

  /** Open a receipt @ng-select and pick an option by index. */
  async pickReceiptOption(selectIndex: number, optionIndex = 0): Promise<boolean> {
    const select = this.receiptSelect(selectIndex);
    await select.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    // Exclude the disabled "No items found" placeholder (rendered as
    // `.ng-option.ng-option-disabled`) so an empty list returns false instead
    // of clicking a non-selectable row that never closes the panel.
    const options = panel.locator('.ng-option:not(.ng-option-disabled)');
    if ((await options.count()) <= optionIndex) {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await options.nth(optionIndex).click();
    await expect(panel).toBeHidden();
    return true;
  }
}
