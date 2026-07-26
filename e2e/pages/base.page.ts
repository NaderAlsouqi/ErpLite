import { Page, Locator, expect } from '@playwright/test';
import { ENV } from '../support/env';
import { goto, expectFeaturePageRendered, waitForSpinnersGone } from '../support/helpers';

/**
 * Base class for feature page objects. Subclasses pass their route path and get
 * navigation, a page-header accessor, and toast assertions for free.
 */
export abstract class BasePage {
  constructor(
    protected readonly page: Page,
    readonly path: string
  ) {}

  /** Navigate to this page and wait for it to render. */
  async goto(): Promise<void> {
    await goto(this.page, this.path);
    await expectFeaturePageRendered(this.page);
    await waitForSpinnersGone(this.page);
  }

  headerTitle(): Locator {
    return this.page.locator('.skyline-page-header__title');
  }

  toast(kind?: 'success' | 'error' | 'warning' | 'info'): Locator {
    return this.page.locator(kind ? `.toast-${kind}` : '.ngx-toastr, [class*="toast-"]');
  }

  async expectToast(kind: 'success' | 'error' | 'warning' | 'info' = 'success'): Promise<void> {
    await expect(this.toast(kind).first()).toBeVisible({ timeout: ENV.slowExpect });
  }
}
