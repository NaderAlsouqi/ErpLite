import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';
import { waitForApi, waitForSpinnersGone, selectNgOption } from '../../support/helpers';

/**
 * Page object for the Permissions admin screen (/accounting/admin/permissions),
 * guarded by the `Admin.ManagePermissions` permission.
 *
 * The screen is a users × permission-actions matrix: pick a user from an
 * ng-select, then a bordered table renders one row per module and one column per
 * action verb, each cell a grant checkbox. A search box filters permissions and
 * a "view" ng-select scopes the matrix to a single system. Select-All / Clear-All
 * / Save controls appear only once a user is chosen.
 *
 * All backend calls hit /Permissions/* : `users` (user list), `matrix/{id}`
 * (the per-user grant matrix) and `set` (persist the selected grant IDs).
 */
export class PermissionsAdminPage extends BasePage {
  readonly pageHeader: Locator;
  readonly card: Locator;
  readonly cardTitle: Locator;
  readonly cardOptions: Locator;
  readonly selectAllBtn: Locator;
  readonly clearAllBtn: Locator;
  readonly saveBtn: Locator;

  readonly userSelect: Locator;
  readonly permissionSearch: Locator;
  readonly systemSelect: Locator;
  readonly dropdownPanel: Locator;

  readonly loadingSpinner: Locator;
  readonly emptyState: Locator;
  readonly noResults: Locator;

  readonly table: Locator;
  readonly moduleHeader: Locator;
  readonly actionHeaders: Locator;
  readonly actionLabels: Locator;
  readonly moduleRows: Locator;

  constructor(page: Page) {
    super(page, '/accounting/admin/permissions');

    this.pageHeader = page.locator('app-page-header');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.cardTitle = page.locator('.card.custom-card:not(.attachments-panel) .card-header .card-title');
    this.cardOptions = page.locator('.card-options');
    // Two outline buttons (Select-All has ti-check, Clear-All has ti-square) plus
    // the primary Save button — all locale-agnostic via their icon / class.
    this.selectAllBtn = this.cardOptions.locator('button:has(i.ti-check)');
    this.clearAllBtn = this.cardOptions.locator('button:has(i.ti-square)');
    this.saveBtn = this.cardOptions.locator('button.btn-primary');

    this.userSelect = page.locator('.col-md-5 ng-select');
    this.permissionSearch = page.locator('.col-md-4 input[type="text"]');
    this.systemSelect = page.locator('.col-md-3 ng-select');
    this.dropdownPanel = page.locator('.ng-dropdown-panel');

    this.loadingSpinner = page.locator('.spinner-border.text-primary');
    this.emptyState = page.locator('.card-body .text-center.text-muted.p-5');
    this.noResults = page.locator('.card-body .text-center.text-muted.p-4');

    this.table = page.locator('table.perm-table');
    this.moduleHeader = this.table.locator('thead th.perm-module-col');
    this.actionHeaders = this.table.locator('thead th.perm-action-col');
    this.actionLabels = this.table.locator('thead .perm-action-label');
    this.moduleRows = this.table.locator('tbody tr');
  }

  /** All grant checkboxes present in the body cells of the matrix. */
  get cellCheckboxes(): Locator {
    return this.table.locator('td.perm-cell input[type="checkbox"]');
  }

  /** The first non-empty grant checkbox (empty cells have no checkbox). */
  get firstCellCheckbox(): Locator {
    return this.cellCheckboxes.first();
  }

  /** The module (row-level) grant checkbox in a given data row. */
  moduleCheckbox(row: Locator): Locator {
    return row.locator('td.perm-module-col input[type="checkbox"]');
  }

  /** The header (column-level) grant checkbox of the nth action column. */
  columnCheckbox(index: number): Locator {
    return this.actionHeaders.nth(index).locator('input[type="checkbox"]');
  }

  /** Open the user picker and select the first real (non-disabled) option. */
  async selectFirstUser(): Promise<void> {
    await this.userSelect.click();
    await expect(this.dropdownPanel).toBeVisible();
    const option = this.dropdownPanel.locator('.ng-option:not(.ng-option-disabled)').first();
    await expect(option).toBeVisible();
    await waitForApi(this.page, 'Permissions/matrix', () => option.click());
    await waitForSpinnersGone(this.page);
    await expect(this.table).toBeVisible({ timeout: ENV.slowExpect });
  }

  /** Select a specific user by their login name (used by write flows). */
  async selectUserByLogin(login: string): Promise<void> {
    await waitForApi(this.page, 'Permissions/matrix', () =>
      selectNgOption(this.page, this.userSelect, login)
    );
    await waitForSpinnersGone(this.page);
    await expect(this.table).toBeVisible({ timeout: ENV.slowExpect });
  }

  /** Select the first system in the "view" scope picker. */
  async selectFirstSystem(): Promise<void> {
    await this.systemSelect.click();
    await expect(this.dropdownPanel).toBeVisible();
    await this.dropdownPanel.locator('.ng-option').first().click();
    await expect(this.dropdownPanel).toBeHidden();
  }

  /** Clear the system scope picker (× icon), restoring the full matrix. */
  async clearSystem(): Promise<void> {
    await this.systemSelect.locator('.ng-clear-wrapper').click();
  }

  async searchPermission(term: string): Promise<void> {
    await this.permissionSearch.fill(term);
  }

  async clearPermissionSearch(): Promise<void> {
    await this.permissionSearch.fill('');
  }

  /** Click Save and return the /Permissions/set network response. */
  async save() {
    return waitForApi(this.page, 'Permissions/set', () => this.saveBtn.click());
  }
}
