import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for Appearance / المظهر (/accounting/settings/appearance).
 * Two cards of "theme-card" tiles: App Theme (classic | editorial) and
 * Color Mode (light | dark). Selecting a tile calls AppStateService, which
 * writes `data-app-theme` and `data-theme-mode` onto <html>. Derived from
 * appearance.component.html + app-state.service.ts.
 */
export class AppearancePage extends BasePage {
  readonly cards: Locator;
  readonly themeCards: Locator;
  readonly appThemeCards: Locator;
  readonly colorModeCards: Locator;
  readonly classicCard: Locator;
  readonly editorialCard: Locator;
  readonly lightCard: Locator;
  readonly darkCard: Locator;

  constructor(page: Page) {
    super(page, '/accounting/settings/appearance');
    this.cards = page.locator('.card.custom-card:not(.attachments-panel)');
    this.themeCards = page.locator('.theme-card');
    // First card = App Theme (2 tiles); second card = Color Mode (2 tiles).
    this.appThemeCards = this.cards.nth(0).locator('.theme-card');
    this.colorModeCards = this.cards.nth(1).locator('.theme-card');
    this.classicCard = this.appThemeCards.nth(0);
    this.editorialCard = this.appThemeCards.nth(1);
    this.lightCard = this.colorModeCards.nth(0);
    this.darkCard = this.colorModeCards.nth(1);
  }

  /** Read a <html> data attribute the appearance service manages. */
  async htmlAttr(name: string): Promise<string | null> {
    return this.page.evaluate((n) => document.documentElement.getAttribute(n), name);
  }
}
