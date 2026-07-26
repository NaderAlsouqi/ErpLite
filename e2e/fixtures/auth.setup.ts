import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import { ENV, STORAGE_STATE, AUTH_DIR, requireCreds } from '../support/env';
import { LoginPage } from '../pages/login.page';

/**
 * One-time authentication. Logs in through the real UI, then persists the
 * browser storage (JWT + user) so the `authed` project reuses it for every
 * test — no repeated logins.
 */
setup('authenticate', async ({ page }) => {
  requireCreds();
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Force UI language before the app boots for deterministic assertions.
  await page.addInitScript((lang) => {
    try {
      localStorage.setItem('language', lang);
    } catch {
      /* ignore */
    }
  }, ENV.lang);

  const login = new LoginPage(page);
  await login.goto();
  await login.login(ENV.username, ENV.password, /* rememberMe */ true);

  // A successful login lands on /home2 and stores a JWT.
  await expect(page, 'login should redirect to /home2').toHaveURL(/\/home2/, {
    timeout: ENV.navTimeout,
  });

  const token = await page.evaluate(
    () => localStorage.getItem('token') ?? sessionStorage.getItem('token')
  );
  expect(token, 'a JWT token should be stored after login').toBeTruthy();

  await page.context().storageState({ path: STORAGE_STATE });
});
