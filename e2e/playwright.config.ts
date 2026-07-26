import { defineConfig, devices } from '@playwright/test';
import { ENV, STORAGE_STATE } from './support/env';

/**
 * Specs that must run WITHOUT a stored session (login page, auth-guard redirects).
 * They live under tests/auth/** or are named *.guest.spec.ts.
 */
const GUEST = /(?:[\\/](?:auth|guest)[\\/].*|\.guest)\.spec\.ts$/;
const SETUP = /.*\.setup\.ts$/;

const isLocalServer = /localhost|127\.0\.0\.1/.test(ENV.baseURL);

export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  timeout: 90_000,
  expect: { timeout: ENV.slowExpect },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: ENV.baseURL,
    // The local backend uses a self-signed TLS cert (https://localhost:7089).
    ignoreHTTPSErrors: true,
    actionTimeout: ENV.actionTimeout,
    navigationTimeout: ENV.navTimeout,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: ENV.lang === 'ar' ? 'ar-JO' : 'en-US',
  },

  projects: [
    // 1) One-time login → saved storage state reused by the authed project.
    { name: 'setup', testMatch: SETUP },

    // 2) Unauthenticated specs (login form, guard redirects).
    {
      name: 'guest',
      testMatch: GUEST,
      use: { ...devices['Desktop Chrome'] },
    },

    // 3) Everything else runs authenticated, reusing the saved session.
    {
      name: 'authed',
      testIgnore: [GUEST, SETUP],
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
  ],

  // Auto-start `ng serve` for local runs; reuse it if already up. Skipped when
  // BASE_URL points at a remote environment or E2E_START_WEBSERVER=false.
  webServer:
    ENV.startWebServer && isLocalServer
      ? {
          command: 'npm start',
          cwd: '..',
          url: ENV.baseURL,
          reuseExistingServer: true,
          timeout: 240_000,
          stdout: 'ignore',
          stderr: 'pipe',
        }
      : undefined,
});
