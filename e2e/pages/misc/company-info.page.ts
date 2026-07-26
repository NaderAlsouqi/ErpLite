import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';
import { goto, waitForSpinnersGone } from '../../support/helpers';

/**
 * Page object for Company Information / معلومات الشركة (/accounting/system/company-info).
 * Route is guarded by PermissionGuard (Comf.View); the Save button is separately
 * gated by *hasPermission="Comf.Edit". Derived from company-info.component.html.
 */
export class CompanyInfoPage extends BasePage {
  readonly card: Locator;
  readonly saveBtn: Locator;
  readonly nameInput: Locator;
  readonly eNameInput: Locator;
  readonly addressInput: Locator;
  readonly openingDate: Locator;
  readonly decimalsInput: Locator;
  readonly taxNumberInput: Locator;
  readonly notTaxableCheck: Locator;

  constructor(page: Page) {
    super(page, '/accounting/system/company-info');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.saveBtn = page.locator('.card-body .btn-primary');
    // Basic-info section is the first .row.g-3, so name/eName/address are the
    // first three text inputs in DOM order.
    this.nameInput = page.locator('.card-body input[type="text"]').nth(0);
    this.eNameInput = page.locator('.card-body input[type="text"]').nth(1);
    this.addressInput = page.locator('.card-body input[type="text"]').nth(2);
    this.openingDate = page.locator('.card-body input[type="date"]').first();
    this.decimalsInput = page.locator('.card-body input[type="number"]').first();
    // The tax number is the last dir="ltr" text input (after eName/tel/fax).
    this.taxNumberInput = page.locator('.card-body input[type="text"][dir="ltr"]').last();
    this.notTaxableCheck = page.locator('#notTaxable');
  }

  /**
   * Navigate to the page. Because the route is Comf.View-guarded, an account
   * without the permission is redirected to /auth/login. Returns true when the
   * feature page rendered, false when the guard bounced us to login.
   */
  async open(): Promise<boolean> {
    await goto(this.page, this.path);
    if (/\/auth\/login/.test(this.page.url())) return false;
    await expect(this.card).toBeVisible({ timeout: ENV.navTimeout });
    await waitForSpinnersGone(this.page);
    return true;
  }

  /** True when the Comf.Edit-gated Save button is present. */
  async canSave(): Promise<boolean> {
    return (await this.saveBtn.count()) > 0;
  }
}
