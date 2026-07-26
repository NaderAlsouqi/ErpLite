import { test, expect } from '../../fixtures/test-fixtures';
import { ENV } from '../../support/env';

/**
 * Deep functional coverage of the login page. Runs UNAUTHENTICATED (guest
 * project). Credential-dependent scenarios are skipped automatically when
 * TEST_USERNAME / TEST_PASSWORD are not set.
 */
test.describe('Authentication — login page', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('renders the login form', async ({ loginPage }) => {
    await expect(loginPage.username).toBeVisible();
    await expect(loginPage.password).toBeVisible();
    await expect(loginPage.submit).toBeVisible();
  });

  test('submit is disabled until both fields are filled', async ({ loginPage }) => {
    await expect(loginPage.submit).toBeDisabled();
    await loginPage.username.fill('someone');
    await expect(loginPage.submit).toBeDisabled();
    await loginPage.password.fill('secret');
    await expect(loginPage.submit).toBeEnabled();
  });

  test('shows required-field error when a field is touched then left empty', async ({
    loginPage,
  }) => {
    await loginPage.username.click();
    await loginPage.password.click();
    await loginPage.password.blur();
    await expect(loginPage.fieldErrors.first()).toBeVisible();
  });

  test('toggles password visibility', async ({ loginPage }) => {
    await loginPage.password.fill('secret');
    await expect(loginPage.password).toHaveAttribute('type', 'password');
    // The toggle is an icon-only button whose width comes from its glyph. The
    // template uses `bi-eye-off-line`, which is not a real Bootstrap Icons class
    // (BI uses `bi-eye-slash`), so the glyph never renders and the button has ~0
    // width — not "visible" to Playwright. The click handler still works, so we
    // force the click to exercise the actual toggle behavior. (App icon-class bug.)
    await expect(loginPage.togglePassword).toBeAttached();
    // dispatchEvent fires the (click) handler directly — a normal/force click
    // can't target a 0×0, off-viewport element.
    await loginPage.togglePassword.dispatchEvent('click');
    await expect(loginPage.password).toHaveAttribute('type', 'text');
    await loginPage.togglePassword.dispatchEvent('click');
    await expect(loginPage.password).toHaveAttribute('type', 'password');
  });

  test('rejects invalid credentials and stores no token', async ({ loginPage, page }) => {
    await loginPage.login('e2e_invalid_user', 'wrong_password_' + Date.now(), true);
    // Stays on the login page — never navigates into the app.
    await expect(page).toHaveURL(/\/auth\/login/);
    const token = await page.evaluate(
      () => localStorage.getItem('token') ?? sessionStorage.getItem('token')
    );
    expect(token).toBeFalsy();
  });

  test.describe('forgot-password modal', () => {
    test('opens, validates email, and closes', async ({ loginPage, page }) => {
      await loginPage.forgotLink.click();
      await expect(loginPage.forgotModal).toBeVisible();

      const send = loginPage.forgotModal.locator('.fp-btn--send');
      const email = loginPage.forgotModal.locator('input[type=email]');

      await expect(send).toBeDisabled();
      await email.fill('not-an-email');
      await email.blur();
      await expect(loginPage.forgotModal.locator('.field-error')).toBeVisible();

      await email.fill('valid@example.com');
      await expect(send).toBeEnabled();

      await page.locator('.fp-btn--cancel').click();
      await expect(loginPage.forgotModal).toBeHidden();
    });
  });

  test('language toggle switches text direction', async ({ loginPage }) => {
    const before = await loginPage.root.getAttribute('dir');
    await loginPage.langToggle.click();
    await expect(loginPage.root).not.toHaveAttribute('dir', before ?? '');
  });

  test.describe('with valid credentials', () => {
    test.skip(!ENV.username || !ENV.password, 'Requires TEST_USERNAME / TEST_PASSWORD.');

    test('logs in and lands on /home2 (remember-me → localStorage token)', async ({
      loginPage,
      page,
    }) => {
      await loginPage.login(ENV.username, ENV.password, true);
      await expect(page).toHaveURL(/\/home2/, { timeout: ENV.navTimeout });
      const local = await page.evaluate(() => localStorage.getItem('token'));
      expect(local, 'remember-me should persist the token in localStorage').toBeTruthy();
    });

    test('without remember-me stores the token in sessionStorage only', async ({
      loginPage,
      page,
    }) => {
      await loginPage.login(ENV.username, ENV.password, false);
      await expect(page).toHaveURL(/\/home2/, { timeout: ENV.navTimeout });
      const tokens = await page.evaluate(() => ({
        local: localStorage.getItem('token'),
        session: sessionStorage.getItem('token'),
      }));
      expect(tokens.session).toBeTruthy();
      expect(tokens.local).toBeFalsy();
    });

    test('logout clears the session and returns to login', async ({
      loginPage,
      shellPage,
      page,
    }) => {
      await loginPage.login(ENV.username, ENV.password, true);
      await expect(page).toHaveURL(/\/home2/, { timeout: ENV.navTimeout });
      await shellPage.logout();
      const token = await page.evaluate(
        () => localStorage.getItem('token') ?? sessionStorage.getItem('token')
      );
      expect(token).toBeFalsy();
    });
  });
});
