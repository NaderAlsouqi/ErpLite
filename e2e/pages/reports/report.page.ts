import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';
import { waitForSpinnersGone } from '../../support/helpers';

/**
 * Reusable page object for the accounting "generate a report" screens.
 *
 * These screens share one skeleton (mirrored from the legacy VB6 forms):
 *   - a filter panel bound with `[(ngModel)]` + `(change)="onFilterChange()"`,
 *   - a primary "Generate" button in the card header,
 *   - an `<app-report-export>` control (sometimes behind `*hasPermission`),
 *   - a results area (`.<prefix>-print-area`) that only renders once a report
 *     has been fetched, and is CLEARED whenever any filter changes.
 *
 * Concrete reports subclass this and add their own filter locators; the light
 * reports use it directly via a `{ path, resultsRoot }` pair.
 */
export class ReportPage extends BasePage {
  constructor(
    page: Page,
    path: string,
    protected readonly resultsRootSelector: string
  ) {
    super(page, path);
  }

  /** The outer feature card (never the nested stock-grid card). */
  get card(): Locator {
    return this.page.locator('.custom-card').first();
  }

  /** The outer card header that holds the generate + export controls. */
  get header(): Locator {
    return this.card.locator('.card-header').first();
  }

  /** Primary action button in the header (Generate / Search). */
  get generateButton(): Locator {
    return this.header.locator('button.btn-primary');
  }

  /** The export control wrapper — may be absent when gated by permission. */
  get exportControl(): Locator {
    return this.header.locator('app-report-export');
  }

  /** The main (print) button inside the export control. */
  get exportMainButton(): Locator {
    return this.exportControl.locator('button.btn-info').first();
  }

  /** Container that appears only after a report has been generated. */
  get resultsRoot(): Locator {
    return this.page.locator(this.resultsRootSelector);
  }

  get resultsTable(): Locator {
    return this.resultsRoot.locator('table');
  }

  resultRows(): Locator {
    return this.resultsRoot.locator('table tbody tr');
  }

  /** The "no data" info alert rendered inside the results area. */
  get emptyAlert(): Locator {
    return this.resultsRoot.locator('.alert');
  }

  /** Nth `<ng-select>` in the card body (0-based). */
  ngSelect(index = 0): Locator {
    return this.card.locator('ng-select').nth(index);
  }

  /** True when the export control is present (i.e. the account has the perm). */
  async hasExport(): Promise<boolean> {
    return (await this.exportControl.count()) > 0;
  }

  /** Click Generate and wait for the loading spinner to settle. */
  async generate(): Promise<void> {
    await this.generateButton.click();
    await waitForSpinnersGone(this.page);
  }

  /** Assert the results area rendered (either a table or an empty-state). */
  async expectResultsShown(): Promise<void> {
    await expect(this.resultsRoot).toBeVisible({ timeout: ENV.navTimeout });
  }

  /**
   * Open an `@ng-select` and pick its first non-disabled option.
   * Returns false (and closes the panel) when the dropdown has no options —
   * lets callers skip gracefully on an empty shared tenant.
   */
  async selectFirstOption(ngSelect: Locator): Promise<boolean> {
    await ngSelect.scrollIntoViewIfNeeded();
    await ngSelect.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    const options = panel.locator('.ng-option:not(.ng-option-disabled)');
    await options
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => {
        /* no options loaded */
      });
    if ((await options.count()) === 0) {
      await this.page.keyboard.press('Escape');
      return false;
    }
    await options.first().click();
    await expect(panel).toBeHidden();
    return true;
  }
}
