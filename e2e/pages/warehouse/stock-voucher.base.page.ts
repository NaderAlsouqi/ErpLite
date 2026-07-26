import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';
import { waitForSpinnersGone } from '../../support/helpers';

/**
 * Static description of a stock-voucher screen. The inbound / outbound / damage /
 * transfer vouchers all share the same page skeleton (tabbed card, header block,
 * line-items grid, totals, action bar, vouchers-list tab). Only a handful of
 * per-screen facts differ, captured here so the specs stay declarative.
 */
export interface StockVoucherConfig {
  /** In-app route path (e.g. '/warehouse/vouchers/inbound'). */
  path: string;
  /** Permission prefix used by *hasPermission (e.g. 'Inbound' → Inbound.Create). */
  perm: string;
  /** URL substring of this voucher's API controller (e.g. 'InboundVoucher'). */
  api: string;
  /** True when the per-line Cost cell is an editable numeric input
   *  (inbound/outbound/damage). Transfer's cost is a readonly weighted average. */
  costEditable: boolean;
  /** Zero-based index of the per-line Store @ng-select inside a grid row, or
   *  null when the store lives on the header instead (transfer). */
  lineStoreIndex: number | null;
}

/**
 * Base page object for the four warehouse stock vouchers. Every selector is
 * structural (ids/classes/DOM order/icons) so it survives the Arabic⇄English
 * locale switch. Permission-gated controls (Save/Delete/Print, cost columns) are
 * exposed as locators the specs guard with `.count()`.
 */
export abstract class StockVoucherPage extends BasePage {
  readonly card: Locator;
  readonly tabs: Locator;
  readonly formTab: Locator;
  readonly listTab: Locator;

  // ── header ──
  readonly yearInput: Locator;
  readonly serialSelect: Locator;
  readonly docNoInput: Locator;
  readonly loadBtn: Locator;
  readonly dateInput: Locator;
  readonly notesInput: Locator;

  // ── grid ──
  readonly grid: Locator;
  readonly gridHead: Locator;
  readonly gridHeadCells: Locator;
  readonly gridRows: Locator;
  readonly addRowBtn: Locator;
  readonly bringBtn: Locator;

  // ── totals ──
  readonly totalWeightInput: Locator;
  readonly grandTotalInput: Locator;

  // ── action bar ──
  readonly saveBtn: Locator;
  readonly deleteBtn: Locator;
  readonly glBtn: Locator;
  readonly newBtn: Locator;

  // ── vouchers list tab ──
  readonly listSearch: Locator;
  readonly listRefreshBtn: Locator;
  readonly listCount: Locator;
  readonly listTable: Locator;
  readonly listHeaderCells: Locator;
  readonly listRows: Locator;

  // ── overlays (bring / GL / batch modals share .inb-overlay) ──
  readonly overlay: Locator;

  constructor(page: Page, readonly cfg: StockVoucherConfig) {
    super(page, cfg.path);

    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.tabs = page.locator('.nav-tabs .nav-link');
    this.formTab = this.tabs.nth(0);
    this.listTab = this.tabs.nth(1);

    this.yearInput = page.locator('input.year-field.form-control');
    // The serial @ng-select is always the first @ng-select inside the card body.
    this.serialSelect = page.locator('.card-body ng-select').first();
    this.docNoInput = page.locator('input[maxlength="15"]');
    this.loadBtn = page.locator('input[maxlength="15"] ~ button');
    // Header date is the first date input (grid expiry inputs come later in DOM).
    this.dateInput = page.locator('.card-body input[type="date"]').first();
    this.notesInput = page.locator('input[maxlength="100"]');

    this.grid = page.locator('.dgrid');
    this.gridHead = page.locator('.dgrid-head');
    this.gridHeadCells = page.locator('.dgrid-head > div');
    this.gridRows = page.locator('.dgrid-row');
    this.addRowBtn = page.locator('button:has(.ti-plus)');
    this.bringBtn = page.locator('button:has(.ti-package-import)');

    this.totalWeightInput = page.locator('.row.g-3.mt-1.mb-2 input').first();
    this.grandTotalInput = page.locator('.row.g-3.mt-1.mb-2 input.fw-bold');

    this.saveBtn = page.locator('.action-buttons button.btn-primary');
    this.deleteBtn = page.locator('.action-buttons button.btn-danger');
    this.glBtn = page.locator('.action-buttons button.btn-warning');
    this.newBtn = page.locator('.action-buttons button.btn-secondary');

    this.listSearch = page.locator('.row.mb-3 input.form-control');
    this.listRefreshBtn = page.locator('.row.mb-3 button');
    this.listCount = page.locator('.row.mb-3 .text-muted');
    this.listTable = page.locator('.voucher-list table');
    this.listHeaderCells = page.locator('.voucher-list thead th');
    this.listRows = page.locator('.voucher-list tbody tr');

    this.overlay = page.locator('.inb-overlay');
  }

