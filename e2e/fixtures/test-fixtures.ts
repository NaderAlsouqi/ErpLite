import { test as base, expect } from '@playwright/test';
import { ENV } from '../support/env';
import { attachErrorCollector, CollectedErrors } from '../support/console-guard';
import { LoginPage } from '../pages/login.page';
import { ShellPage } from '../pages/shell.page';
import { ApiClient } from '../support/api-client';

type Fixtures = {
  /** Live buffer of runtime errors collected from the page. */
  errors: CollectedErrors;
  loginPage: LoginPage;
  shellPage: ShellPage;
  /** Authenticated backend client for setup/teardown/assertions. */
  api: ApiClient;
};

export const test = base.extend<Fixtures>({
  // Force the chosen UI language before app boot so text assertions are stable,
  // and start each page in the correct RTL/LTR direction.
  page: async ({ page }, use) => {
    await page.addInitScript((lang) => {
      try {
        localStorage.setItem('language', lang);
        // documentElement can be null when this runs at document_start.
        const el = document.documentElement;
        if (el) {
          el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
          el.setAttribute('lang', lang);
        }
      } catch {
        /* storage/DOM may be unavailable pre-navigation */
      }
    }, ENV.lang);
    await use(page);
  },

  errors: async ({ page }, use) => {
    const collected = attachErrorCollector(page);
    await use(collected);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  shellPage: async ({ page }, use) => {
    await use(new ShellPage(page));
  },

  api: async ({ playwright }, use) => {
    const client = await ApiClient.create(playwright.request);
    await use(client);
    await client.dispose();
  },
});

export { expect };

/** Skip the current test/suite unless writes are explicitly allowed. */
export function requireWrites(): void {
  test.skip(!ENV.allowWrites, 'Write flows disabled (set ALLOW_WRITES=true to enable).');
}

/** Skip the current test/suite unless credentials are configured. */
export function requireCredentials(): void {
  test.skip(!ENV.username || !ENV.password, 'Requires TEST_USERNAME / TEST_PASSWORD.');
}
