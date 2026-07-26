import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';
import { goto, waitForSpinnersGone } from '../../support/helpers';

/**
 * Page object for Billing System Linkage / ربط نظام الفوترة
 * (/accounting/system/fotara-settings). Route guarded by Comf.View; the Save
 * button is gated by *hasPermission="Comf.Edit". A single form with company/tax
 * identifiers and API credentials (client id + secret with a show/hide toggle).
 * Derived from fotara-settings.component.html.
 */
export class FotaraSettingsPage extends BasePage {
  readonly card: Locator;
  readonly saveBtn: Locator;
  readonly companyNameInput: Locator;
  readonly taxNumberInput: Locator;
  readonly clientIdInput: Locator;
  readonly secretInput: Locator;
  readonly secretToggle: Locator;

  constructor(page: Page) {
    super(page, '/accounting/system/fotara-settings');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.saveBtn = page.locator('.card-body .btn-primary');
    // Section 1 text inputs: company_name, tax_number, global_tax, income_seq,
    // zip, city — company name is first, tax number second.
    this.companyNameInput = page.locator('.card-body input[type="text"]').nth(0);
    this.taxNumberInput = page.locator('.card-body input[type="text"]').nth(1);
    // Section 2 credentials: Client_Id (text) then Secret_Key (password/text).
    this.clientIdInput = page.locator('.card-body input[autocomplete="off"]');
    this.secretInput = page.locator('.input-group input');
    this.secretToggle = page.locator('.input-group .btn-outline-secondary');
  }

  /** Navigate; returns false when the Comf.View guard redirects to login. */
  async open(): Promise<boolean> {
    await goto(this.page, this.path);
    if (/\/auth\/login/.test(this.page.url())) return false;
    await expect(this.card).toBeVisible({ timeout: ENV.navTimeout });
    await waitForSpinnersGone(this.page);
    return true;
  }

  async canSave(): Promise<boolean> {
    return (await this.saveBtn.count()) > 0;
  }

  /** True when every required credential/identifier field already has a value. */
  async isConfigured(): Promise<boolean> {
    const vals = await Promise.all([
      this.companyNameInput.inputValue(),
      this.taxNumberInput.inputValue(),
      this.clientIdInput.inputValue(),
      this.secretInput.inputValue(),
    ]);
    return vals.every((v) => v.trim().length > 0);
  }
}