  // ─── navigation between the two tabs ───────────────────────────────────────
  async openList(): Promise<void> {
    await this.listTab.click();
    await waitForSpinnersGone(this.page);
    await expect(this.listTable).toBeVisible({ timeout: ENV.navTimeout });
  }

  async openForm(): Promise<void> {
    await this.formTab.click();
    await expect(this.grid).toBeVisible();
  }

  // ─── cost-column (permission) awareness ────────────────────────────────────
  /** The `.no-cost` modifier is applied to the grid when the account lacks
   *  <perm>.ViewCost, hiding the Cost + line-Total columns and the grand total. */
  async hasCostColumns(): Promise<boolean> {
    const cls = (await this.grid.getAttribute('class')) ?? '';
    return !cls.split(/\s+/).includes('no-cost');
  }

  // ─── @ng-select helpers (mirroring the accounting page objects) ────────────
  /** Count the selectable (non-disabled) options in an @ng-select, then close it. */
  async optionCount(select: Locator): Promise<number> {
    await select.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    const n = await panel.locator('.ng-option:not(.ng-option-disabled)').count();
    await this.page.keyboard.press('Escape');
    await expect(panel).toBeHidden().catch(() => {});
    return n;
  }

  /** Pick option `optionIndex` from an @ng-select. Returns false (leaving it
   *  closed) when there aren't that many options. */
  async pickOption(select: Locator, optionIndex = 0): Promise<boolean> {
    await select.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    const options = panel.locator('.ng-option:not(.ng-option-disabled)');
    if ((await options.count()) <= optionIndex) {
      await this.page.keyboard.press('Escape');
      await expect(panel).toBeHidden().catch(() => {});
      return false;
    }
    await options.nth(optionIndex).click();
    await expect(panel).toBeHidden();
    return true;
  }

  /** Pick the first option and return its visible text (or null when empty). */
  async pickFirstOption(select: Locator): Promise<string | null> {
    await select.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    const first = panel.locator('.ng-option:not(.ng-option-disabled)').first();
    if ((await first.count()) === 0) {
      await this.page.keyboard.press('Escape');
      return null;
    }
    const txt = (await first.textContent())?.trim() ?? '';
    await first.click();
    await expect(panel).toBeHidden();
    return txt;
  }

  /** Whether a select currently shows a chosen value. */
  hasValue(select: Locator): Locator {
    return select.locator('.ng-value');
  }

  // ─── serial / header ───────────────────────────────────────────────────────
  async serialOptionCount(): Promise<number> {
    return this.optionCount(this.serialSelect);
  }

  /** Select the first serial type; the DocNo then auto-fills from the API. */
  async selectFirstSerial(): Promise<boolean> {
    return this.pickOption(this.serialSelect, 0);
  }

  // ─── grid row accessors ────────────────────────────────────────────────────
  row(i: number): Locator {
    return this.gridRows.nth(i);
  }

  rowItemSelect(i: number): Locator {
    return this.row(i).locator('ng-select').nth(0);
  }

  rowUnitSelect(i: number): Locator {
    return this.row(i).locator('ng-select').nth(1);
  }

  rowStoreSelect(i: number): Locator | null {
    return this.cfg.lineStoreIndex == null
      ? null
      : this.row(i).locator('ng-select').nth(this.cfg.lineStoreIndex);
  }

  rowQtyInput(i: number): Locator {
    return this.row(i).locator('input[type="number"]').nth(0);
  }

  rowWeightInput(i: number): Locator {
    return this.row(i).locator('input[type="number"]').nth(1);
  }

  /** Editable Cost cell (inbound/outbound/damage only, and only with ViewCost). */
  rowCostInput(i: number): Locator {
    return this.row(i).locator('input[type="number"]').nth(2);
  }

  /** Readonly line-total cell (last right-aligned readonly text input in the row). */
  rowTotalInput(i: number): Locator {
    return this.row(i).locator('input.text-end[readonly]').last();
  }

  async addRow(): Promise<void> {
    const before = await this.gridRows.count();
    await this.addRowBtn.click();
    await expect(this.gridRows).toHaveCount(before + 1);
  }

  async removeRow(i: number): Promise<void> {
    await this.row(i).locator('button:has(.ti-trash)').click();
  }

  async setWeight(i: number, value: number): Promise<void> {
    const input = this.rowWeightInput(i);
    await input.fill(String(value));
    await input.blur();
  }

  async setQty(i: number, value: number): Promise<void> {
    const input = this.rowQtyInput(i);
    await input.fill(String(value));
    await input.blur();
  }

  async setCost(i: number, value: number): Promise<void> {
    const input = this.rowCostInput(i);
    await input.fill(String(value));
    await input.blur();
  }

  /** Read a readonly numeric total input as a number. */
  async numberValueOf(input: Locator): Promise<number> {
    const raw = (await input.inputValue()).replace(/[^0-9.\-]/g, '');
    return raw === '' ? NaN : parseFloat(raw);
  }
}
