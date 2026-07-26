import { Page, Locator, expect } from '@playwright/test';
import { ENV } from './env';

/** Build an absolute URL for an in-app path. */
export function urlFor(appPath: string): string {
  if (appPath.startsWith('http')) return appPath;
  return ENV.baseURL + (appPath.startsWith('/') ? appPath : '/' + appPath);
}

/**
 * Navigate to an in-app path and wait for the SPA to settle. `networkidle` is
 * best-effort because some pages hold long-poll / SignalR connections open.
 */
export async function goto(page: Page, appPath: string): Promise<void> {
  await page.goto(urlFor(appPath), { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {
    /* long-poll pages never reach networkidle — ignore */
  });
}

/** The authenticated shell (sidebar) is visible. */
export async function expectShell(page: Page): Promise<void> {
  await expect(page.locator('app-sidebar')).toBeVisible({ timeout: ENV.navTimeout });
}

/** The page-header title element, present on nearly every feature page. */
export function pageHeaderTitle(page: Page): Locator {
  return page.locator('.skyline-page-header__title');
}

/**
 * Assert a feature page has actually rendered content — page header, a card, or
 * a table. Resilient to translation/locale since it checks structure, not text.
 */
export async function expectFeaturePageRendered(page: Page): Promise<void> {
  const candidates = page.locator(
    '.skyline-page-header, app-page-header, .custom-card, .card, table, .under-construction, .warehouse-placeholder'
  );
  await expect(candidates.first()).toBeVisible({ timeout: ENV.navTimeout });
}

/** Pick an option from an @ng-select control by visible text. */
export async function selectNgOption(
  page: Page,
  ngSelect: Locator,
  text: string | RegExp
): Promise<void> {
  await ngSelect.click();
  const panel = page.locator('.ng-dropdown-panel');
  await expect(panel).toBeVisible();
  const search = ngSelect.locator('input[type=text]');
  if ((await search.count()) && typeof text === 'string') {
    await search.fill(text);
  }
  await panel.locator('.ng-option', { hasText: text }).first().click();
  await expect(panel).toBeHidden();
}

/** Fill a native <input type="date"> (expects an ISO yyyy-mm-dd value). */
export async function fillDate(input: Locator, iso: string): Promise<void> {
  await input.fill(iso);
  await input.blur();
}

/** All data rows of the first (or scoped) table body. */
export function tableRows(page: Page, scope?: Locator): Locator {
  return (scope ?? page).locator('table tbody tr');
}

/**
 * Run an action and wait for a matching API response (matched by url substring).
 * Returns the response for status/body assertions.
 */
export async function waitForApi(page: Page, urlPart: string, action: () => Promise<void>) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(urlPart), { timeout: ENV.navTimeout }),
    action(),
  ]);
  return res;
}

/**
 * A locale-agnostic button locator: matches an accessible button whose name
 * contains ANY of the given fragments (pass both the AR and EN labels).
 */
export function buttonByNames(page: Page, names: (string | RegExp)[]): Locator {
  const src = names.map((n) => (n instanceof RegExp ? n.source : escapeRe(n))).join('|');
  return page.getByRole('button', { name: new RegExp(src, 'i') });
}

/** A ngx-toastr toast of a given kind. */
export function toast(page: Page, kind?: 'success' | 'error' | 'warning' | 'info'): Locator {
  return page.locator(kind ? `.toast-${kind}` : '.ngx-toastr, [class*="toast-"]');
}

/** Wait for any loading spinner on the page to disappear. */
export async function waitForSpinnersGone(page: Page): Promise<void> {
  const spinner = page.locator('.spinner-border:visible');
  await spinner
    .first()
    .waitFor({ state: 'hidden', timeout: ENV.navTimeout })
    .catch(() => {
      /* no spinner present */
    });
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
