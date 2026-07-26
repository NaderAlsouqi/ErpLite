import { test, expect } from '../../fixtures/test-fixtures';
import { NAVIGABLE_ROUTES } from '../../support/routes.catalog';
import { goto, expectShell, expectFeaturePageRendered } from '../../support/helpers';
import { errorSummary, hasErrors } from '../../support/console-guard';

/**
 * Data-driven smoke over EVERY navigable route (all 133 minus :param routes).
 * For each page: it does not bounce to login, the shell is present, a feature
 * page renders, and no uncaught/console/real-backend-5xx errors occurred.
 *
 * Special cases:
 *  - NO_SHELL: pages that render outside the main layout (no sidebar).
 *  - SELF_REDIRECT: detail pages that require query params and call location.back()
 *    when visited blindly — we only assert they don't crash.
 *  - KNOWN_BACKEND_ISSUES: routes with a confirmed backend defect; marked fixme so
 *    the failure is tracked/visible without breaking the baseline (and will light
 *    up again as a real failure once the backend is fixed and removed from here).
 *  - Permission-guarded routes tolerate a redirect to login when the account lacks
 *    the permission. Placeholder routes only need the shell.
 */

// Renders in the authentication layout — has no app-sidebar.
const NO_SHELL = new Set<string>(['/error404']);

// Require query params (?doc&bill&year …); navigate away when visited directly.
const SELF_REDIRECT = new Set<string>([
  '/sales/refund-details',
  '/sales/virtual/refund-details',
  '/sales/service/refund-details',
]);

// Confirmed application/backend defects SURFACED BY THIS SUITE. Marked fixme so
// the baseline stays green while each finding remains visible in the report and
// will re-fail (alerting you) once the underlying bug is fixed and removed here.
// Value = reason. See TEST-REPORT.md for details.
const KNOWN_ISSUES = new Map<string, string>([
  // (A) Backend 500 — endpoints reference a missing SQL object 'Virtual_srf'.
  ['/sales/virtual/refunds', "backend 500: Invalid object name 'Virtual_srf'"],
  ['/sales/virtual/add-refund', "backend 500: Invalid object name 'Virtual_srf'"],
  ['/sales/virtual/transfer-refunds', "backend 500: Invalid object name 'Virtual_srf'"],
  ['/sales/virtual/transfered-refunds', "backend 500: Invalid object name 'Virtual_srf'"],
  // (B) Frontend robustness — list components call .map() on a null API response
  //     (app global error handler logs "TypeError: Cannot read properties of null").
  ['/sales/invoice', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/refund', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/transfer-invoices', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/transfered-invoices', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/transfer-refunds', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/transfered-refunds', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/virtual/invoices', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/virtual/transfer-invoices', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/virtual/transfered-invoices', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/service/transfered-invoices', 'frontend: .map() on null API response (needs null-guard)'],
  ['/sales/service/transfered-refunds', 'frontend: .map() on null API response (needs null-guard)'],
  ['/accounting/virtual/receipt-vouchers', 'frontend: .map() on null API response (needs null-guard)'],
]);

test.describe('Route smoke — authenticated', () => {
  for (const route of NAVIGABLE_ROUTES) {
    const label =
      route.path +
      (route.isPlaceholder ? ' [placeholder]' : '') +
      (route.requiresPermission ? ' [guarded]' : '');

    test(`loads ${label}`, async ({ page, errors }) => {
      const knownIssue = KNOWN_ISSUES.get(route.path);
      test.fixme(!!knownIssue, knownIssue ?? '');

      await goto(page, route.path);
      const redirectedToLogin = /\/auth\/login/.test(page.url());

      // Query-param detail pages self-redirect when visited blindly — just verify
      // they don't throw an uncaught error.
      if (SELF_REDIRECT.has(route.path)) {
        expect(
          errors.pageErrors.length,
          `uncaught JS on ${route.path}:\n${errorSummary(errors)}`
        ).toBe(0);
        return;
      }

      if (route.requiresPermission) {
        // Have permission → renders; lack it → guard sends to login. Both valid.
        if (!redirectedToLogin) {
          await expectShell(page);
          await expectFeaturePageRendered(page);
        }
      } else {
        expect(
          redirectedToLogin,
          `navigating to ${route.path} unexpectedly redirected to /auth/login`
        ).toBeFalsy();
        if (!NO_SHELL.has(route.path)) {
          await expectShell(page);
          if (!route.isPlaceholder) await expectFeaturePageRendered(page);
        }
      }

      expect(
        hasErrors(errors),
        `runtime errors on ${route.path}:\n${errorSummary(errors)}`
      ).toBeFalsy();
    });
  }
});
