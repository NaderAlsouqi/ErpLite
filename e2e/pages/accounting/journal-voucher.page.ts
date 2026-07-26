import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { buttonByNames, waitForSpinnersGone } from '../../support/helpers';
import { ENV } from '../../support/env';

interface CoaLite {
  no: number;
  belong: number | null;
}

/**
 * Page object for the Journal Voucher screen (سند قيد) — /accounting/vouchers/journal.
 *
 * Models the two card-header tabs (Voucher Entry / Vouchers List), the multi-line
 * debit/credit grid with its totals footer, and the DEBIT=CREDIT balance indicator.
 * Selectors are derived from journal-vouchers.component.html — structural only, no
 * dependence on translated strings.
 */
export class JournalVoucherPage extends BasePage {
  /** The two card-header tabs (anchors). */
  readonly formTab: Locator;
  readonly listTab: Locator;

  /** Header inputs. */
  readonly yearInput: Locator;
  readonly docNumInput: Locator;
  readonly dateInput: Locator;

  /** Balance indicator alert (success / danger / secondary). */
  readonly balanceAlert: Locator;

  /** Action buttons (permission-gated — always guard with count()). */
  readonly saveButton: Locator;
  readonly newButton: Locator;
  readonly deleteButton: Locator;
  readonly addLineButton: Locator;

  /** Vouchers-list search button. */
  readonly searchButton: Locator;

  constructor(page: Page) {
    super(page, '/accounting/vouchers/journal');

    this.formTab = page.locator('.nav-tabs .nav-link').nth(0);
    this.listTab = page.locator('.nav-tabs .nav-link').nth(1);

    this.yearInput = page.locator('input[name="myYear"]').first();
    this.docNumInput = page.locator('input[name="docNum"]').first();
    this.dateInput = page.locator('input[name="voucherDate"]').first();

    this.balanceAlert = page.locator('.alert').first();

    this.saveButton = buttonByNames(page, [/save|حفظ/i]);
    this.newButton = buttonByNames(page, [/^new|جديد/i]);
    this.deleteButton = page.locator('button.btn-outline-danger');
    this.addLineButton = page.locator('button.btn-outline-primary.mb-4');

    this.searchButton = buttonByNames(page, [/search|بحث/i]);
  }

  /** The lines grid (the first table rendered inside the active card body). */
  linesTable(): Locator {
    return this.page.locator('.card-body table').first();
  }

  lineRows(): Locator {
    return this.linesTable().locator('tbody tr');
  }

  totalDebitCell(): Locator {
    return this.linesTable().locator('tfoot td.text-success');
  }

  totalCreditCell(): Locator {
    return this.linesTable().locator('tfoot td.text-danger');
  }

  /** The account @ng-select in a given data row (the first ng-select of the row). */
  rowAccountSelect(rowIndex: number): Locator {
    return this.lineRows().nth(rowIndex).locator('ng-select').first();
  }

  removeLineButton(rowIndex: number): Locator {
    return this.lineRows().nth(rowIndex).locator('button.btn-outline-danger');
  }

  async addLine(): Promise<void> {
    const before = await this.lineRows().count();
    await this.addLineButton.click();
    await expect(this.lineRows()).toHaveCount(before + 1);
  }

  async setLineDebit(rowIndex: number, value: number): Promise<void> {
    const inputs = this.lineRows().nth(rowIndex).locator('input[type=number]');
    await inputs.nth(0).fill(String(value));
    await inputs.nth(0).blur();
  }

  async setLineCredit(rowIndex: number, value: number): Promise<void> {
    const inputs = this.lineRows().nth(rowIndex).locator('input[type=number]');
    await inputs.nth(1).fill(String(value));
    await inputs.nth(1).blur();
  }

  /** Open a row's account @ng-select and pick an option by index. Returns false if empty. */
  async pickAccount(rowIndex: number, optionIndex = 0): Promise<boolean> {
    const select = this.rowAccountSelect(rowIndex);
    await select.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    const options = panel.locator('.ng-option');
    if ((await options.count()) <= optionIndex) {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await options.nth(optionIndex).click();
    await expect(panel).toBeHidden();
    return true;
  }

  /**
   * Postable (leaf) account numbers, mirroring the app's own `leafAccounts`
   * rule (an account is a leaf iff its `no` is not any other account's parent
   * `belong`). Unlike cash-payment, the journal account picker lists ALL
   * accounts — including non-postable parents the backend rejects — so write
   * tests must seed real leaves rather than the first dropdown option.
   */
  async leafAccountNos(limit = 2): Promise<number[]> {
    return this.page.evaluate(
      async ({ apiURL, limit }) => {
        const token = localStorage.getItem('token') ?? sessionStorage.getItem('token');
        const res = await fetch(`${apiURL}/ChartOfAccounts/GetAll`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return [] as number[];
        const accounts = (await res.json()) as Array<{ no: number; belong: number | null }>;
        const parents = new Set(
          accounts.map(a => a.belong).filter((b): b is number => b != null)
        );
        return accounts
          .filter(a => !parents.has(a.no))
          .map(a => a.no)
          .slice(0, limit);
      },
      { apiURL: ENV.apiURL, limit }
    );
  }

  /**
   * Open a row's account @ng-select, search for a specific account number and
   * select it. Returns false if the number produces no matching option.
   */
  async pickAccountByNo(rowIndex: number, accNo: number): Promise<boolean> {
    const select = this.rowAccountSelect(rowIndex);
    await select.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    await select.locator('input[type="text"]').fill(String(accNo));
    // Option label is rendered as "{no} – {name}"; the trailing " –" pins the
    // match to the exact number (not a longer number that merely contains it).
    const option = panel.locator('.ng-option').filter({ hasText: `${accNo} –` }).first();
    if ((await option.count()) === 0) {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await option.click();
    await expect(panel).toBeHidden();
    return true;
  }

  async switchToList(): Promise<void> {
    await this.listTab.click();
    await waitForSpinnersGone(this.page);
  }

  async switchToForm(): Promise<void> {
    await this.formTab.click();
  }

  /** True when the balance indicator is in its "balanced" (success) state. */
  async isBalanced(): Promise<boolean> {
    const cls = (await this.balanceAlert.getAttribute('class')) ?? '';
    return /alert-success/.test(cls);
  }

  async expectBalanced(): Promise<void> {
    await expect(this.balanceAlert).toHaveClass(/alert-success/, { timeout: ENV.slowExpect });
  }

  async expectUnbalanced(): Promise<void> {
    await expect(this.balanceAlert).toHaveClass(/alert-danger/, { timeout: ENV.slowExpect });
  }
}
