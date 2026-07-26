import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { waitForSpinnersGone } from '../../support/helpers';

/**
 * Shared structure for the cheque voucher screens. Every cheque screen renders a
 * `.card.custom-card:not(.attachments-panel)` with two tabs — a form (VoucherEntry) tab and a list
 * (VouchersList) tab — a data grid, and (on the list) a paginated table.
 *
 * Concrete screens extend this and add their screen-specific fields. Selectors
 * here are strictly structural (classes/ids/roles) so they survive the AR/EN
 * language switch.
 */
export class ChequeVoucherPage extends BasePage {
  constructor(page: Page, path: string) {
    super(page, path);
  }

  /** Expose the underlying Page for spec-level interactions. */
  get pw(): Page {
    return this.page;
  }

  // ── Shell / tabs ──────────────────────────────────────────────
  card(): Locator {
    return this.page.locator('.card.custom-card:not(.attachments-panel)');
  }
  tabLinks(): Locator {
    return this.page.locator('.card.custom-card:not(.attachments-panel) .card-header-tabs .nav-link');
  }
  formTabLink(): Locator {
    return this.tabLinks().nth(0);
  }
  listTabLink(): Locator {
    return this.tabLinks().nth(1);
  }
  activeTabLink(): Locator {
    return this.page.locator('.card.custom-card:not(.attachments-panel) .card-header-tabs .nav-link.active');
  }

  /** The card-body of whichever tab is currently active (only one is in the DOM). */
  cardBody(): Locator {
    return this.page.locator('.card.custom-card:not(.attachments-panel) .card-body');
  }

  // ── Tables ────────────────────────────────────────────────────
  /** The primary (outer) data table of the active tab. */
  table(): Locator {
    return this.cardBody().locator('.table-responsive table').first();
  }
  /** Header cells of the first header row (excludes nested/expanded sub-tables). */
  columnHeaders(): Locator {
    return this.table().locator('thead').first().locator('tr').first().locator('th');
  }
  bodyRows(): Locator {
    return this.table().locator('tbody > tr');
  }
  noRecordsCell(): Locator {
    return this.cardBody().locator('td.text-muted');
  }
  paginator(): Locator {
    return this.page.locator('mat-paginator');
  }

  // ── Shared filters / controls ─────────────────────────────────
  listRefreshButton(): Locator {
    return this.cardBody().locator('button:has(.ti-refresh)');
  }
  /** The financial-year number input (present on both form and list rows). */
  yearInput(): Locator {
    return this.cardBody().locator('.year-field input[type="number"]').first();
  }

  // ── Action buttons (form tab) ─────────────────────────────────
  actionRow(): Locator {
    return this.cardBody().locator('.d-flex.gap-2.flex-wrap').last();
  }
  /** Save button — gated by a `*hasPermission="'<Screen>.Create'"` directive. */
  saveButton(): Locator {
    return this.actionRow().locator('button.btn-primary');
  }
  /** Delete button — gated by a `*hasPermission="'<Screen>.Delete'"` directive. */
  deleteButton(): Locator {
    return this.actionRow().locator('button.btn-outline-danger');
  }
  addLineButton(): Locator {
    return this.cardBody().locator('button.btn-outline-primary').first();
  }

  // ── High-level helpers ────────────────────────────────────────
  async expectRendered(): Promise<void> {
    await expect(this.card()).toBeVisible();
    await expect(this.tabLinks()).toHaveCount(2);
    await expect(this.formTabLink()).toHaveClass(/active/);
  }

  async openList(): Promise<void> {
    await this.listTabLink().click();
    await expect(this.listTabLink()).toHaveClass(/active/);
    await waitForSpinnersGone(this.page);
  }

  async openForm(): Promise<void> {
    await this.formTabLink().click();
    await expect(this.formTabLink()).toHaveClass(/active/);
    await waitForSpinnersGone(this.page);
  }
}
