import { Page, Locator, expect } from '@playwright/test';
import { ENV } from '../support/env';

/** Page object for /auth/login. */
export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly rememberMe: Locator;
  readonly submit: Locator;
  readonly togglePassword: Locator;
  readonly forgotLink: Locator;
  readonly langToggle: Locator;
  readonly fieldErrors: Locator;
  readonly forgotModal: Locator;
  readonly root: Locator;

  constructor(private readonly page: Page) {
    this.username = page.locator('#Login_Name');
    this.password = page.locator('#password');
    this.rememberMe = page.locator('#remember');
    this.submit = page.locator('button.submit-btn');
    this.togglePassword = page.locator('.toggle-pw');
    this.forgotLink = page.locator('.forgot-link');
    this.langToggle = page.locator('.lang-toggle-btn');
    this.fieldErrors = page.locator('.field-error');
    this.forgotModal = page.locator('.fp-modal');
    this.root = page.locator('.login-page');
  }

  async goto(): Promise<void> {
    await this.page.goto(ENV.baseURL + '/auth/login', { waitUntil: 'domcontentloaded' });
    await expect(this.username).toBeVisible({ timeout: ENV.navTimeout });
  }

  async fill(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
  }

  async setRememberMe(on: boolean): Promise<void> {
    if ((await this.rememberMe.isChecked()) !== on) {
      // The checkbox is inside a <label>; click the label span reliably toggles it.
      await this.rememberMe.click();
    }
  }

  /** Fill credentials, set remember-me, and submit. */
  async login(username: string, password: string, rememberMe = true): Promise<void> {
    await this.fill(username, password);
    await this.setRememberMe(rememberMe);
    await expect(this.submit).toBeEnabled();
    await this.submit.click();
  }
}
