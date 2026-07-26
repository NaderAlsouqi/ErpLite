import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Static description of one of the accounting "definition" CRUD grids
 * (Banks, Currencies, Taxes, Cost-Centers, Account-Groups, Stamps).
 *
 * All six components are built from the same template: a card with two tabs
 * (an entry form + a list), a No/Arabic/English trio of required fields, a
 * Save/New/Delete action row (Save + Delete gated by *hasPermission), a search
 * box over the list, and an app-confirmation-modal for deletes. This config
 * captures only the parts that differ between them.
 */
export interface CrudGridConfig {
  /** Human title used in the describe() block. */
  title: string;
  /** In-app route, e.g. /accounting/definitions/banks. */
  path: string;
  /** Backend resource segment used to match API calls, e.g. "Banks". */
  apiResource: string;
  /** Permission key gating the Save (create/update) button. */
  createPermission: string;
  /** Permission key gating the Delete button. */
  deletePermission: string;
  /** Number of <th> columns in the list table. */
  columnCount: number;
  /**
   * When set, the create→edit→delete write flow is marked test.fixme with this
   * reason (a known backend defect that makes the flow un-completable). Leave
   * undefined for grids whose write flow works end-to-end.
   */
  knownWriteBug?: string;
}

/**
 * Reusable page object for the six structurally-identical accounting
 * definition grids. Selectors are derived from the actual component templates
 * (banks/currencies/taxes/cost-centers/account-groups/stamps) and are purely
 * structural so they survive translation and the ar/en locales.
 */
export class CrudGridPage extends BasePage {
  readonly card: Locator;
  readonly tabs: Locator;
  readonly reportExport: Locator;
  readonly refreshBtn: Locator;

  constructor(
    page: Page,
    readonly config: CrudGridConfig
  ) {
    super(page, config.path);
    // The main-layout injects a global attachments card (`.card.custom-card
    // .attachments-panel`) into every page, so scope to the feature card only.
    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.tabs = page.locator('.nav-tabs .nav-link');
    this.reportExport = page.locator('app-report-export');
    this.refreshBtn = page.locator('.card-header .btn-outline-secondary');
  }

  // ── Panels (only one card-body is rendered at a time via *ngIf) ────────────

  /** The entry-form card-body (the one that owns the action buttons). */
  get formBody(): Locator {
    return this.page.locator('.card-body', { has: this.page.locator('.action-buttons') });
  }

  /** The list card-body (the one that owns the data table). */
  get listBody(): Locator {
    return this.page.locator('.card-body', { has: this.page.locator('table') });
  }

  // ── Form controls ─────────────────────────────────────────────────────────

  get keyInput(): Locator {
    return this.formBody.locator('input.form-control[type="number"]').first();
  }

  get arabicInput(): Locator {
    return this.formBody.locator('input.form-control[type="text"]').nth(0);
  }

  get englishInput(): Locator {
    return this.formBody.locator('input.form-control[type="text"]').nth(1);
  }

  get saveBtn(): Locator {
    return this.page.locator('.action-buttons .btn-primary');
  }

  get newBtn(): Locator {
    return this.page.locator('.action-buttons .btn-secondary');
  }

  get deleteBtn(): Locator {
    return this.page.locator('.action-buttons .btn-danger');
  }

  // ── List controls ─────────────────────────────────────────────────────────

  get searchInput(): Locator {
    return this.listBody.locator('.input-group input.form-control').first();
  }

  get clearSearchBtn(): Locator {
    return this.listBody.locator('.input-group .btn-outline-secondary');
  }

  get table(): Locator {
    return this.listBody.locator('table');
  }

  get headers(): Locator {
    return this.table.locator('thead th');
  }

  get rows(): Locator {
    return this.table.locator('tbody tr');
  }

  /** The "no records" placeholder row (a single <td colspan>). */
  get emptyStateRow(): Locator {
    return this.table.locator('tbody tr td[colspan]');
  }

  // ── Delete confirmation modal (ng-bootstrap, appended to <body>) ───────────

  get confirmModal(): Locator {
    return this.page.locator('.delete-confirm-modal');
  }

  get confirmDeleteBtn(): Locator {
    return this.confirmModal.locator('.btn-confirm');
  }

  get cancelDeleteBtn(): Locator {
    return this.confirmModal.locator('.btn-cancel');
  }

  // ── Tab navigation ──────────────────────────────────────────────────────────

  async switchToForm(): Promise<void> {
    await this.tabs.nth(0).click();
    await expect(this.keyInput).toBeVisible({ timeout: ENV.slowExpect });
  }

  async switchToList(): Promise<void> {
    await this.tabs.nth(1).click();
    await expect(this.table).toBeVisible({ timeout: ENV.slowExpect });
  }

  // ── Form actions ────────────────────────────────────────────────────────────

  async clickNew(): Promise<void> {
    await this.newBtn.click();
  }

  async setKey(value: string): Promise<void> {
    await this.keyInput.fill(value);
    await this.keyInput.blur(); // fires (change)->onNoChange
  }

  async setArabic(value: string): Promise<void> {
    await this.arabicInput.fill(value);
  }

  async setEnglish(value: string): Promise<void> {
    await this.englishInput.fill(value);
  }

  // ── List actions ────────────────────────────────────────────────────────────

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }

  rowsWithText(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  // ── Assertions / helpers ─────────────────────────────────────────────────────

  async expectSuccessToast(): Promise<void> {
    await expect(this.toast('success').first()).toBeVisible({ timeout: ENV.slowExpect });
  }

  async expectWarningToast(): Promise<void> {
    await expect(
      this.page.locator('.toast-warning, .toast-error').first()
    ).toBeVisible({ timeout: ENV.slowExpect });
  }
}
