import { Page, Locator, expect } from '@playwright/test';
import { ENV } from '../support/env';

/** Page object for the authenticated app shell (header + sidebar). */
export class ShellPage {
  readonly sidebar: Locator;
  readonly header: Locator;
  readonly content: Locator;
  readonly profileToggle: Locator;
  readonly logoutItem: Locator;

  constructor(private readonly page: Page) {
    this.sidebar = page.locator('app-sidebar');
    this.header = page.locator('app-header');
    this.content = page.locator('.main-content');
    this.profileToggle = page.locator('#mainHeaderProfile');
    this.logoutItem = page.locator('a.dropdown-item', { hasText: /log ?out|الخروج/i });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.sidebar).toBeVisible({ timeout: ENV.navTimeout });
    await expect(this.header).toBeVisible();
  }

  /** Open the profile menu and log out; asserts return to the login page. */
  async logout(): Promise<void> {
    await this.profileToggle.click();
    await expect(this.logoutItem).toBeVisible();
    await this.logoutItem.click();
    await expect(this.page).toHaveURL(/\/auth\/login/, { timeout: ENV.navTimeout });
  }
}
