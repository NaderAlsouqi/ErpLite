import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Config for the two structurally-identical GL document (un)posting screens.
 * Both share the same template: a year input, نوع المستند / نوع التسلسل
 * ng-selects, a Date|DocNum radio pair, a date/doc-num range, a Fetch button,
 * and a 4-column results table with a post/unpost action in the bottom bar.
 */
export interface DocPostingConfig {
  title: string;
  path: string;
  /** GET endpoint substring used to match the fetch call. */
  fetchApi: string;
  /** POST endpoint substring used to match the post/unpost call. */
  actionApi: string;
  /** Bootstrap class of the bottom-bar action button (btn-success | btn-danger). */
  actionBtnClass: string;
}

/**
 * Reusable page object for document-posting / document-unposting. Selectors are
 * derived from document-posting.component.html and document-unposting.component.html.
 */
export class DocPostingPage extends BasePage {
  readonly card: Locator;
  readonly fetchBtn: Locator;
  readonly yearInput: Locator;
  readonly docTypeSelect: Locator;
  readonly serialSelect: Locator;
  readonly filterByDate: Locator;
  readonly filterByDocNum: Locator;
  readonly dateFrom: Locator;
  readonly dateTo: Locator;
  readonly docNumFrom: Locator;
  readonly docNumTo: Locator;
  readonly resultTable: Locator;
  readonly headers: Locator;
  readonly rows: Locator;
  readonly emptyRow: Locator;
  readonly docCount: Locator;
  readonly actionBtn: Locator;

  constructor(
    page: Page,
    readonly config: DocPostingConfig
  ) {
    super(page, config.path);
    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.fetchBtn = page.locator('.card.custom-card:not(.attachments-panel) .card-header .btn-primary');
    this.yearInput = page.locator('input.year-field[type="number"]');
    this.docTypeSelect = page.locator('.card-body ng-select').nth(0);
    this.serialSelect = page.locator('.card-body ng-select').nth(1);
    this.filterByDate = page.locator('.dp-filter-box input[value="Date"]');
    this.filterByDocNum = page.locator('.dp-filter-box input[value="DocNum"]');
    this.dateFrom = page.locator('.card-body input[type="date"]').nth(0);
    this.dateTo = page.locator('.card-body input[type="date"]').nth(1);
    this.docNumFrom = page.locator('.card-body input[type="number"]').nth(1);
    this.docNumTo = page.locator('.card-body input[type="number"]').nth(2);
    this.resultTable = page.locator('table.dp-table');
    this.headers = this.resultTable.locator('thead th');
    this.rows = this.resultTable.locator('tbody tr');
    this.emptyRow = this.resultTable.locator('tbody tr td[colspan]');
    this.docCount = page.locator('.dp-count-value');
    this.actionBtn = page.locator('.dp-post-btn');
  }

  /** Choose the DocNum filter radio, revealing the doc-num range inputs. */
  async selectDocNumMode(): Promise<void> {
    await this.filterByDocNum.check();
    await expect(this.docNumFrom).toBeVisible({ timeout: ENV.slowExpect });
  }

  async selectDateMode(): Promise<void> {
    await this.filterByDate.check();
    await expect(this.dateFrom).toBeVisible({ timeout: ENV.slowExpect });
  }
}
