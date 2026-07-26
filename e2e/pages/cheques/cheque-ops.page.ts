import { Page, Locator, expect } from '@playwright/test';
import { ChequeVoucherPage } from './cheque-voucher.base.page';
import { ENV } from '../../support/env';

export interface ChequeOpsOptions {
  /** In-app route path. */
  path: string;
  /** Backend controller name (used to build Save/Delete API paths). */
  controller: string;
  /** True when the screen has BOTH a debit and a credit required account. */
  hasDebitAcc: boolean;
  /** True for the deposit screen (deposit-type radios + cash mode). */
  hasDepositType?: boolean;
}

/**
 * Base page object for the cheque OPERATION screens — deposit, collection,
 * return, re-return, withdrawal, endorsement. These act on EXISTING cheques:
 * the first grid column is a searchable dropdown fed from `availableCheques`
 * (filtered by the cheque's current status). Selecting a cheque fills the
 * read-only amount/bank/date cells. Save posts a status change and is gated by
 * `*hasPermission="'<Screen>.Create'"`.
 */
export class ChequeOpsPage extends ChequeVoucherPage {
  readonly controller: string;
  readonly hasDebitAcc: boolean;
  readonly hasDepositType: boolean;

  constructor(page: Page, opts: ChequeOpsOptions) {
    super(page, opts.path);
    this.controller = opts.controller;
    this.hasDebitAcc = opts.hasDebitAcc;
    this.hasDepositType = !!opts.hasDepositType;
  }

  get saveApi(): string {
    return `/${this.controller}/Save`;
  }

  // ── Deposit-only ──────────────────────────────────────────────
  depositTypeRadios(): Locator {
    return this.cardBody().locator('input[type="radio"][id^="dt_"]');
  }
  cashAmountInput(): Locator {
    // Only rendered in cash-deposit mode.
    return this.cardBody().locator('.col-md-3 input[type="number"][step="0.01"]');
  }

  // ── Required (red-asterisk) account selects ───────────────────
  /** Account `ng-select`s marked required — debit+credit (2) or credit only (1). */
  requiredAccountSelects(): Locator {
    return this.cardBody().locator('div:has(> label.text-danger) ng-select');
  }

  // ── Cheque grid ───────────────────────────────────────────────
  gridRows(): Locator {
    return this.table().locator('tbody > tr');
  }
  chequeSelect(row = 0): Locator {
    return this.gridRows().nth(row).locator('.col-cheqnum ng-select');
  }
  rowAmtInput(row = 0): Locator {
    return this.gridRows().nth(row).locator('.col-amt input');
  }

  // ── ng-select dropdown panel (appended to body) ───────────────
  private panel(): Locator {
    return this.page.locator('.ng-dropdown-panel');
  }
  /** Selectable options only (excludes the disabled "No items found" row). */
  private options(): Locator {
    return this.panel().locator('.ng-option:not(.ng-option-disabled)');
  }

  /**
   * Open the cheque dropdown for a row and return the number of selectable
   * (available) cheques. Returns 0 when the list is empty.
   */
  async openChequeDropdown(row = 0): Promise<number> {
    await this.chequeSelect(row).click();
    await this.panel()
      .first()
      .waitFor({ state: 'visible', timeout: ENV.actionTimeout })
      .catch(() => {
        /* panel may not open when there is nothing to show */
      });
    return this.options().count();
  }

  /** Pick the first available cheque in the open dropdown for `row`. */
  async selectFirstCheque(row = 0): Promise<void> {
    await this.options().first().click();
    await expect(this.panel()).toBeHidden();
  }

  /** Open the account select at `index` and pick the option at `optionIndex`. */
  async selectRequiredAccount(index: number, optionIndex: number): Promise<void> {
    const sel = this.requiredAccountSelects().nth(index);
    await sel.click();
    await expect(this.panel()).toBeVisible();
    await this.options().nth(optionIndex).click();
    await expect(this.panel()).toBeHidden();
  }

  /** Build the API cleanup path for a created voucher. */
  deletePath(
    docNum: number,
    myYear: number,
    vType: number,
    depositType?: number
  ): string {
    let p = `/${this.controller}/Delete?docNum=${docNum}&myYear=${myYear}&vType=${vType}`;
    if (depositType != null) p += `&depositType=${depositType}`;
    return p;
  }
}
